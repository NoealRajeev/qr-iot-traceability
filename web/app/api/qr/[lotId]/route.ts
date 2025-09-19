import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import QRCode from "qrcode";

export async function GET(
  _: NextRequest,
  { params }: { params: { lotId: string } }
) {
  const lotId = params.lotId;
  const url = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/p/${lotId}`;
  const png = await QRCode.toBuffer(url, { margin: 1, width: 512 });
  const outDir = path.join(process.cwd(), "public", "qr");
  await fs.mkdir(outDir, { recursive: true });
  const out = path.join(outDir, `${lotId}.png`);
  await fs.writeFile(out, png);
  return new NextResponse(png, { headers: { "Content-Type": "image/png" } });
}
