import { EventEmitter } from "events";

declare global {
  // eslint-disable-next-line no-var
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
