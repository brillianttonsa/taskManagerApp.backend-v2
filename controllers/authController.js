import bcrypt from "bcrypt"
import crypto from "crypto"
import supabase from "../supabase/client.js"
import { generateToken } from "../middleware/auth.js"
import { sendEmail, emailTemplates } from "../config/email.js"

export const register = async (req, res) => {
  const { username, email, password } = req.body

  // Check if user exists
  const { data: existingUsers, error: userCheckError } = await supabase
    .from("users")
    .select("id")
    .or(`email.eq.${email},username.eq.${username}`)

  if (userCheckError)
    return res.status(400).json({ error: userCheckError.message })

  if (existingUsers.length > 0) {
    return res.status(400).json({ error: "User already exists with this email or username" })
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Create user
  const { data: newUserData, error: insertError } = await supabase
    .from("users")
    .insert([{ username, email, password_hash: hashedPassword }])
    .select("id, username, email, created_at")
    .single()

  if (insertError) return res.status(500).json({ error: insertError.message })

  const token = generateToken(newUserData)

  // Send welcome email
  await sendEmail(newUserData.email, "Welcome to TaskFlow!", emailTemplates.welcomeEmail(newUserData.username))

  console.log("✅ User registered:", newUserData)

  res.status(201).json({
    message: "User created successfully",
    user: {
      id: newUserData.id,
      username: newUserData.username,
      email: newUserData.email,
    },
    token,
  })
}

export const login = async (req, res) => {
  const { email, password } = req.body

  const { data: users, error: fetchError } = await supabase
    .from("users")
    .select("id, username, email, password_hash")
    .eq("email", email)
    .single()

  if (fetchError || !users)
    return res.status(401).json({ error: "Invalid email or password" })

  const isValid = await bcrypt.compare(password, users.password_hash)

  if (!isValid)
    return res.status(401).json({ error: "Invalid email or password" })

  const token = generateToken(users)

  console.log("✅ User logged in:", {
    id: users.id,
    username: users.username,
    email: users.email,
  })

  res.json({
    message: "Login successful",
    user: {
      id: users.id,
      username: users.username,
      email: users.email,
    },
    token,
  })
}

export const forgotPassword = async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: "Email is required" })
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id, username, email")
    .eq("email", email)
    .single()

  if (error || !user) {
    return res.json({ message: "If an account with that email exists, a password reset link has been sent." })
  }

  const resetToken = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 3600000).toISOString()

  const { error: upsertError } = await supabase
    .from("password_reset_tokens")
    .upsert({
      user_id: user.id,
      token: resetToken,
      expires_at: expiresAt,
    }, { onConflict: ["user_id"] })

  const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`

  await sendEmail(
    user.email,
    "Password Reset Request - TaskFlow",
    emailTemplates.passwordReset(user.username, resetUrl)
  )

  console.log("🔑 Password reset requested for:", user.email)
  console.log("🔗 Reset URL:", resetUrl)

  res.json({ message: "If an account with that email exists, a password reset link has been sent." })
}
