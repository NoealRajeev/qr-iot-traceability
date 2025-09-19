import { NextRequest, NextResponse } from "next/server";
import { ensureLot, lotPaths, readJSON, readJSONL } from "../../_lib/fsdb";
import path from "path";

export const runtime = "nodejs";

function calcFreshness(cold: any[]) {
  if (!cold.length) return { grade: "N/A", breaches: 0 };
  const safeMin = 2,
    safeMax = 8;
  const inBand = cold.filter(
    (r) => typeof r.temp === "number" && r.temp >= safeMin && r.temp <= safeMax
  ).length;
  const pct = (inBand / cold.length) * 100;
  let grade = "A";
  if (pct < 95) grade = "B";
  if (pct < 90) grade = "C";
  if (pct < 80) grade = "D";
  const breaches = cold.filter(
    (r) => r.temp < safeMin || r.temp > safeMax
  ).length;
  return { grade, breaches, pct: Math.round(pct) };
}

export async function GET(
  _: NextRequest,
  { params }: { params: { lotId: string } }
) {
  const lotId = params.lotId;
  await ensureLot(lotId);
  const lp = lotPaths(lotId);

  const meta = await readJSON(lp.meta, {
    lotId,
    product: "Demo Product",
    exp: "2025-12-31",
  });
  const events = await readJSONL(lp.events, 100);
  const lineEnv = await readJSONL(lp.lineEnv, 200);
  const cold = await readJSONL(lp.cold, 200);

  // last photo
  const lastPhoto = [...events]
    .reverse()
    .find((e: any) => e.photoUrl)?.photoUrl;

  const freshness = calcFreshness(cold);

  return NextResponse.json({
    lotId,
    meta,
    lastPhoto,
    events: events.slice(-20),
    latest: {
      env: lineEnv.length ? lineEnv[lineEnv.length - 1] : null,
      cold: cold.length ? cold[cold.length - 1] : null,
    },
    charts: {
      env: lineEnv.slice(-60),
      cold: cold.slice(-60),
    },
    freshness,
  });
}
