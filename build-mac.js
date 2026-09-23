/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { build, Platform } = require('electron-builder');

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

build({
  projectDir: root,
  targets: Platform.MAC.createTarget(['dmg', 'zip'], ['x64', 'arm64']),
  config: {
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
      // 未购买 Apple Developer 证书时不签名，避免本地/CI 失败
      identity: null,
      icon: fs.existsSync(iconIcns) ? iconIcns : iconPng,
      artifactName: 'Shixu-Desktop-${version}-mac-${arch}.${ext}',
      darkModeSupport: true
    },
    dmg: {
      title: '时序调度',
      artifactName: 'Shixu-Desktop-${version}-mac-${arch}.${ext}'
    }
  }
})
  .then(() => {
    console.log('BUILD_OK_MAC');
  })
  .catch((err) => {
    console.error('BUILD_FAIL', err && err.message ? err.message : err);
    process.exitCode = 1;
  });
