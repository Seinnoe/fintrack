import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { getVapidPublicKey } from "../services/push.service.js";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export function getPushKey(_req: AuthRequest, res: Response) {
  const key = getVapidPublicKey();

  if (!key) {
    return res.status(503).json({
      success: false,
      message: "Push notifications are not configured",
    });
  }

  return res.json({
    success: true,
    publicKey: key,
  });
}

export async function subscribePush(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false });
    }

    const result = subscriptionSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid push subscription",
      });
    }

    const { endpoint, keys } = result.data;

    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing && existing.userId !== req.userId) {
      return res.status(409).json({
        success: false,
        message: "This device subscription belongs to another account",
      });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: req.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Subscribe push error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to subscribe to push notifications",
    });
  }
}

export async function unsubscribePush(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false });
    }

    const result = z.object({
      endpoint: z.string().url(),
    }).safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ success: false });
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint: result.data.endpoint,
        userId: req.userId,
      },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Unsubscribe push error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to unsubscribe",
    });
  }
}
