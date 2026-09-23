# Generate macOS .icns from assets/icon.png (run on macOS)
# Usage: node scripts/make-icns.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const png = path.join(root, 'assets', 'icon.png');
const icns = path.join(root, 'assets', 'icon.icns');
const iconsetDir = path.join(root, 'assets', 'icon.iconset');

if (process.platform !== 'darwin') {
  if (fs.existsSync(icns)) {
    console.log('ICNS_EXISTS', icns);
    process.exit(0);
  }
  console.error('make-icns requires macOS (or provide assets/icon.icns)');
  process.exit(1);
}

if (!fs.existsSync(png)) {
  console.error('missing assets/icon.png');
  process.exit(1);
}

fs.rmSync(iconsetDir, { recursive: true, force: true });
fs.mkdirSync(iconsetDir, { recursive: true });

const sizes = [
  [16, '16x16'],
  [32, '16x16@2x'],
  [32, '32x32'],
  [64, '32x32@2x'],
  [128, '128x128'],
  [256, '128x128@2x'],
  [256, '256x256'],
  [512, '256x256@2x'],
  [512, '512x512'],
  [1024, '512x512@2x']
];

for (const [px, name] of sizes) {
  const out = path.join(iconsetDir, `icon_${name}.png`);
  execSync(`sips -z ${px} ${px} "${png}" --out "${out}"`, { stdio: 'inherit' });
}

execSync(`iconutil -c icns "${iconsetDir}" -o "${icns}"`, { stdio: 'inherit' });
console.log('ICNS_OK', icns);
