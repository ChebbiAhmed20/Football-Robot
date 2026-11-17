import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const mockDir = path.join(rootDir, 'tools', 'mock-robot');
const controllerDir = path.join(rootDir, 'controller');

console.log('=== Starting FootBot Dev Environment ===');
console.log('1. Starting Mock Robot server...');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const mockProcess = spawn(npmCmd, ['start'], {
  cwd: mockDir,
  stdio: 'inherit',
  shell: true
});

console.log('2. Starting Controller Vite dev server...');
const controllerProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: controllerDir,
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\nShutting down dev environment...');
  if (mockProcess.pid) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', mockProcess.pid.toString(), '/f', '/t']);
    } else {
      mockProcess.kill('SIGINT');
    }
  }
  if (controllerProcess.pid) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', controllerProcess.pid.toString(), '/f', '/t']);
    } else {
      controllerProcess.kill('SIGINT');
    }
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

