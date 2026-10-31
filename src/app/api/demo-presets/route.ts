import { NextResponse } from 'next/server';
import { presets } from '@/lib/presets';

export async function GET() { return NextResponse.json({ presets, source: 'illustrative', note: 'Generated imagery and manually selected colors. No YouCam measurements are claimed.' }); }
