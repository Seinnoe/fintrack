import { Router } from "express";

import {
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} from "../controllers/savings.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", getSavingsGoals);
router.post("/", createSavingsGoal);
router.put("/:id", updateSavingsGoal);
router.delete("/:id", deleteSavingsGoal);

export default router;
