'use client';

import { useEffect, useState } from 'react';
import TempChart from '@/components/TempChart'; // Adjust path if needed

// We define the types here to avoid importing server-side code (Prisma)
interface LotData {
  id: string;
  product: string;
  exp: string;
  score: { freshness: string; breaches: number } | null;
  events: { id: string; type: string; labelOk: boolean | null; photoUrl: string | null; ts: string }[];
  telemetry: { id: string; kind: string; temp: number | null; hum: number | null; ts: string }[];
}

const getScoreColor = (score: string) => {
  // same as public page
  switch (score) {
    case 'A': return 'bg-green-500';
    case 'B': return 'bg-yellow-400';
    case 'C': return 'bg-orange-500';
    case 'D': return 'bg-red-500';
    case 'E': return 'bg-red-700 text-white';
    default: return 'bg-gray-400';
  }
};

// We need a simple API route to fetch data for this client component
// Create this in `app/api/dashboard/[lotId]/route.ts` next
async function fetchLotData(lotId: string): Promise<LotData | null> {
    const res = await fetch(`/api/dashboard/${lotId}`);
    if (!res.ok) return null;
    return res.json();
}

export default function DashboardPage({ params }: { params: { lotId: string } }) {
  const [lot, setLot] = useState<LotData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      fetchLotData(params.lotId).then(data => {
        setLot(data);
        setIsLoading(false);
      });
    };
    
    loadData();
    const interval = setInterval(loadData, 5000); // Poll for new data every 5 seconds

    return () => clearInterval(interval);
  }, [params.lotId]);

  if (isLoading) {
    return <main className="p-8">Loading dashboard...</main>;
  }

  if (!lot) {
    return <main className="p-8">Lot not found.</main>;
  }

  const lastPhoto = lot.events.find(e => e.photoUrl)?.photoUrl;

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info & Photo */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
                <h1 className="text-3xl font-bold">{lot.product}</h1>
                <p className="text-gray-500">Lot ID: {lot.id}</p>
                {lot.score && (
                    <div className={`mt-4 p-2 rounded text-center font-bold ${getScoreColor(lot.score.freshness)}`}>
                        Freshness: {lot.score.freshness} ({lot.score.breaches} breaches)
                    </div>
                )}
            </div>
            {lastPhoto && (
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-2">Last Scan Photo</h2>
                    <img src={lastPhoto} alt="Last pack scan" className="rounded-lg w-full" />
                </div>
            )}
        </div>
        
        {/* Right Column: Charts & Timeline */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">Cold-Chain Telemetry</h2>
                <TempChart data={lot.telemetry.filter(t => t.kind === 'cold')} />
            </div>
             <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">Event Timeline</h2>
                <ul className="space-y-2">
                    {lot.events.map(event => (
                        <li key={event.id} className="border-b py-2">
                            <strong>{event.type}</strong> - {new Date(event.ts).toLocaleString()}
                            {event.type === 'GATE_SCAN' && (
                                <span className={`ml-2 px-2 py-1 text-xs rounded ${event.labelOk ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                    Label {event.labelOk ? 'OK' : 'Mismatch'}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
      </div>
    </main>
  );
}