/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { build, Platform, Arch } = require('electron-builder');

process.env.ELECTRON_MIRROR = process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/';
process.env.ELECTRON_BUILDER_BINARIES_MIRROR =
  process.env.ELECTRON_BUILDER_BINARIES_MIRROR || 'https://npmmirror.com/mirrors/electron-builder-binaries/';

const root = __dirname;

function signingConfig() {
  const certFile = process.env.SHIXU_CERT_FILE || process.env.WIN_CSC_LINK || '';
  const certPassword = process.env.SHIXU_CERT_PASSWORD || process.env.WIN_CSC_KEY_PASSWORD || '';
  if (!certFile || !fs.existsSync(certFile)) {
    console.log('SIGN: unsigned build (set SHIXU_CERT_FILE for production)');
    return {};
  }
  console.log('SIGN: using cert', certFile);
  return {
    signtoolOptions: {
      certificateFile: certFile,
      certificatePassword: certPassword,
      signingHashAlgorithms: ['sha256'],
      sign: true
    }
  };
}

// 标准打包：由 electron-builder 下载完整 Electron 运行时（含 ffmpeg.dll）
// 不要使用不完整的 node_modules/electron/dist 作为 electronDist
build({
  projectDir: root,
  targets: Platform.WINDOWS.createTarget(['nsis'], Arch.x64),
  config: {
    appId: 'app.shixu.desktop',
    productName: 'Shixu Desktop',
    copyright: 'Copyright © 2026',
    directories: {
      output: path.join(root, 'release'),
      buildResources: path.join(root, 'assets')
    },
    files: ['electron/**/*', 'renderer/**/*', 'assets/**/*', 'package.json'],
    asar: true,
    win: {
      target: ['nsis'],
      icon: path.join(root, 'assets', 'icon.png'),
      artifactName: 'Shixu-Desktop-Setup-${version}.${ext}',
      ...signingConfig()
    },
    nsis: {
      oneClick: false,
      perMachine: false,
      allowToChangeInstallationDirectory: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      shortcutName: '时序调度',
      artifactName: 'Shixu-Desktop-Setup-${version}.exe'
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
