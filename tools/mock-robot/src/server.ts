import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { RobotModel } from './robot_model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..', '..');

const PORT = parseInt(process.env.PORT || '8080', 10);
const robotModel = new RobotModel();

const server = http.createServer((req, res) => {
  // Static file serving fallback for testing controller builds
  const staticDirs = [
    path.join(rootDir, 'firmware', 'data'),
    path.join(rootDir, 'controller', 'dist')
  ];

  let served = false;
  let reqPath = req.url === '/' ? '/index.html' : (req.url || '/index.html');
  reqPath = reqPath.split('?')[0];

  for (const dir of staticDirs) {
    const filePath = path.join(dir, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      let contentType = 'text/plain';
      if (filePath.endsWith('.html')) contentType = 'text/html';
      else if (filePath.endsWith('.js')) contentType = 'application/javascript';
      else if (filePath.endsWith('.css')) contentType = 'text/css';
      else if (filePath.endsWith('.json')) contentType = 'application/json';
      else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';

      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
      served = true;
      break;
    }
  }

  if (!served) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('FootBot Mock Robot Server active on ws://localhost:' + PORT + '/ws\n');
  }
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = request.url?.split('?')[0];
  if (pathname === '/ws') {
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
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    },
    (code: number, reason: string) => {
      ws.close(code, reason);
    }
  );

  if (!accepted) {
    return;
  }

  console.log('[MockRobot] Client connected');

  ws.on('message', (data: Buffer | string) => {
    const raw = data.toString();
    robotModel.handleMessage(raw);
  });

  ws.on('close', () => {
    console.log('[MockRobot] Client disconnected');
    robotModel.onClientDisconnected();
  });

  ws.on('error', (err) => {
    console.error('[MockRobot] Socket error:', err.message);
  });
});

server.listen(PORT, () => {
  console.log(`[MockRobot] Server listening on http://localhost:${PORT}/ and ws://localhost:${PORT}/ws`);
});

export { server, wss, robotModel };

