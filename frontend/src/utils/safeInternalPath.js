/**
 * 只允許站內相對 path，避免 open redirect。
 * @param {unknown} value
 * @returns {string | null}
 */
export function safeInternalPath(value) {
  if (typeof value !== 'string') return null;
  const path = value.trim();
  if (!path.startsWith('/')) return null;
  if (path.startsWith('//')) return null;
  if (path.includes('://')) return null;
  if (path.includes('\\')) return null;
  return path;
}
