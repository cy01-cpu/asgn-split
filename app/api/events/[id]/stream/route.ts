import { emitter } from "@/app/lib/emitter";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function send(payload: object) {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {}
      }

      function onUpdate(type: string) {
        send({ type });
      }

      const heartbeat = setInterval(() => send({ type: "heartbeat" }), 25_000);

      emitter.on(`event:${eventId}`, onUpdate);

      req.signal.onabort = () => {
        emitter.off(`event:${eventId}`, onUpdate);
        clearInterval(heartbeat);
        try { controller.close(); } catch {}
      };

      send({ type: "connected" });
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
