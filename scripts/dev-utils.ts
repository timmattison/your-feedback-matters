/**
 * Pure helpers for scripts/dev.ts, split out so they can be unit-tested.
 */

/** A validated TCP port (1-65535), obtainable only via parsePort. */
export type Port = number & { readonly __brand: 'Port' };

/**
 * Parses the stdout of `portplz` into a validated Port.
 * Returns null unless the output is exactly one integer in 1-65535.
 */
export function parsePort(output: string): Port | null {
  const trimmed = output.trim();
  if (!/^\d{1,5}$/.test(trimmed)) {
    return null;
  }
  const port = Number(trimmed);
  if (port < 1 || port > 65535) {
    return null;
  }
  return port as Port;
}

/**
 * Builds the pnpm argument list that starts Vite on the given port
 * and opens the browser at the main page.
 */
export function buildViteArgs(port: Port): string[] {
  return ['exec', 'vite', '--port', String(port), '--strictPort', '--open'];
}
