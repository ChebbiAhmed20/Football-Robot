import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { RobotModel } from '../src/robot_model.js';
import fs from 'fs';
import path from 'path';

describe('End-to-End Integration (Mock Robot Server + Built Controller Assets)', () => {
  let server: http.Server;
  let port: number;
  let robotModel: RobotModel;

  beforeAll(async () => {
    robotModel = new RobotModel();
    const wss = new WebSocketServer({ noServer: true });

    server = http.createServer((req, res) => {
      const dataDir = path.resolve(__dirname, '../../../firmware/data');
      let reqPath = req.url === '/' ? '/index.html' : (req.url || '/index.html');
      reqPath = reqPath.split('?')[0];
      const filePath = path.join(dataDir, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.on('upgrade', (request, socket, head) => {
      if (request.url?.startsWith('/ws')) {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    wss.on('connection', (ws: WebSocket) => {
      const accepted = robotModel.onClientConnected(
        (msg: string) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(msg);
        },
        (code: number, reason: string) => ws.close(code, reason)
      );
      if (!accepted) return;

      ws.on('message', (data) => robotModel.handleMessage(data.toString()));
      ws.on('close', () => robotModel.onClientDisconnected());
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('serves the real built controller index.html', async () => {
    const res = await fetch(`http://localhost:${port}/index.html`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('FootBot Controller');
    expect(html).toContain('joystick-pad');
    expect(html).toContain('btn-stop');
  });

  it('connects via WebSocket, exchanges hello, drives, and performs timed turns', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    const received: any[] = [];

    await new Promise<void>((resolve) => {
      ws.on('open', resolve);
    });

    ws.on('message', (data) => {
      received.push(JSON.parse(data.toString()));
    });

    // 1. Hello handshake
    ws.send(JSON.stringify({ t: 'hello', v: 4 }));
    await new Promise((r) => setTimeout(r, 50));

    expect(received.some((m) => m.t === 'hello' && m.v === 4 && m.fw === '1.0.0')).toBe(true);

    // 2. Drive command
    ws.send(JSON.stringify({ t: 'drive', q: 1, d: 0, m: 1.0, s: 200 }));
    await new Promise((r) => setTimeout(r, 50));
    expect(robotModel.getState().leftPwm).toBe(200);
    expect(robotModel.getState().rightPwm).toBe(200);

    // 3. Timed turn (90 deg -> 405 ms)
    ws.send(JSON.stringify({ t: 'turn', q: 2, a: 90, s: 200 }));
    await new Promise((r) => setTimeout(r, 50));
    expect(received.some((m) => m.t === 'ack' && m.q === 2)).toBe(true);
    expect(robotModel.getState().turnActive).toBe(true);

    // Wait for turn completion
    await new Promise((r) => setTimeout(r, 450));
    expect(robotModel.getState().turnActive).toBe(false);
    expect(received.some((m) => m.t === 'done' && m.q === 2)).toBe(true);

    // 4. Emergency Stop
    ws.send(JSON.stringify({ t: 'stop', q: 3 }));
    await new Promise((r) => setTimeout(r, 50));
    expect(received.some((m) => m.t === 'ack' && m.q === 3)).toBe(true);
    expect(robotModel.getState().leftPwm).toBe(0);

    ws.close();
  });
});

