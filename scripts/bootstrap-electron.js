#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { downloadArtifact } = require('@electron/get');
const extract = require('extract-zip');

const electronDirectory = path.dirname(require.resolve('electron/package.json'));
const electronPackage = require(path.join(electronDirectory, 'package.json'));
const platform = process.env.ELECTRON_INSTALL_PLATFORM || process.env.npm_config_platform || os.platform();
const arch = process.env.ELECTRON_INSTALL_ARCH || process.env.npm_config_arch || process.arch;

const platformPaths = {
  darwin: 'Electron.app/Contents/MacOS/Electron',
  linux: 'electron'
};

if (!platformPaths[platform]) {
  throw new Error(`Castlabs Electron bootstrap does not support platform: ${platform}`);
}

const platformPath = platformPaths[platform];
const distDirectory = path.join(electronDirectory, 'dist');
const archiveName = `electron-v${electronPackage.version}-${platform}-${arch}.zip`;
const checksums = require(path.join(electronDirectory, 'checksums.json'));
const execFileAsync = promisify(execFile);

if (!checksums[archiveName]) {
  throw new Error(`Castlabs Electron has no checksum for ${archiveName}`);
}

function installed() {
  try {
    return fs.readFileSync(path.join(distDirectory, 'version'), 'utf8').replace(/^v/, '') === electronPackage.version
      && fs.readFileSync(path.join(electronDirectory, 'path.txt'), 'utf8') === platformPath
      && fs.existsSync(path.join(distDirectory, platformPath));
  } catch {
    return false;
  }
}

async function bootstrap() {
  if (installed()) {
    return;
  }

  const zipPath = await downloadArtifact({
    version: electronPackage.version,
    artifactName: 'electron',
    mirrorOptions: { mirror: 'https://github.com/castlabs/electron-releases/releases/download/' },
    cacheRoot: process.env.electron_config_cache,
    checksums,
    platform,
    arch
  });

  const extractionDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'fifotv-electron-'));
  let extractionTimedOut = false;
  try {
    await Promise.race([
      extract(zipPath, { dir: extractionDirectory }),
      new Promise((_, reject) => setTimeout(() => {
        extractionTimedOut = true;
        reject(new Error('extract-zip timed out'));
      }, 30000))
    ]);
    await fs.promises.rm(distDirectory, { recursive: true, force: true });
    await fs.promises.rename(extractionDirectory, distDirectory);
  } catch (error) {
    if (!extractionTimedOut) {
      throw error;
    }
    await fs.promises.rm(distDirectory, { recursive: true, force: true });
    await execFileAsync('unzip', ['-q', zipPath, '-d', distDirectory]);
  }

  const typeDefinitions = path.join(distDirectory, 'electron.d.ts');
  if (fs.existsSync(typeDefinitions)) {
    await fs.promises.rename(typeDefinitions, path.join(electronDirectory, 'electron.d.ts'));
  }

  await fs.promises.writeFile(path.join(electronDirectory, 'path.txt'), platformPath);
}

const keepAlive = setInterval(() => {}, 1000);
bootstrap()
  .then(() => {
    clearInterval(keepAlive);
    process.exit(0);
  })
  .catch((error) => {
    clearInterval(keepAlive);
    console.error(`Castlabs Electron bootstrap failed: ${error.message}`);
    process.exit(1);
  });
