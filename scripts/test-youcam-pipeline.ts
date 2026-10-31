import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { firstImageUrl } from '../src/lib/cache';
import { imageHash, runTask, uploadImage } from '../src/lib/youcam';

async function main() {
  if (!process.argv.includes('--live')) throw new Error('Add --live to authorize one paid YouCam skin analysis task (9 units).');
  if (!process.env.YOUCAM_API_KEY) throw new Error('Set YOUCAM_API_KEY before running the live verification.');
  const input = process.argv.find((value) => /\.(jpe?g|png)$/i.test(value));
  if (!input) throw new Error('Pass a clear face JPEG or PNG file path.');
  const bytes = await readFile(input);
  const type = /\.png$/i.test(input) ? 'image/png' : 'image/jpeg';
  const fileId = await uploadImage(bytes, path.basename(input), type);
  const task = await runTask('skin-analysis', imageHash(bytes), { src_file_id: fileId, dst_actions: ['texture'], format: 'json' }, 9);
  const image = firstImageUrl(task.response);
  if (!task.response.data || !image) throw new Error('Verification failed: no JSON data or archived output image returned.');
  console.log(JSON.stringify({ taskId: task.telemetry.taskId, cache: task.telemetry.cache, jsonCacheKey: task.key, archivedImage: image }, null, 2));
}

main().catch((error) => { console.error((error as Error).message); process.exitCode = 1; });
