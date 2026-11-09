
import { Router } from "express";
import {
  getDebts,
  createDebt,
  addDebtPayment,
  getDebtOverview,
  archiveDebt,
  restoreDebt,
} from "../controllers/debt.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", getDebts);
router.get("/overview", getDebtOverview);
router.post("/", createDebt);
router.post("/:id/payments", addDebtPayment);
router.patch("/:id/archive", archiveDebt);
router.patch("/:id/restore", restoreDebt);

export default router;
