import { NextResponse } from 'next/server';
import { getSiteLinks } from '@/lib/cms/links';
export const runtime = 'nodejs';
export async function GET() { return NextResponse.json({ links: await getSiteLinks().catch(() => []) }); }
