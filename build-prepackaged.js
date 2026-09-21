/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { build, Platform } = require('electron-builder');

process.env.ELECTRON_MIRROR = process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/';
process.env.ELECTRON_BUILDER_BINARIES_MIRROR =
  process.env.ELECTRON_BUILDER_BINARIES_MIRROR || 'https://npmmirror.com/mirrors/electron-builder-binaries/';

const root = __dirname;

/** 代码签名：设置了证书文件才启用（正式对外请购买 OV/EV 证书） */
function signingConfig() {
  const certFile = process.env.SHIXU_CERT_FILE || process.env.WIN_CSC_LINK || '';
  const certPassword = process.env.SHIXU_CERT_PASSWORD || process.env.WIN_CSC_KEY_PASSWORD || '';
  if (!certFile || !fs.existsSync(certFile)) {
    console.log('SIGN: 未配置证书（SHIXU_CERT_FILE），本次构建为未签名，SmartScreen 可能提示。');
    return {};
  }
  console.log('SIGN: 使用证书', certFile);
  // electron-builder 25+ 推荐 win.signtoolOptions
  return {
    signtoolOptions: {
      certificateFile: certFile,
      certificatePassword: certPassword,
      signingHashAlgorithms: ['sha256'],
      sign: true
    }
  };
}

const pre = path.join(root, 'release', '时序调度-portable');
if (!fs.existsSync(pre)) {
  console.error('BUILD_FAIL: 缺少 release/时序调度-portable，请先准备便携目录');
  process.exit(1);
}

build({
  projectDir: root,
  prepackaged: pre,
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
      icon: path.join(root, 'assets', 'icon.png'),
      ...signingConfig()
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
