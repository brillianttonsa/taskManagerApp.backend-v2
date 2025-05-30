import supabase from "../supabase/client.js"
import { generateInvitationCode, getCurrentWeekStart } from "../utils/helpers.js"

export const getFamilyInfo = async (req, res) => {
  const { data, error } = await supabase
    .from("families")
    .select("*")
    .eq("id", `(SELECT family_id FROM family_members WHERE user_id = ${req.user.id})`)
    .single()

  if (error || !data) {
    return res.status(404).json({ error: "You are not part of any family" })
  }

  res.json(data)
}

export const createFamily = async (req, res) => {
  const { name } = req.body

  const { data: existing, error: existingError } = await supabase
    .from("family_members")
    .select("id")
    .eq("user_id", req.user.id)
    .maybeSingle()

  if (existing) return res.status(400).json({ error: "You are already a member of a family" })

  const invitation_code = generateInvitationCode()

  const { data: family, error } = await supabase
    .from("families")
    .insert([{ name, created_by: req.user.id, invitation_code }])
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })

  await supabase.from("family_members").insert([{ family_id: family.id, user_id: req.user.id }])

  res.status(201).json({
    message: "Family created successfully",
    family_id: family.id,
    name: family.name,
    invitation_code,
  })
}

export const joinFamily = async (req, res) => {
  const { invitationCode } = req.body

  if (!invitationCode?.trim()) {
    return res.status(400).json({ error: "Invitation code is required" })
  }

  const { data: family, error } = await supabase
    .from("families")
    .select("*")
    .eq("invitation_code", invitationCode.trim().toUpperCase())
    .single()

  if (!family) return res.status(400).json({ error: "Invalid invitation code" })

  const { data: existing } = await supabase
    .from("family_members")
    .select("id")
    .eq("user_id", req.user.id)
    .maybeSingle()

  if (existing) return res.status(400).json({ error: "You are already a member of a family" })

  await supabase.from("family_members").insert([{ family_id: family.id, user_id: req.user.id }])

  res.json({ message: "Successfully joined family", family_id: family.id, name: family.name })
}

export const getFamilyMembers = async (req, res) => {
  const { data, error } = await supabase.rpc("get_family_members", { user_id: req.user.id })

  if (error) return res.status(400).json({ error: error.message })

  res.json(data)
}

export const getFamilyTasks = async (req, res) => {
  const { data, error } = await supabase.rpc("get_family_tasks", { user_id: req.user.id })

  if (error) return res.status(400).json({ error: error.message })

  res.json(data)
}

export const createFamilyTask = async (req, res) => {
  const { title, description, priority, assigned_to } = req.body

  if (!title || !assigned_to)
    return res.status(400).json({ error: "Title and assigned user are required" })

  const { data: family } = await supabase
    .from("families")
    .select("*")
    .eq("id", `(SELECT family_id FROM family_members WHERE user_id = ${req.user.id})`)
    .single()

  if (!family || family.created_by !== req.user.id)
    return res.status(403).json({ error: "Only the family leader can create tasks" })

  const week_start = getCurrentWeekStart().toISOString().split("T")[0]

  const { data: task, error } = await supabase
    .from("family_tasks")
    .insert([{ family_id: family.id, created_by: req.user.id, title, description, priority, assigned_to, week_start }])
    .select()
    .single()

  res.status(201).json(task)
}

export const updateFamilyTask = async (req, res) => {
  const { taskId } = req.params
  const { title, description, priority, status, assigned_to } = req.body

  const completed_at = status === "completed" ? new Date() : null

  const { data: task, error } = await supabase
    .from("family_tasks")
    .update({
      title,
      description,
      priority,
      status,
      assigned_to,
      completed_at,
      updated_at: new Date(),
    })
    .eq("id", taskId)
    .select()
    .single()

  if (error || !task) return res.status(404).json({ error: "Task not found or update failed" })

  res.json(task)
}

export const deleteFamilyTask = async (req, res) => {
  const { taskId } = req.params

  const { data, error } = await supabase
    .from("family_tasks")
    .delete()
    .eq("id", taskId)
    .eq("created_by", req.user.id)

  if (error || data.length === 0) {
    return res.status(404).json({ error: "Task not found or permission denied" })
  }

  res.json({ message: "Task deleted successfully" })
}
