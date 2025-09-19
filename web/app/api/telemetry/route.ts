import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calculateFreshnessScore } from '@/lib/freshness';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lotId, kind, temp, hum } = body;

    if (!lotId || !kind) {
      return NextResponse.json({ error: 'Missing lotId or kind' }, { status: 400 });
    }

    // 1. Save telemetry data
    await prisma.telemetry.create({
      data: {
        lotId,
        kind,
        temp: temp ? parseFloat(temp) : null,
        hum: hum ? parseFloat(hum) : null,
      },
    });
    
    // 2. Recalculate and update the freshness score
    if (kind === 'cold') { // Only recalculate for cold-chain data
        await calculateFreshnessScore(lotId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Telemetry Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}