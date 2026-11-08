
import { Router } from "express";

import { getMonthlySummary } from "../controllers/report.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/monthly", getMonthlySummary);

export default router;
