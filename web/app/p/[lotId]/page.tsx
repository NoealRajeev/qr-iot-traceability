// web/app/p/[lotId]/page.tsx
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

async function getData(baseUrl: string, lotId: string) {
  const r = await fetch(`${baseUrl}/api/lot/${encodeURIComponent(lotId)}`, {
    cache: "no-store",
  });
  if (!r.ok) return null;
  return r.json();
}

export default async function PublicLot(
  props: { params: Promise<{ lotId: string }> } // <-- params is a Promise in your Next version
) {
  const { lotId } = await props.params; // <-- await it

  // Build absolute base URL from request headers
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host")!;
  const proto = (hdrs.get("x-forwarded-proto") ??
    (process.env.VERCEL ? "https" : "http")) as "http" | "https";
  const baseUrl = `${proto}://${host}`;

  const data = await getData(baseUrl, lotId);
  if (!data) return notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">
        Product: {data?.meta?.product ?? "Food Pack"}
      </h1>
      <p>
        Lot: <b>{data.lotId}</b> &nbsp; Expiry: <b>{data?.meta?.exp}</b>
      </p>
      <p>
        Freshness grade: <b>{data.freshness?.grade}</b> (
        {data.freshness?.pct ?? "–"}% in band)
      </p>
      {data.lastPhoto && (
        <div className="relative w-full max-w-md aspect-video">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.lastPhoto}
            alt="last capture"
            className="rounded-md border border-zinc-800 object-cover w-full h-full"
          />
        </div>
      )}
      <div>
        <h2 className="font-medium mt-4 mb-1">Recent events</h2>
        <ul className="text-sm list-disc pl-5">
          {data.events.map((e: any, i: number) => (
            <li key={i}>
              {new Date(e.ts).toLocaleString()} — {e.type}
              {e.meta ? ` (${e.meta})` : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
