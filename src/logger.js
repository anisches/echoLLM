function timestamp() {
  return new Date().toISOString();
}

export function info(message, meta) {
  if (meta === undefined) {
    console.log(`[${timestamp()}] ${message}`);
    return;
  }
  console.log(`[${timestamp()}] ${message}`, meta);
}

export function warn(message, meta) {
  if (meta === undefined) {
    console.warn(`[${timestamp()}] ${message}`);
    return;
  }
  console.warn(`[${timestamp()}] ${message}`, meta);
}

export function error(message, meta) {
  if (meta === undefined) {
    console.error(`[${timestamp()}] ${message}`);
    return;
  }
  console.error(`[${timestamp()}] ${message}`, meta);
}

