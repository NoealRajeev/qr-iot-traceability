import { NextRequest, NextResponse } from "next/server";
import { ensureLot, lotPaths, appendJSONL } from "../_lib/fsdb";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lotId = String(body.lotId || "UNKNOWN");
  const type = String(body.type || "");
  await ensureLot(lotId);
  const lp = lotPaths(lotId);

  const row = { ...body, ts: new Date().toISOString() };

  if (type === "line_env") await appendJSONL(lp.lineEnv, row);
  else if (type === "cold") await appendJSONL(lp.cold, row);
  else
    await appendJSONL(lp.events, { lotId, type: `TELEM_${type}`, ts: row.ts });

  return NextResponse.json({ ok: true });
}
