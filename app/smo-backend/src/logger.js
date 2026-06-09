// Minimal logger — Railway injects timestamps, so we just add level + context.
const logger = {
  info:  (msg, meta) => console.log(`[INFO]  ${msg}`, ...(meta ? [meta] : [])),
  warn:  (msg, meta) => console.warn(`[WARN]  ${msg}`, ...(meta ? [meta] : [])),
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, ...(meta ? [meta] : [])),
};

export default logger;
