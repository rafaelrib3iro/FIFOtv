const { createWebRuntime } = require('./web-runtime');

function createAppRuntimeRegistry(dependencies) {
  const runtimes = new Map([['web', createWebRuntime(dependencies)]]);
  return {
    resolve(app) {
      const runtime = runtimes.get(app?.type);
      if (!runtime) throw new Error(`Unsupported app runtime: ${app?.type || 'unknown'}`);
      return runtime;
    },
  };
}

module.exports = { createAppRuntimeRegistry };
