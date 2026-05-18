import { getPrisma } from "@/lib/prisma";
import {
  subscribe,
  unsubscribe,
  type DashboardEventMessage,
} from "@/lib/events";

export const runtime = "nodejs";

const encoder = new TextEncoder();
const HEARTBEAT_INTERVAL_MS = 25_000;
const REPLAY_LIMIT = 100;

export async function GET(request: Request): Promise<Response> {
  const lastEventId = parseLastEventId(request.headers.get("last-event-id"));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;

      const send = (message: DashboardEventMessage) => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(formatSse(message)));
      };

      const heartbeat = setInterval(() => {
        if (!closed) {
          controller.enqueue(encoder.encode(": ping\n\n"));
        }
      }, HEARTBEAT_INTERVAL_MS);

      const cleanup = () => {
        if (closed) {
          return;
        }

        closed = true;
        clearInterval(heartbeat);
        unsubscribe(send);
        controller.close();
      };

      request.signal.addEventListener("abort", cleanup, { once: true });

      if (lastEventId !== null) {
        const prisma = getPrisma();
        const missedEvents = await prisma.dashboardEvent.findMany({
          where: { id: { gt: lastEventId } },
          orderBy: { id: "asc" },
          take: REPLAY_LIMIT,
        });

        for (const event of missedEvents) {
          send({
            id: event.id.toString(),
            event: event.type,
            data: event.payload,
          });
        }
      }

      subscribe(send);
      send({ event: "ready", data: { connected: true } });
    },
    cancel() {
      // Browser disconnects are handled by request.signal; this is a safe no-op fallback.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function parseLastEventId(value: string | null): bigint | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  return BigInt(value);
}

function formatSse(message: DashboardEventMessage): string {
  const lines = [
    message.id ? `id: ${message.id}` : null,
    `event: ${message.event}`,
    `data: ${JSON.stringify(message.data)}`,
    "",
  ].filter((line): line is string => line !== null);

  return `${lines.join("\n")}\n`;
}
