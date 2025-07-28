import express from "express"
import { asyncHandler } from "../middleware/errorHandler.js"
import { register, login, forgotPassword } from "../controllers/authController.js"
import { validateRegistration, validateLogin } from "../middleware/validation.js"

const router = express.Router()

router.post("/register", validateRegistration, asyncHandler(register))
router.post("/login", validateLogin, asyncHandler(login))
router.post("/forgot-password", asyncHandler(forgotPassword))


export default router
