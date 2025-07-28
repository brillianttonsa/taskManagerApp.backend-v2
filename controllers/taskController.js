import { query } from "../config/database.js"
// import { query } from "../config/neon.js"
import { getCurrentWeekStart } from "../utils/helpers.js"

// GET all active personal tasks
export const getTasks = async (req, res) => {
  try {
    const query = `
      SELECT * FROM tasks 
      WHERE user_id = $1 AND archived = false
      ORDER BY status ASC, priority DESC, created_at DESC
    `
    const result = await query(query, [req.user.id])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST create new task
export const createTask = async (req, res) => {
  const { title, description, priority, status } = req.body
  const weekStart = getCurrentWeekStart().toISOString().split("T")[0]
  const completedAt = status === "completed" ? new Date().toISOString() : null

  try {
    const query = `
      INSERT INTO tasks (
        user_id, title, description, priority, status, 
        assigned_to, week_start, completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `
    const values = [
      req.user.id,
      title?.trim() || "",
      description?.trim() || null,
      priority ?? 1,
      status || "pending",
      req.user.id,
      weekStart,
      completedAt,
    ]

    const result = await query(query, values)
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// PUT update task
export const updateTask = async (req, res) => {
  const { id } = req.params
  const { title, description, priority, status } = req.body
  const userId = req.user.id

  try {
    // First, check if the task exists and belongs to user
    const existingResult = await pool.query(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" })
    }

    const completedAt = status === "completed" ? new Date().toISOString() : null
    const updatedAt = new Date().toISOString()

    // Update the task
    const updateResult = await pool.query(
      `UPDATE tasks
       SET title = $1,
           description = $2,
           priority = $3,
           status = $4,
           completed_at = $5,
           updated_at = $6
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [
        title.trim(),
        description?.trim() || null,
        priority,
        status,
        completedAt,
        updatedAt,
        id,
        userId,
      ]
    )

    res.json(updateResult.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// DELETE task
export const deleteTask = async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    const deleteResult = await pool.query(
      `DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    )

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" })
    }

    res.json({ message: "Task deleted successfully" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// POST archive old tasks
export const archiveTasks = async (req, res) => {
  const weekStart = getCurrentWeekStart()
  const lastWeek = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000)
  const lastWeekStr = lastWeek.toISOString().split("T")[0]
  const userId = req.user.id

  try {
    const updatedAt = new Date().toISOString()

    const result = await pool.query(
      `UPDATE tasks
       SET archived = true, archived_at = $1
       WHERE user_id = $2
         AND archived = false
         AND week_start < $3
       RETURNING id`,
      [updatedAt, userId, lastWeekStr]
    )

    res.json({
      message: "Tasks archived successfully",
      archived_count: result.rowCount,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

