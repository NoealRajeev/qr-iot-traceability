import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SAFE_MIN_TEMP = 2;
const SAFE_MAX_TEMP = 8;
const BREACH_DURATION_MINUTES = 30;

export async function calculateFreshnessScore(lotId: string) {
  const coldTelemetry = await prisma.telemetry.findMany({
    where: {
      lotId: lotId,
      kind: 'cold',
      temp: { not: null },
    },
    orderBy: {
      ts: 'asc',
    },
  });

  if (coldTelemetry.length === 0) return;

  let inBandCount = 0;
  let continuousBreach = false;
  let breachStartTime: Date | null = null;

  for (const record of coldTelemetry) {
    const temp = record.temp!;
    if (temp >= SAFE_MIN_TEMP && temp <= SAFE_MAX_TEMP) {
      inBandCount++;
      breachStartTime = null; // Reset breach timer
    } else {
      // Temp is out of band
      if (!breachStartTime) {
        breachStartTime = record.ts;
      }
      const breachDuration = (record.ts.getTime() - breachStartTime.getTime()) / (1000 * 60);
      if (breachDuration >= BREACH_DURATION_MINUTES) {
        continuousBreach = true;
      }
    }
  }

  const totalSamples = coldTelemetry.length;
  const inBandPercentage = totalSamples > 0 ? (inBandCount / totalSamples) * 100 : 100;
  
  let freshness = 'A';
  if (continuousBreach) {
    freshness = 'E';
  } else if (inBandPercentage < 80) {
    freshness = 'D';
  } else if (inBandPercentage < 90) {
    freshness = 'C';
  } else if (inBandPercentage < 95) {
    freshness = 'B';
  }

  const breaches = totalSamples - inBandCount;

  await prisma.score.upsert({
    where: { lotId },
    update: { freshness, breaches, lastUpdated: new Date() },
    create: { lotId, freshness, breaches },
  });
}