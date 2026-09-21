/* eslint-disable no-console */
const path = require('path');
const { build, Platform } = require('electron-builder');

process.env.ELECTRON_MIRROR = process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/';
process.env.ELECTRON_BUILDER_BINARIES_MIRROR =
  process.env.ELECTRON_BUILDER_BINARIES_MIRROR || 'https://npmmirror.com/mirrors/electron-builder-binaries/';

const root = __dirname;

build({
  projectDir: root,
  targets: Platform.WINDOWS.createTarget(['nsis'], 'x64'),
  config: {
    appId: 'app.shixu.desktop',
    productName: '时序调度',
    copyright: 'Copyright © 2026',
    directories: {
      output: path.join(root, 'release'),
      buildResources: path.join(root, 'assets')
    },
    files: ['electron/**/*', 'renderer/**/*', 'assets/**/*', 'package.json'],
    asar: false,
    electronDist: path.join(root, 'node_modules', 'electron', 'dist'),
    win: {
      target: ['nsis'],
      icon: path.join(root, 'assets', 'icon.png')
    },
    nsis: {
      oneClick: false,
      perMachine: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: '时序调度',
      artifactName: '时序调度-Setup-${version}.exe'
    }
  }
})
  .then(() => {
    console.log('BUILD_OK');
  })
  .catch((err) => {
    console.error('BUILD_FAIL', err && err.message ? err.message : err);
    process.exitCode = 1;
  });
