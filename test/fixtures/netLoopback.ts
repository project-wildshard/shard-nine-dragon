import type { NetChannel, Transport, TransportStats } from '@wildshard/sdk/internal/engine/net/transport';

// P1-E5.2 (J49, E5-REPLICATION §4.1): test-only transports. They live under src/test/engine/ so that
// wildshard/no-production-test-import refuses them in production: a main-thread server can never ship.

class QueueEnd implements Transport {
  sentBytes = 0; recvBytes = 0;
  peer: QueueEnd | null = null;
  readonly inbox: { channel: NetChannel; bytes: ArrayBuffer }[] = [];
  private readonly messages = new Set<(channel: NetChannel, bytes: ArrayBuffer) => void>();
  private readonly closes = new Set<(reason: string) => void>();
  get stats(): TransportStats { return { rttMs: 0, lossPct: 0, sentBytes: this.sentBytes, recvBytes: this.recvBytes }; }
  send(channel: NetChannel, bytes: ArrayBuffer): void { this.sentBytes += bytes.byteLength; this.peer?.inbox.push({ channel, bytes }); }
  onMessage(listener: (channel: NetChannel, bytes: ArrayBuffer) => void): () => void { this.messages.add(listener); return () => { this.messages.delete(listener); }; }
  onClose(listener: (reason: string) => void): () => void { this.closes.add(listener); return () => { this.closes.delete(listener); }; }
  close(reason = 'closed'): void { const { peer } = this; this.ended(reason); peer?.ended(reason); }
  deliver(): void {
    for (const { channel, bytes } of this.inbox.splice(0)) { this.recvBytes += bytes.byteLength; for (const listener of this.messages) listener(channel, bytes); }
  }
  private ended(reason: string): void { for (const listener of this.closes) listener(reason); this.closes.clear(); }
}

/** Two connected ends on one thread. `pump` delivers everything queued, in both directions. */
export interface DirectLoopback { readonly client: Transport; readonly server: Transport; pump: () => void }
/** A same-thread loopback: Node unit tests and the bot gates. */
export function directLoopback(): DirectLoopback {
  const client = new QueueEnd(), server = new QueueEnd();
  client.peer = server; server.peer = client;
  return { client, server, pump: () => { while (client.inbox.length > 0 || server.inbox.length > 0) { client.deliver(); server.deliver(); } } };
}
