const { redactUrl } = require('./runtime-logging');

const redactStreamingUrl = redactUrl;

async function runInjectionStages({ webContents, stages, isCurrent, onStageError }) {
  for (const stage of stages) {
    if (!isCurrent()) return { ok: false, stale: true };

    try {
      await webContents.executeJavaScript(stage.code);
    } catch (error) {
      onStageError(stage.name, error);
      return { ok: false, stage: stage.name };
    }

    if (!isCurrent()) return { ok: false, stale: true };
  }

  return { ok: true };
}

module.exports = { redactStreamingUrl, runInjectionStages };
