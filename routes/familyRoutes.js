import express from "express"
import { authenticateToken } from "../middleware/auth.js"
import {
  getFamilyInfo,
  createFamily,
  joinFamily,
  getFamilyMembers,
  getFamilyTasks,
  createFamilyTask,
  updateFamilyTask,
  deleteFamilyTask,
} from "../controllers/familyController.js"
import { validateTaskId, validateFamily } from "../middleware/validation.js"

const router = express.Router()
router.use(authenticateToken)

router.get("/info", getFamilyInfo)
router.post("/create", validateFamily, createFamily)
router.post("/join", joinFamily)
router.get("/members", getFamilyMembers)
router.get("/tasks", getFamilyTasks)
router.post("/tasks", createFamilyTask)
router.put("/tasks/:taskId", validateTaskId, updateFamilyTask)
router.delete("/tasks/:taskId", validateTaskId, deleteFamilyTask)

export default router
