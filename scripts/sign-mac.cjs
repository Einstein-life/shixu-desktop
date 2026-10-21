// Ad-hoc signing seals internal test builds. It does not provide a publisher identity.
const { signAsync } = require('@electron/osx-sign');

exports.default = async function signMac(options) {
  if (process.platform !== 'darwin') throw new Error('macOS signing requires macOS');
  await signAsync({
    ...options,
    identity: '-',
    identityValidation: false,
    preAutoEntitlements: false,
    preEmbedProvisioningProfile: false,
    strictVerify: true,
    optionsForFile: file => ({
      ...(options.optionsForFile ? options.optionsForFile(file) : {}),
      timestamp: 'none'
    })
  });
};
