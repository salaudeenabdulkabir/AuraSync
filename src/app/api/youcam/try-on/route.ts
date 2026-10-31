import { NextResponse } from 'next/server';
import { cacheKey, firstImageUrl, readCache, writeCache } from '@/lib/cache';
import { computeHarmonyAudit } from '@/lib/harmony-math';
import { requiredImage, routeError } from '@/lib/route-helpers';
import { imageHash, runTask, uploadImage } from '@/lib/youcam';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const portrait = await requiredImage(form, 'portrait');
    const garment = await requiredImage(form, 'garment');
    const skinHex = String(form.get('skinHex') || '');
    const garmentHex = String(form.get('garmentHex') || '');
    const rednessRaw = form.get('redness');
    const redness = rednessRaw === null || rednessRaw === '' ? null : Number(rednessRaw);
    const audit = computeHarmonyAudit(skinHex, garmentHex, redness);
    const hash = imageHash(Buffer.concat([portrait.bytes, garment.bytes]));
    const key = cacheKey('try-on-bundle', hash, { garmentHex, skinHex, redness });
    const cached = await readCache<Record<string, unknown>>(key);
    if (cached) return NextResponse.json({ ...cached, telemetry: { ...(cached.telemetry as object), cache: 'hit' } });
    const [portraitId, garmentId] = await Promise.all([
      uploadImage(portrait.bytes, portrait.name, portrait.type),
      uploadImage(garment.bytes, garment.name, garment.type)
    ]);
    const task = await runTask('cloth-v4', hash, { src_file_id: portraitId, ref_file_id: garmentId, garment_category: 'upper_body' }, 2);
    const image = firstImageUrl(task.response);
    if (!image) throw new Error('YouCam clothes task returned no archiveable image.');
    const result = { image, audit, telemetry: task.telemetry, source: 'youcam' };
    await writeCache(key, result);
    return NextResponse.json(result);
  } catch (error) { return routeError(error); }
}
