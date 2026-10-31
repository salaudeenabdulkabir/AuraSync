import { archiveResultImages, cacheKey, readCache, sha256, writeCache } from './cache';

const BASE = 'https://yce-api-01.makeupar.com/s2s/v2.0';
export type Feature = 'skin-analysis' | 'skin-tone-analysis' | 'cloth-v4' | 'makeup-vto';
export type Telemetry = { feature: Feature; taskId: string; elapsedMs: number; cache: 'hit' | 'miss'; units: number | null };
export type TaskRun = { response: Record<string, unknown>; telemetry: Telemetry; key: string };

function apiKey(): string {
  const key = process.env.YOUCAM_API_KEY;
  if (!key) throw new Error('Live mode requires YOUCAM_API_KEY on the server.');
  return key;
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000), cache: 'no-store' });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `YouCam request failed (${response.status})`);
  return body;
}

export async function uploadImage(bytes: Buffer, fileName: string, contentType: string): Promise<string> {
  if (bytes.length > 10_000_000) throw new Error('Image must be smaller than 10 MB.');
  if (!['image/jpeg', 'image/png'].includes(contentType)) throw new Error('Upload a JPEG or PNG image.');
  const created = await request<{ data: { files: { file_id: string; requests: { method: string; url: string; headers: Record<string, string> }[] }[] } }>(`${BASE}/file`, {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: [{ content_type: contentType === 'image/jpeg' ? 'image/jpg' : contentType, file_name: fileName, file_size: bytes.length }] })
  });
  const file = created.data?.files?.[0];
  const upload = file?.requests?.[0];
  if (!file?.file_id || !upload?.url) throw new Error('YouCam did not return an upload URL.');
  const put = await fetch(upload.url, { method: upload.method || 'PUT', headers: upload.headers, body: Uint8Array.from(bytes).buffer, signal: AbortSignal.timeout(30_000) });
  if (!put.ok) throw new Error(`YouCam image upload failed (${put.status})`);
  return file.file_id;
}

export async function runTask(feature: Feature, inputHash: string, params: Record<string, unknown>, units: number | null = null): Promise<TaskRun> {
  const key = cacheKey(feature, inputHash, params);
  const cached = await readCache<{ response: Record<string, unknown>; telemetry: Telemetry }>(key);
  if (cached) return { response: cached.response, telemetry: { ...cached.telemetry, cache: 'hit', elapsedMs: 0 }, key };
  const start = Date.now();
  const created = await request<{ data: { task_id: string } }>(`${BASE}/task/${feature}`, {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(params)
  });
  const taskId = created.data?.task_id;
  if (!taskId) throw new Error(`YouCam ${feature} returned no task ID.`);
  let result: Record<string, unknown> | null = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 2500 : 5000));
    const polled = await request<{ data: { task_status: string; results?: unknown; error?: string } }>(`${BASE}/task/${feature}/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey()}` }
    });
    if (polled.data?.task_status === 'error') throw new Error(polled.data.error || `${feature} task failed.`);
    if (polled.data?.task_status === 'success') { result = polled as unknown as Record<string, unknown>; break; }
  }
  if (!result) throw new Error(`${feature} timed out while polling.`);
  const { result: archived } = await archiveResultImages(result);
  const telemetry: Telemetry = { feature, taskId, elapsedMs: Date.now() - start, cache: 'miss', units };
  await writeCache(key, { response: archived, telemetry });
  return { response: archived, telemetry, key };
}

export const imageHash = (bytes: Buffer) => sha256(bytes);
