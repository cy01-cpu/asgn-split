import { EventEmitter } from "events";

/**
 * 行程內事件匯流排，串接「資料變更 → SSE 推播」。
 *
 * ⚠️ 部署侷限（重要）：這個 EventEmitter 只存在於單一行程記憶體中。
 * 在 Vercel / Serverless（Fluid Compute）等多實例環境，A 實例寫入的變更
 * 不會通知連在 B 實例上的 SSE 用戶端 —— 即時同步因此只在「單實例」可靠。
 * 若要在多實例下保證即時性，需改用跨行程的發布／訂閱：
 *   - PostgreSQL LISTEN/NOTIFY（本專案已有 PG，最省事）
 *   - 或 Redis Pub/Sub、Vercel Queues 等
 * 在那之前，前端的輪詢／重連與重新整理仍可作為最終一致性的後援。
 */

declare global {
  var __appEmitter: EventEmitter | undefined;
}

const emitter: EventEmitter =
  globalThis.__appEmitter ?? new EventEmitter();

if (!globalThis.__appEmitter) {
  globalThis.__appEmitter = emitter;
  emitter.setMaxListeners(200);
}

export function emitEventUpdate(eventId: number, type: string) {
  emitter.emit(`event:${eventId}`, type);
}

export { emitter };
