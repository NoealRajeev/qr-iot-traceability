import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { lotId: string } }
) {
  const lot = await prisma.lot.findUnique({
    where: { id: params.lotId },
    include: {
      score: true,
      events: { orderBy: { ts: 'desc' } },
      telemetry: { orderBy: { ts: 'asc' } },
    },
  });

  if (!lot) {
    return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
  }

  return NextResponse.json(lot);
}