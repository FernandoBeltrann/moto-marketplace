import { NextResponse } from 'next/server';
import { getSiteMap } from '@/lib/cms/site-map';
export const runtime = 'nodejs';
export async function GET() { return NextResponse.json({ nodes: await getSiteMap().catch(() => []) }); }
