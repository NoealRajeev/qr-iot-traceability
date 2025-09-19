import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper for score badge color
const getScoreColor = (score: string) => {
  switch (score) {
    case 'A': return 'bg-green-500';
    case 'B': return 'bg-yellow-400';
    case 'C': return 'bg-orange-500';
    case 'D': return 'bg-red-500';
    case 'E': return 'bg-red-700 text-white';
    default: return 'bg-gray-400';    
  }
};

async function getLotData(lotId: string) {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: {
      score: true,
      events: {
        orderBy: { ts: 'desc' },
        take: 5, // Get last 5 events
      },
    },
  });
  return lot;
}

export default async function PublicLotPage({ params }: { params: { lotId: string } }) {
  const lot = await getLotData(params.lotId);

  if (!lot) {
    return <main className="p-8"><h1 className="text-2xl">Lot Not Found</h1></main>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{lot.product}</h1>
            <p className="text-gray-500">Lot ID: {lot.id}</p>
            <p className="text-gray-500">Expires: {new Date(lot.exp).toLocaleDateString()}</p>
          </div>
          {lot.score && (
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-1">Freshness Score</p>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold ${getScoreColor(lot.score.freshness)}`}>
                {lot.score.freshness}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-700 border-b pb-2">Recent History</h2>
          <ul className="mt-4 space-y-4">
            {lot.events.map(event => (
              <li key={event.id} className="flex items-center space-x-4">
                <div className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">
                  ✓
                </div>
                <div>
                  <p className="font-medium text-gray-800">{event.type.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-500">{new Date(event.ts).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}