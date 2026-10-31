import { NextResponse } from 'next/server';
import { planRepair } from '@/lib/agent';
import { cacheKey, firstImageUrl, readCache, writeCache } from '@/lib/cache';
import { computeHarmonyAudit } from '@/lib/harmony-math';
import { archivedImage, routeError } from '@/lib/route-helpers';
import { imageHash, runTask, uploadImage } from '@/lib/youcam';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json() as { image: string; skinHex: string; garmentHex: string; redness?: number | null };
    const audit = computeHarmonyAudit(body.skinHex, body.garmentHex, body.redness);
    const plan = planRepair(body.garmentHex, audit, body.redness);
    if (audit.score >= 80) return NextResponse.json({ image: body.image, plan, skipped: true, reason: 'Baseline palette already meets the styling threshold.' });
    const source = await archivedImage(body.image);
    const hash = imageHash(source.bytes);
    const key = cacheKey('harmonize-bundle', hash, plan.effects);
    const cached = await readCache<Record<string, unknown>>(key);
    if (cached) return NextResponse.json({ ...cached, telemetry: { ...(cached.telemetry as object), cache: 'hit' } });
    const fileId = await uploadImage(source.bytes, source.name, source.type);
    const task = await runTask('makeup-vto', hash, { src_file_id: fileId, version: '1.0', effects: plan.effects }, 1);
    const image = firstImageUrl(task.response);
    if (!image) throw new Error('YouCam makeup task returned no archiveable image.');
    const result = { image, plan, skipped: false, telemetry: task.telemetry, source: 'youcam' };
    await writeCache(key, result);
    return NextResponse.json(result);
  } catch (error) { return routeError(error); }
}
