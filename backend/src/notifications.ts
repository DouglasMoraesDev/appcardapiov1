import { Response } from 'express';

type Client = {
  id: number;
  res: Response;
};

let clients: Client[] = [];
let seq = 0;

export const registerClient = (res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  const id = ++seq;
  const client: Client = { id, res };
  clients.push(client);

  // send heartbeat
  const keepAlive = setInterval(() => {
    try { res.write(': ping\n\n'); } catch (e) {}
  }, 20000);

  reqClose:
  res.on('close', () => {
    clearInterval(keepAlive);
    clients = clients.filter(c => c.id !== id);
  });
  return id;
};

export const sendEvent = (event: string, data: any) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) {
    try {
      c.res.write(payload);
    } catch (e) {
      // ignore write errors
    }
  }
};

export const clearClients = () => { clients = []; };
