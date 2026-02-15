type LogPayload = Record<string, unknown> | unknown[] | string | number | boolean | null;

const isDevEnvironment = process.env.NODE_ENV === 'development';
const isForcedOn = process.env.NEXT_PUBLIC_DEBUG_LOGS === 'true';

export const isDevLoggingEnabled = isDevEnvironment || isForcedOn;

function formatScope(scope: string): string {
  return `[dev:${scope}]`;
}

export function devLog(scope: string, message: string, payload?: LogPayload): void {
  if (!isDevLoggingEnabled) return;
  if (payload === undefined) {
    console.debug(formatScope(scope), message);
    return;
  }
  console.debug(formatScope(scope), message, payload);
}

export function devWarn(scope: string, message: string, payload?: LogPayload): void {
  if (!isDevLoggingEnabled) return;
  if (payload === undefined) {
    console.warn(formatScope(scope), message);
    return;
  }
  console.warn(formatScope(scope), message, payload);
}