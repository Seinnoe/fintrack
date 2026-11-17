import { sendNotification, setVapidDetails } from "web-push";
import { prisma } from "../config/prisma.js";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

if (publicKey && privateKey && subject) {
  setVapidDetails(subject, publicKey, privateKey);
}

export function getVapidPublicKey() {
  return publicKey ?? "";
}

export async function sendPushNotification(
  userId: string,
  payload: {
    title: string;
    message: string;
    level?: "success" | "warning" | "info";
    url?: string;
  }
) {
  if (!publicKey || !privateKey || !subject) {
    console.warn("Push configuration missing");
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const body = JSON.stringify({
    title: payload.title,
    body: payload.message,
    level: payload.level ?? "info",
    url: payload.url ?? "/",
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          body
        );
      } catch (error: unknown) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number(error.statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({
            where: {
              id: subscription.id,
              userId,
            },
          });
        } else {
          console.error("Push delivery failed:", statusCode);
        }
      }
    })
  );
}
