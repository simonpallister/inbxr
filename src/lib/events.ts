import { EventEmitter } from "node:events";

export interface NewEmailEvent {
  id: string;
  mailbox: string;
  originalTo: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  snippet: string;
  receivedAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __mailEventBus: EventEmitter | undefined;
}

export function getMailEventBus(): EventEmitter {
  if (!globalThis.__mailEventBus) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(200);
    globalThis.__mailEventBus = emitter;
  }
  return globalThis.__mailEventBus;
}

export function emitNewEmail(event: NewEmailEvent): void {
  getMailEventBus().emit("email:new", event);
}

export function emitMailboxUpdated(mailbox: string): void {
  getMailEventBus().emit("mailbox:updated", { mailbox });
}
