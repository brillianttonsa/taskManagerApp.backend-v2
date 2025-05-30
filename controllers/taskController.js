import supabase from "../supabase/client.js"
import { getCurrentWeekStart } from "../utils/helpers.js"

// GET all active personal tasks
export const getTasks = async (req, res) => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", req.user.id)
    .eq("archived", false)
    .order("status", { ascending: true })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

// POST create new task
export const createTask = async (req, res) => {
  const { title, description, priority, status } = req.body
  const weekStart = getCurrentWeekStart()

  const { data, error } = await supabase
    .from("tasks")
    .insert([
      {
        user_id: req.user.id,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || 1,
        status: status || "pending",
        assigned_to: req.user.id,
        week_start: weekStart.toISOString().split("T")[0],
        completed_at: status === "completed" ? new Date().toISOString() : null,
      },
    ])
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
}

// PUT update task
export const updateTask = async (req, res) => {
  const { id } = req.params
  const { title, description, priority, status } = req.body

  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("user_id", req.user.id)
    .single()

  if (fetchError) return res.status(404).json({ error: "Task not found" })

  const { data, error } = await supabase
    .from("tasks")
    .update({
      title: title.trim(),
      description: description?.trim(),
      priority,
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", req.user.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

// DELETE task
export const deleteTask = async (req, res) => {
  const { id } = req.params

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", req.user.id)
    .select("id")
    .single()

  if (error) return res.status(404).json({ error: "Task not found" })
  res.json({ message: "Task deleted successfully" })
}

// POST archive old tasks
export const archiveTasks = async (req, res) => {
  const weekStart = getCurrentWeekStart()
  const lastWeek = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from("tasks")
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
    })
    .lt("week_start", lastWeek.toISOString().split("T")[0])
    .eq("user_id", req.user.id)
    .eq("archived", false)
    .select("id")

  if (error) return res.status(500).json({ error: error.message })
  res.json({
    message: "Tasks archived successfully",
    archived_count: data.length,
  })
}
