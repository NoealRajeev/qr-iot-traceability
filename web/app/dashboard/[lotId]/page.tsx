"use client";

import { useEffect, useMemo, useRef, useState } from "react";

async function fetchLot(lotId: string) {
  const r = await fetch(`/api/lot/${lotId}`, { cache: "no-store" });
  return r.json();
}

export default function Dashboard({ params }: { params: { lotId: string } }) {
  const { lotId } = params;
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<any>(null);
  const sim = useRef<any>(null);

  const capture = async () => {
    setBusy(true);
    await fetch(`/api/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lotId,
        pir: 1,
        dist: (Math.random() * 5 + 8).toFixed(1),
      }),
    });
    setBusy(false);
    // poll once after a moment to show the image
    setTimeout(load, 1200);
  };

  const load = async () => {
    const d = await fetchLot(lotId);
    setData(d);
  };

  // live refresh
  useEffect(() => {
    load();
    timer.current = setInterval(load, 4000);
    return () => clearInterval(timer.current);
  }, [lotId]);

  // very light telemetry simulator (mimics NodeMCU shapes)
  useEffect(() => {
    sim.current = setInterval(async () => {
      // env
      const baseT = 26,
        baseH = 60;
      const envT = +(baseT + (Math.random() * 2 - 1)).toFixed(1);
      const envH = +(baseH + (Math.random() * 5 - 2.5)).toFixed(1);
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotId,
          type: "line_env",
          temp: envT,
          hum: envH,
        }),
      });
      // cold
      const coldBase = 5.0 + (Math.random() * 0.8 - 0.4);
      await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotId,
          type: "cold",
          temp: +coldBase.toFixed(1),
        }),
      });
    }, 5000);
    return () => clearInterval(sim.current);
  }, [lotId]);

  const env = data?.latest?.env;
  const cold = data?.latest?.cold;

  const coldSeries = data?.charts?.cold ?? [];
  const envSeries = data?.charts?.env ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard — Lot {lotId}</h1>
        <button
          onClick={capture}
          disabled={busy}
          className="rounded bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm disabled:opacity-60"
        >
          {busy ? "Capturing…" : "Capture Image"}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="col-span-2 rounded border border-zinc-800 p-3">
          <h2 className="font-medium mb-2">Last Capture</h2>
          {data?.lastPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.lastPhoto}
              alt="last capture"
              className="w-full rounded-md object-cover"
            />
          ) : (
            <p className="text-sm text-zinc-400">
              No image yet. Click “Capture Image”.
            </p>
          )}
        </div>
        <div className="rounded border border-zinc-800 p-3 space-y-2">
          <h2 className="font-medium mb-2">Live Telemetry</h2>
          <div className="text-sm">
            Ambient: <b>{env?.temp ?? "—"}°C</b>, <b>{env?.hum ?? "—"}%</b>
          </div>
          <div className="text-sm">
            Cold box: <b>{cold?.temp ?? "—"}°C</b>
          </div>
          <div className="text-sm">
            Freshness: <b>{data?.freshness?.grade ?? "N/A"}</b>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <MiniChart
          title="Cold Temperature (last 60)"
          data={coldSeries.map((d: any) => d.temp)}
          min={0}
          max={12}
        />
        <MiniChart
          title="Ambient Temp (last 60)"
          data={envSeries.map((d: any) => d.temp)}
          min={20}
          max={35}
        />
      </div>

      <div className="rounded border border-zinc-800 p-3">
        <h2 className="font-medium mb-2">Recent Events</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-400">
              <th className="text-left py-1">Time</th>
              <th className="text-left">Type</th>
              <th className="text-left">Meta</th>
              <th className="text-left">Photo</th>
            </tr>
          </thead>
          <tbody>
            {(data?.events ?? []).reverse().map((e: any, i: number) => (
              <tr key={i} className="border-t border-zinc-800">
                <td className="py-1">{new Date(e.ts).toLocaleString()}</td>
                <td>{e.type}</td>
                <td>{e.meta ?? ""}</td>
                <td>
                  {e.photoUrl ? (
                    <a
                      className="text-emerald-400 hover:underline"
                      href={e.photoUrl}
                      target="_blank"
                    >
                      open
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniChart({
  title,
  data,
  min,
  max,
}: {
  title: string;
  data: number[];
  min: number;
  max: number;
}) {
  const w = 520,
    h = 140,
    pad = 20;
  const pts = data
    .map((v, i) => {
      const x = pad + (i / Math.max(1, data.length - 1)) * (w - 2 * pad);
      const y = pad + (1 - (v - min) / (max - min)) * (h - 2 * pad);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <div className="rounded border border-zinc-800 p-3">
      <div className="text-sm mb-2">{title}</div>
      <svg width={w} height={h}>
        <rect
          x="0"
          y="0"
          width={w}
          height={h}
          fill="#0a0a0a"
          stroke="#27272a"
        />
        {data.length > 1 && (
          <polyline points={pts} fill="none" stroke="#22c55e" strokeWidth="2" />
        )}
      </svg>
    </div>
  );
}
