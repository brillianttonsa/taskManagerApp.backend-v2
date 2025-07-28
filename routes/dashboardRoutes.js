import express from "express"
import { authenticateToken } from "../middleware/auth.js"
import { getStats, getAnalytics } from "../controllers/dashboardController.js"

const router = express.Router()

router.use(authenticateToken)

router.get("/stats", getStats)
router.get("/analytics", getAnalytics)


export default router
