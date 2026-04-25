function timestamp(): string {
  return new Date().toISOString();
}

export function info(message: string, meta?: unknown): void {
  if (meta === undefined) {
    console.log(`[${timestamp()}] ${message}`);
    return;
  }

  console.log(`[${timestamp()}] ${message}`, meta);
}

export function warn(message: string, meta?: unknown): void {
  if (meta === undefined) {
    console.warn(`[${timestamp()}] ${message}`);
    return;
  }

  console.warn(`[${timestamp()}] ${message}`, meta);
}

export function error(message: string, meta?: unknown): void {
  if (meta === undefined) {
    console.error(`[${timestamp()}] ${message}`);
    return;
  }

  console.error(`[${timestamp()}] ${message}`, meta);
}
