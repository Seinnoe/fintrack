import { Router } from "express";

import {
  getPushKey,
  subscribePush,
  unsubscribePush,
} from "../controllers/push.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/public-key", getPushKey);
router.post("/subscribe", subscribePush);
router.post("/unsubscribe", unsubscribePush);

export default router;
