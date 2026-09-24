import { NextResponse } from 'next/server';
import { listMediaImages } from '@/lib/cms/media';
export const runtime = 'nodejs';
export async function GET() { return NextResponse.json({ images: await listMediaImages().catch(() => []) }); }
