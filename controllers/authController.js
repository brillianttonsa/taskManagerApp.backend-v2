import bcrypt from "bcrypt"
import crypto from "crypto"
import { query } from "../config/database.js"
// import { query } from "../config/neon.js"
import { generateToken } from "../middleware/auth.js"
import { sendEmail, emailTemplates } from "../config/email.js"

export const register = async (req, res) => {
  const { username, email, password } = req.body

  try {
    const userCheck = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    )

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: "User already exists with this email or username" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const insertUser = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, hashedPassword]
    )

    const newUserData = insertUser.rows[0]

    const token = generateToken(newUserData)

    await sendEmail(
      newUserData.email,
      "Welcome to TaskFlow!",
      emailTemplates.welcomeEmail(newUserData.username)
    )

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
  } catch (err) {
    console.error("❌ Registration error:", err)
    res.status(500).json({ error: "Server error" })
  }
}

export const login = async (req, res) => {
  const { email, password } = req.body

  try {
    const result = await query(
      'SELECT id, username, email, password_hash FROM users WHERE email = $1',
      [email]
    )

    const user = result.rows[0]

    if (!user) return res.status(401).json({ error: "Invalid email or password" })

    const isValid = await bcrypt.compare(password, user.password_hash)

    if (!isValid) return res.status(401).json({ error: "Invalid email or password" })

    const token = generateToken(user)

    console.log("✅ User logged in:", {
      id: user.id,
      username: user.username,
      email: user.email,
    })

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    })
  } catch (err) {
    console.error("❌ Login error:", err)
    res.status(500).json({ error: "Server error" })
  }
}


export const forgotPassword = async (req, res) => {
  const { email } = req.body

  if (!email) return res.status(400).json({ error: "Email is required" })

  try {
    const result = await query(
      'SELECT id, username, email FROM users WHERE email = $1',
      [email]
    )

    const user = result.rows[0]

    if (!user) {
      return res.json({ message: "If an account with that email exists, a password reset link has been sent." })
    }

    const resetToken = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 3600000).toISOString()

    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
       SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at`,
      [user.id, resetToken, expiresAt]
    )

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`

    await sendEmail(
      user.email,
      "Password Reset Request - TaskFlow",
      emailTemplates.passwordReset(user.username, resetUrl)
    )

    console.log("🔑 Password reset requested for:", user.email)
    console.log("🔗 Reset URL:", resetUrl)

    res.json({ message: "If an account with that email exists, a password reset link has been sent." })
  } catch (err) {
    console.error("❌ Forgot password error:", err)
    res.status(500).json({ error: "Server error" })
  }
}

