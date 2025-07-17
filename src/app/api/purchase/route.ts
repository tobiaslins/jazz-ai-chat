import { getWorker } from "@/app/worker";
import { Credits } from "@/app/(app)/schema";
import { Account } from "jazz-tools";
import { NextRequest } from "next/server";
import { track } from "@vercel/analytics/server";

export async function POST(req: NextRequest) {
  const { userId, creditsId } = await req.json();
  const worker = await getWorker();

  if (!userId || !creditsId) {
    track("API Error", {
      endpoint: "/api/purchase",
      error: "missing_parameters",
      hasUserId: !!userId,
      hasCreditsId: !!creditsId,
    });
    return new Response("Missing userId or creditsId", { status: 400 });
  }

  // Load the user's account to ensure they exist
  const userAccount = await Account.load(userId, { loadAs: worker });

  if (!userAccount) {
    track("API Error", {
      endpoint: "/api/purchase",
      error: "user_not_found",
      userId,
    });
    return new Response("User not found", { status: 404 });
  }

  // Load the credits object with write permissions via the worker
  const credits = await Credits.load(creditsId, { loadAs: worker });

  if (!credits) {
    track("API Error", {
      endpoint: "/api/purchase",
      error: "credits_not_found",
      userId,
      creditsId,
    });
    return new Response("Credits object not found", { status: 404 });
  }

  // Add 10 credits
  const previousBalance = credits.balance;
  credits.balance += 10;

  track("Credits Purchased", {
    userId,
    creditsId,
    previousBalance,
    newBalance: credits.balance,
    creditsAdded: 10,
  });

  await worker.waitForAllCoValuesSync({ timeout: 5000 });

  return Response.json({ success: true, newBalance: credits.balance });
}
