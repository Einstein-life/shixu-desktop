/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { build, Platform, Arch } = require('electron-builder');

process.env.ELECTRON_MIRROR = process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/';
process.env.ELECTRON_BUILDER_BINARIES_MIRROR =
  process.env.ELECTRON_BUILDER_BINARIES_MIRROR || 'https://npmmirror.com/mirrors/electron-builder-binaries/';

const root = __dirname;
const iconIcns = path.join(root, 'assets', 'icon.icns');
const iconPng = path.join(root, 'assets', 'icon.png');

if (!fs.existsSync(iconIcns) && !fs.existsSync(iconPng)) {
  console.error('BUILD_FAIL: missing assets/icon.icns or icon.png');
  process.exit(1);
}

const iconPath = fs.existsSync(iconIcns) ? iconIcns : iconPng;

function configFor() {
  return {
    appId: 'app.shixu.desktop',
    productName: '时序调度',
    copyright: 'Copyright © 2026',
    directories: {
      output: path.join(root, 'release'),
      buildResources: path.join(root, 'assets')
    },
    files: ['electron/**/*', 'renderer/**/*', 'assets/**/*', 'package.json'],
    mac: {
      category: 'public.app-category.productivity',
      identity: null,
      icon: iconPath,
      artifactName: 'Shixu-Desktop-${version}-mac-${arch}.${ext}',
      darkModeSupport: true
    },
    dmg: {
      title: '时序调度',
      artifactName: 'Shixu-Desktop-${version}-mac-${arch}.${ext}'
    }
  };
}

async function buildArch(arch) {
  console.log('BUILD_MAC arch=', String(arch));
  await build({
    projectDir: root,
    // 必须显式传 Arch，否则 electron-builder 报 arch not specified
    targets: Platform.MAC.createTarget(['dmg', 'zip'], arch),
    config: configFor()
  });
}

async function main() {
  // 逐架构打包，避免 createTarget 多 arch 时 arch=undefined
  await buildArch(Arch.x64);
  await buildArch(Arch.arm64);
  console.log('BUILD_OK_MAC');
}

main().catch((err) => {
  console.error('BUILD_FAIL', err && err.message ? err.message : err);
  process.exitCode = 1;
});
