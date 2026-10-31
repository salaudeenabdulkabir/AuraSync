import { NextResponse } from 'next/server';
import { cacheKey, readCache, writeCache } from '@/lib/cache';
import { hexToLab } from '@/lib/harmony-math';
import { requiredImage, routeError } from '@/lib/route-helpers';
import { imageHash, runTask, uploadImage } from '@/lib/youcam';

export const runtime = 'nodejs';
export const maxDuration = 300;

type Analysis = { skinHex: string; lab: ReturnType<typeof hexToLab>; redness: number | null; moisture: number | null; texture: number | null; telemetry: unknown[]; source: 'youcam' };

function skinScore(response: Record<string, unknown>, type: string): number | null {
  const data = response.data as { results?: { output?: { type: string; ui_score?: number }[] } } | undefined;
  const score = data?.results?.output?.find((item) => item.type === type)?.ui_score;
  return typeof score === 'number' ? score : null;
}

export async function POST(request: Request) {
  try {
    const { bytes, name, type } = await requiredImage(await request.formData(), 'portrait');
    const hash = imageHash(bytes);
    const key = cacheKey('analysis-bundle', hash, { concerns: ['redness', 'moisture', 'texture'] });
    const cached = await readCache<Analysis>(key);
    if (cached) return NextResponse.json({ ...cached, telemetry: (cached.telemetry as { cache: string }[]).map((item) => ({ ...item, cache: 'hit' })) });
    const fileId = await uploadImage(bytes, name, type);
    const [skin, tone] = await Promise.all([
      runTask('skin-analysis', hash, { src_file_id: fileId, dst_actions: ['redness', 'moisture', 'texture'], format: 'json' }, 9),
      runTask('skin-tone-analysis', hash, { src_file_id: fileId }, 20)
    ]);
    const toneData = tone.response.data as { results?: { color?: { skin_color?: string } } } | undefined;
    const skinHex = toneData?.results?.color?.skin_color;
    if (!skinHex || !/^#[0-9a-fA-F]{6}$/.test(skinHex)) throw new Error('YouCam did not return a valid skin color.');
    const result: Analysis = {
      skinHex, lab: hexToLab(skinHex), redness: skinScore(skin.response, 'redness'),
      moisture: skinScore(skin.response, 'moisture'), texture: skinScore(skin.response, 'texture'),
      telemetry: [skin.telemetry, tone.telemetry], source: 'youcam'
    };
    await writeCache(key, result);
    return NextResponse.json(result);
  } catch (error) { return routeError(error); }
}
