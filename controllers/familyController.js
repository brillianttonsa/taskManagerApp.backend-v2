import { query, withTransaction } from "../config/database.js"
// import { query } from "../config/neon.js"
import { generateInvitationCode, getCurrentWeekStart } from "../utils/helpers.js"

export const getFamilyInfo = async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM families
       WHERE id = (
         SELECT family_id FROM family_members WHERE user_id = $1
       )`,
      [req.user.id]
    )

    if (result.rows.length === 0)
      return res.status(404).json({ error: "You are not part of any family" })

    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: "Failed to get family info" })
  }
}


export const createFamily = async (req, res) => {
  const { name } = req.body

  try {
    const existing = await query(
      `SELECT id FROM family_members WHERE user_id = $1`,
      [req.user.id]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "You are already a member of a family" })
    }

    const invitation_code = generateInvitationCode()

    const newFamily = await query(
      `INSERT INTO families (name, created_by, invitation_code)
       VALUES ($1, $2, $3)
       RETURNING id, name, invitation_code`,
      [name, req.user.id, invitation_code]
    )

    const family = newFamily.rows[0]

    await query(
      `INSERT INTO family_members (family_id, user_id) VALUES ($1, $2)`,
      [family.id, req.user.id]
    )

    res.status(201).json({
      message: "Family created successfully",
      family_id: family.id,
      name: family.name,
      invitation_code,
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to create family" })
  }
}

export const joinFamily = async (req, res) => {
  const { invitationCode } = req.body

  if (!invitationCode?.trim())
    return res.status(400).json({ error: "Invitation code is required" })

  try {
    const familyRes = await query(
      `SELECT * FROM families WHERE invitation_code = $1`,
      [invitationCode.trim().toUpperCase()]
    )

    if (familyRes.rows.length === 0)
      return res.status(400).json({ error: "Invalid invitation code" })

    const existing = await query(
      `SELECT id FROM family_members WHERE user_id = $1`,
      [req.user.id]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "You are already a member of a family" })
    }

    const family = familyRes.rows[0]

    await query(
      `INSERT INTO family_members (family_id, user_id) VALUES ($1, $2)`,
      [family.id, req.user.id]
    )

    res.json({ message: "Successfully joined family", family_id: family.id, name: family.name })
  } catch (err) {
    res.status(500).json({ error: "Failed to join family" })
  }
}


export const getFamilyMembers = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.email
       FROM users u
       JOIN family_members fm ON u.id = fm.user_id
       WHERE fm.family_id = (
         SELECT family_id FROM family_members WHERE user_id = $1
       )`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: "Failed to get family members" })
  }
}


export const getFamilyTasks = async (req, res) => {
  try {
    const result = await query(
      `SELECT ft.*, u.username AS assigned_username
       FROM family_tasks ft
       LEFT JOIN users u ON ft.assigned_to = u.id
       WHERE ft.family_id = (
         SELECT family_id FROM family_members WHERE user_id = $1
       )
       ORDER BY ft.created_at DESC`,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: "Failed to get family tasks" })
  }
}


export const createFamilyTask = async (req, res) => {
  const { title, description, priority, assigned_to } = req.body

  if (!title || !assigned_to)
    return res.status(400).json({ error: "Title and assigned user are required" })

  try {
    const familyRes = await query(
      `SELECT * FROM families
       WHERE id = (
         SELECT family_id FROM family_members WHERE user_id = $1
       )`,
      [req.user.id]
    )

    const family = familyRes.rows[0]

    if (!family || family.created_by !== req.user.id) {
      return res.status(403).json({ error: "Only the family leader can create tasks" })
    }

    const week_start = getCurrentWeekStart().toISOString().split("T")[0]

    const insertRes = await query(
      `INSERT INTO family_tasks (family_id, created_by, title, description, priority, assigned_to, week_start)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [family.id, req.user.id, title, description, priority, assigned_to, week_start]
    )

    res.status(201).json(insertRes.rows[0])
  } catch (err) {
    res.status(500).json({ error: "Failed to create family task" })
  }
}

export const updateFamilyTask = async (req, res) => {
  const { taskId } = req.params
  const { title, description, priority, status, assigned_to } = req.body

  const completed_at = status === "completed" ? new Date() : null

  try {
    const result = await query(
      `UPDATE family_tasks
       SET title = $1, description = $2, priority = $3, status = $4,
           assigned_to = $5, completed_at = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [title, description, priority, status, assigned_to, completed_at, taskId]
    )

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Task not found or update failed" })

    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: "Failed to update task" })
  }
}


export const deleteFamilyTask = async (req, res) => {
  const { taskId } = req.params

  try {
    const result = await query(
      `DELETE FROM family_tasks
       WHERE id = $1 AND created_by = $2
       RETURNING id`,
      [taskId, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found or permission denied" })
    }

    res.json({ message: "Task deleted successfully" })
  } catch (err) {
    res.status(500).json({ error: "Failed to delete task" })
  }
}

