import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const cacheDir = path.join(root, '.youcam-cache');
const outputDir = path.join(root, 'public', 'cached-outputs');

export const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const cacheKey = (feature: string, inputHash: string, config: unknown) => sha256(JSON.stringify({ feature, inputHash, config }));

export async function readCache<T>(key: string): Promise<T | null> {
  try { return JSON.parse(await readFile(path.join(cacheDir, `${key}.json`), 'utf8')) as T; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    await mkdir(cacheDir, { recursive: true });
    await writeFile(path.join(cacheDir, `${key}.json`), JSON.stringify(value, null, 2));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EROFS') throw error;
  }
}

function isTrustedResultUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && (url.hostname.endsWith('.amazonaws.com') || url.hostname.endsWith('.makeupar.com') || url.hostname.endsWith('.perfectcorp.com'));
  } catch { return false; }
}

/** Replaces expiring YouCam image URLs in a result payload with stable local paths. */
export async function archiveResultImages<T>(payload: T): Promise<{ result: T; archived: string[] }> {
  const archived: string[] = [];
  async function visit(value: unknown): Promise<unknown> {
    if (typeof value === 'string' && isTrustedResultUrl(value)) {
      const response = await fetch(value, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`Unable to archive YouCam output image (${response.status})`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const headerType = response.headers.get('content-type') || '';
      const type = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
        : bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ? 'image/jpeg'
        : headerType.startsWith('image/') ? headerType : '';
      if (!type) return value;
      const extension = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
      const name = `${sha256(bytes)}.${extension}`;
      try {
        await mkdir(outputDir, { recursive: true });
        await writeFile(path.join(outputDir, name), bytes);
        const localPath = `/cached-outputs/${name}`;
        archived.push(localPath);
        return localPath;
      } catch (error) {
        // Serverless deployments cannot write into public/. Return an immediately usable
        // image, while requiring build-time prewarming for durable judge presets.
        if ((error as NodeJS.ErrnoException).code === 'EROFS') return `data:${type || 'image/jpeg'};base64,${bytes.toString('base64')}`;
        throw error;
      }
    }
    if (Array.isArray(value)) return Promise.all(value.map(visit));
    if (value && typeof value === 'object') return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await visit(item)])));
    return value;
  }
  return { result: await visit(payload) as T, archived };
}

export function firstImageUrl(value: unknown): string | null {
  if (typeof value === 'string') return value.startsWith('/cached-outputs/') || value.startsWith('data:image/') ? value : null;
  if (Array.isArray(value)) { for (const item of value) { const found = firstImageUrl(item); if (found) return found; } }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['url', 'dst_url', 'dst_file_url', 'image_url', 'output_url', 'output', 'results', 'data']) {
      const found = firstImageUrl(record[key]); if (found) return found;
    }
  }
  return null;
}
