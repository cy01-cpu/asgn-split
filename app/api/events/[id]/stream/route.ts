import { emitter } from "@/app/lib/emitter";
import { toId } from "@/app/lib/validate";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
// SSE 為長連線；明確設定上限（Vercel 各方案預設 300 秒）。連線被切斷後
// 前端 EventSource 會自動重連（見 page.tsx 的 onerror → setTimeout(connect)）。
export const maxDuration = 300;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = toId(id);
  // id 非法時直接回 400，不開串流（原本 Number("abc") 會得到 NaN 仍掛上監聽器）。
  if (!eventId) {
    return Response.json({ error: "invalid_id" }, { status: 400 });
  }

  const enc = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      function send(payload: object) {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // controller 已關閉：標記並停止後續推送，避免重複拋錯。
          closed = true;
        }
      }

      function onUpdate(type: string) {
        send({ type });
      }

      // 心跳維持連線存活、並讓中介層（如 proxy）不致因閒置而中斷。
      const heartbeat = setInterval(() => send({ type: "heartbeat" }), 25_000);

      emitter.on(`event:${eventId}`, onUpdate);

      // 用 addEventListener 而非覆寫 .onabort，較不易被其他程式碼覆蓋；
      // 連線中止時務必移除監聽器並清掉心跳，這是避免 EventEmitter 記憶體洩漏的關鍵。
      req.signal.addEventListener("abort", () => {
        closed = true;
        emitter.off(`event:${eventId}`, onUpdate);
        clearInterval(heartbeat);
        try { controller.close(); } catch {}
      });

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
