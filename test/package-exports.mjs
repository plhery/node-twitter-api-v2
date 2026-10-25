// Packs the library (run `npm run build` first), installs it in a temporary folder and loads it like users do:
// every export of require('twitter-api-v2') must also be importable by name from an ES module.
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const check = `
import { createRequire } from 'module';

const required = createRequire(import.meta.url)('twitter-api-v2');
const imported = await import('twitter-api-v2');
const missing = Object.keys(required).filter(name => !(name in imported));

if (missing.length) {
  console.error('Exports that ES modules cannot import by name: ' + missing.join(', '));
  process.exit(1);
}
console.log('All ' + Object.keys(required).length + ' exports load with require() and import, on Node ' + process.version);
`;

const folder = mkdtempSync(join(tmpdir(), 'twitter-api-v2-package-'));

try {
  const [{ filename }] = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', folder], { encoding: 'utf8' }));
  writeFileSync(join(folder, 'package.json'), '{ "private": true }');
  execFileSync('npm', ['install', '--no-audit', '--no-fund', join(folder, filename)], { cwd: folder, stdio: 'inherit' });
  writeFileSync(join(folder, 'check.mjs'), check);
  execFileSync(process.execPath, ['check.mjs'], { cwd: folder, stdio: 'inherit' });
} catch {
  process.exitCode = 1;
} finally {
  rmSync(folder, { recursive: true, force: true });
}
