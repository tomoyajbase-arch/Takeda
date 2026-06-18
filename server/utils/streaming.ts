import { Response } from 'express';

export function setupSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

export function sendSSEEvent(res: Response, data: object): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function sendSSEDone(res: Response): void {
  res.write('data: [DONE]\n\n');
  res.end();
}
