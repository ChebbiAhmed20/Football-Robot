import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const controllerDir = path.join(rootDir, 'controller');
const firmwareDataDir = path.join(rootDir, 'firmware', 'data');

console.log('--- Building FootBot Controller ---');

// 1. Run Vite build
const buildRes = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  cwd: controllerDir,
  stdio: 'inherit',
  shell: true
});

if (buildRes.status !== 0) {
  console.error('Controller build failed!');
  process.exit(buildRes.status || 1);
}

// 2. Ensure firmware/data exists
if (!fs.existsSync(firmwareDataDir)) {
  fs.mkdirSync(firmwareDataDir, { recursive: true });
}

// 3. Ensure all files in firmware/data have .gz counterparts
function gzipAll(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      gzipAll(fullPath);
    } else if (!file.endsWith('.gz')) {
      const gzPath = fullPath + '.gz';
      const fileData = fs.readFileSync(fullPath);
      const gzipped = zlib.gzipSync(fileData, { level: 9 });
      fs.writeFileSync(gzPath, gzipped);
      console.log(`Gzipped: ${path.relative(firmwareDataDir, fullPath)} (${fileData.length} -> ${gzipped.length} bytes)`);
    }
  }
}

gzipAll(firmwareDataDir);
console.log('--- Build complete: controller written to firmware/data ---');
