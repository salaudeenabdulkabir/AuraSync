import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export async function requiredImage(form: FormData, field: string): Promise<{ bytes: Buffer; name: string; type: string }> {
  const file = form.get(field);
  if (!(file instanceof File)) throw new Error(`Choose a ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} image.`);
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('Use a JPEG or PNG image.');
  if (file.size > 10_000_000) throw new Error('Images must be smaller than 10 MB.');
  return { bytes: Buffer.from(await file.arrayBuffer()), name: file.name || `${field}.jpg`, type: file.type };
}

export async function archivedImage(pathOrData: string): Promise<{ bytes: Buffer; name: string; type: string }> {
  if (pathOrData.startsWith('data:image/')) {
    const match = pathOrData.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/s);
    if (!match) throw new Error('Unsupported archived image data.');
    return { bytes: Buffer.from(match[2], 'base64'), name: 'try-on.jpg', type: match[1] };
  }
  if (!/^\/cached-outputs\/[a-f0-9]{64}\.(jpg|png|webp)$/.test(pathOrData)) throw new Error('Invalid archived image path.');
  const name = path.posix.basename(pathOrData);
  if (name.endsWith('.webp')) throw new Error('WEBP output must be converted before makeup try-on.');
  return { bytes: await readFile(path.join(process.cwd(), 'public', 'cached-outputs', name)), name, type: name.endsWith('.png') ? 'image/png' : 'image/jpeg' };
}

export function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected error.';
  return NextResponse.json({ error: message }, { status: /requires YOUCAM_API_KEY/.test(message) ? 503 : 400 });
}
