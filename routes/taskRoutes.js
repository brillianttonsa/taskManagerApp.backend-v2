import express from "express"
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  archiveTasks,
} from "../controllers/taskController.js"
import { authenticateToken } from "../middleware/auth.js"
import { validateTask, validateTaskId } from "../middleware/validation.js"
import { asyncHandler } from "../middleware/errorHandler.js"


const router = express.Router()

router.use(authenticateToken)

router.get("/", asyncHandler(getTasks))
router.post("/", validateTask, asyncHandler(createTask))
router.put("/:id", validateTaskId, validateTask, asyncHandler(updateTask))
router.delete("/:id", validateTaskId, asyncHandler(deleteTask))
router.post("/archive", asyncHandler(archiveTasks))

export default router
