import { NextRequest, NextResponse } from "next/server";
import { ensureLot, lotPaths, appendJSONL } from "../_lib/fsdb";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs"; // we need fs

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const lotId = String(form.get("lotId") || "UNKNOWN");
  await ensureLot(lotId);
  const lp = lotPaths(lotId);

  const type = String(form.get("type") || "PASS");
  const meta = String(form.get("meta") || "");
  const file = form.get("photo") as File | null;

  let photoUrl: string | undefined;
  if (file) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const ts = Date.now();
    const fileName = `${ts}.jpg`;
    const outPath = path.join(lp.photos, fileName);
    await fs.writeFile(outPath, bytes);
    photoUrl = `/data/${lotId}/photos/${fileName}`;
  }

  const ev = { lotId, type, meta, photoUrl, ts: new Date().toISOString() };
  await appendJSONL(lp.events, ev);

  return NextResponse.json({ ok: true, photoUrl, event: ev });
}
