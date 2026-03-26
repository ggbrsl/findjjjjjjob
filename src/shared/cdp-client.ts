import WebSocket from 'ws';

export interface CdpClient {
  send(method: string, params?: object): Promise<unknown>;
  on(method: string, handler: (params: unknown) => void | Promise<void>): void;
  off(method: string, handler: (params: unknown) => void | Promise<void>): void;
  close(): Promise<void>;
}

export function createCdpClient(wsUrl: string): CdpClient {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  const listeners = new Map<string, Array<(params: unknown) => void | Promise<void>>>();

  ws.addEventListener('message', async (event) => {
    const msg = JSON.parse(event.data.toString()) as {
      id?: number;
      method?: string;
      params?: unknown;
      result?: unknown;
      error?: { message?: string };
    };

    if (msg.id) {
      const waiter = pending.get(msg.id);
      if (!waiter) return;
      pending.delete(msg.id);
      if (msg.error) waiter.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      else waiter.resolve(msg.result);
      return;
    }

    if (!msg.method) return;
    const handlers = listeners.get(msg.method) || [];
    for (const handler of handlers) {
      if (!handler) continue;
      try {
        const result = handler(msg.params);
        if (result && typeof result.then === 'function') {
          await result.catch(() => {});
        }
      } catch {
        // Listener failures should not crash the socket loop.
      }
    }
  });

  function waitForOpen(): Promise<void> {
    if (ws.readyState === WebSocket.OPEN) return Promise.resolve();
    if (ws.readyState !== WebSocket.CONNECTING) {
      return Promise.reject(new Error('CDP socket not open'));
    }
    return new Promise((resolve, reject) => {
      ws.addEventListener('open', () => resolve(), { once: true });
      ws.addEventListener('error', (e) => reject(e), { once: true });
    });
  }

  async function send(method: string, params: object = {}): Promise<unknown> {
    await waitForOpen();
    return new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  }

  function on(method: string, handler: (params: unknown) => void | Promise<void>): void {
    const handlers = listeners.get(method) || [];
    handlers.push(handler);
    listeners.set(method, handlers);
  }

  function off(method: string, handler: (params: unknown) => void | Promise<void>): void {
    const handlers = listeners.get(method);
    if (!handlers) return;
    listeners.set(method, handlers.filter((candidate) => candidate !== handler));
  }

  async function close(): Promise<void> {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  }

  return { send, on, off, close };
}
