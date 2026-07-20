const path = require('path');

const DEFAULT_PROFILE = 'linux';
const MACOS_PROFILE = 'macos';

function resolveRuntimeProfile(value) {
  return value === MACOS_PROFILE ? MACOS_PROFILE : DEFAULT_PROFILE;
}

function resolveLogFile(configFile, profile, projectRoot) {
  if (profile === MACOS_PROFILE) {
    return path.join(projectRoot, '.runtime-logs', 'main.log');
  }
  return configFile;
}

function supportsBluez(platform) {
  return platform === 'linux';
}

module.exports = { resolveLogFile, resolveRuntimeProfile, supportsBluez };
