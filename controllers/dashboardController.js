import supabase from "../supabase/client.js"

export const getStats = async (req, res) => {
  const userId = req.user.id

  const { data: allTasks, error: error1 } = await supabase
    .from("tasks")
    .select("status, week_start")
    .eq("user_id", userId)
    .eq("archived", false)

  if (error1) return res.status(400).json({ error: error1.message })

  const total = allTasks.length
  const completed = allTasks.filter((t) => t.status === "completed").length
  const pending = allTasks.filter((t) => t.status === "pending").length

  const recentWeeks = {}

  allTasks.forEach((task) => {
    const week = task.week_start
    if (!recentWeeks[week]) {
      recentWeeks[week] = { total: 0, completed: 0, pending: 0 }
    }
    recentWeeks[week].total++
    if (task.status === "completed") recentWeeks[week].completed++
    if (task.status === "pending") recentWeeks[week].pending++
  })

  const weeklyData = Object.entries(recentWeeks)
    .map(([week_start, stats]) => ({
      week_start,
      total_tasks: stats.total,
      completed_tasks: stats.completed,
      pending_tasks: stats.pending,
    }))
    .sort((a, b) => new Date(b.week_start) - new Date(a.week_start))
    .slice(0, 4)

  res.json({
    currentWeek: {
      total_tasks: total,
      completed_tasks: completed,
      pending_tasks: pending,
    },
    weeklyData,
  })
}

export const getAnalytics = async (req, res) => {
  const { timeframe = "month" } = req.query
  const userId = req.user.id

  let intervalDays = 30
  if (timeframe === "week") intervalDays = 7
  if (timeframe === "year") intervalDays = 365

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - intervalDays)

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("created_at, status, priority")
    .eq("user_id", userId)
    .eq("archived", false)
    .gte("created_at", startDate.toISOString())

  if (error) return res.status(400).json({ error: error.message })

  // Task trends by day
  const trendsMap = {}
  const priorityMap = {}

  tasks.forEach((task) => {
    const date = task.created_at.split("T")[0]
    trendsMap[date] = trendsMap[date] || { date, total_tasks: 0, completed_tasks: 0 }
    trendsMap[date].total_tasks++
    if (task.status === "completed") trendsMap[date].completed_tasks++

    priorityMap[task.priority] = priorityMap[task.priority] || {
      priority: task.priority,
      count: 0,
      completed: 0,
    }
    priorityMap[task.priority].count++
    if (task.status === "completed") priorityMap[task.priority].completed++
  })

  const trends = Object.values(trendsMap).sort((a, b) => new Date(b.date) - new Date(a.date))
  const priorityDistribution = Object.values(priorityMap)

  res.json({
    trends,
    priorityDistribution,
    timeframe,
  })
}
