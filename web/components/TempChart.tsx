'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  ts: string;
  temp?: number | null;
  hum?: number | null;
}

export default function TempChart({ data }: { data: ChartData[] }) {
  const formattedData = data.map(d => ({
    ...d,
    time: new Date(d.ts).toLocaleTimeString(),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        <Legend />
        {data[0]?.temp !== undefined && <Line type="monotone" dataKey="temp" name="Temperature (°C)" stroke="#ef4444" />}
        {data[0]?.hum !== undefined && <Line type="monotone" dataKey="hum" name="Humidity (%)" stroke="#3b82f6" />}
      </LineChart>
    </ResponsiveContainer>
  );
}