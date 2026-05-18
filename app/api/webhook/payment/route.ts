import {
  DashboardEventType,
  Prisma,
  WebhookProcessingStatus,
} from "@/app/generated/prisma/client";
import { broadcast } from "@/lib/events";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const PAYMENT_WEBHOOK_SOURCE = "payment";

const paymentWebhookSchema = z.object({
  eventId: z.string().trim().min(1, "eventId is required."),
  type: z.literal("subscription_paid"),
});

type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;

type ProcessedWebhookResult = {
  eventId: string;
  dashboardEventId: bigint;
  resetRows: number;
};

export async function POST(request: Request): Promise<Response> {
  // TODO: Verify webhook signature (e.g. HMAC-SHA256 via a shared secret)
  //       before processing. Payment providers sign their payloads so that
  //       only requests originating from them are accepted.
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ message: "Request body must be valid JSON." }, 400);
  }

  const parsed = paymentWebhookSchema.safeParse(body);

  if (!parsed.success) {
    return jsonResponse(
      {
        message: "Validation failed.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      400,
    );
  }

  try {
    const result = await processSubscriptionPaidWebhook(parsed.data);

    broadcast({
      id: result.dashboardEventId.toString(),
      event: DashboardEventType.QUOTA_UPDATED,
      data: {
        reason: "subscription_paid",
        eventId: result.eventId,
        resetRows: result.resetRows,
      },
    });

    return jsonResponse(
      {
        message: "Webhook processed.",
        eventId: result.eventId,
        resetRows: result.resetRows,
      },
      200,
    );
  } catch (error) {
    if (isDuplicateWebhookError(error)) {
      return jsonResponse({ message: "Webhook already processed." }, 200);
    }

    console.error("Failed to process payment webhook", error);
    return jsonResponse({ message: "Internal server error." }, 500);
  }
}

async function processSubscriptionPaidWebhook(
  input: PaymentWebhookInput,
): Promise<ProcessedWebhookResult> {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    await tx.webhookEvent.create({
      data: {
        source: PAYMENT_WEBHOOK_SOURCE,
        externalEventId: input.eventId,
        eventType: input.type,
        payload: input,
        status: WebhookProcessingStatus.PROCESSING,
      },
    });

    const resetResult = await tx.providerMonthlyUsage.updateMany({
      data: { assignedCount: 0 },
    });

    const dashboardEvent = await tx.dashboardEvent.create({
      data: {
        type: DashboardEventType.QUOTA_UPDATED,
        payload: {
          reason: "subscription_paid",
          eventId: input.eventId,
          resetRows: resetResult.count,
        },
      },
    });

    await tx.webhookEvent.update({
      where: {
        source_externalEventId: {
          source: PAYMENT_WEBHOOK_SOURCE,
          externalEventId: input.eventId,
        },
      },
      data: {
        status: WebhookProcessingStatus.PROCESSED,
        processedAt: new Date(),
      },
    });

    return {
      eventId: input.eventId,
      dashboardEventId: dashboardEvent.id,
      resetRows: resetResult.count,
    };
  });
}

function isDuplicateWebhookError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    error.meta?.modelName === "WebhookEvent"
  );
}

function jsonResponse<T>(body: T, status: number): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
