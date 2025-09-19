import { NextRequest, NextResponse } from "next/server";

// change this IP if your cam changes
const CAM_HOST = "http://10.36.70.200";

export async function POST(req: NextRequest) {
  const { lotId, pir = 1, dist = 11.8 } = await req.json();
  const url = `${CAM_HOST}/capture?lot=${encodeURIComponent(
    lotId
  )}&pir=${pir}&dist=${dist}`;
  try {
    const r = await fetch(url, { method: "GET" });
    const txt = await r.text();
    return NextResponse.json({ ok: r.ok, status: r.status, body: txt });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
