export const metadata = { title: "QR IoT Traceability" };
import "./globals.css";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-6xl p-4">{children}</div>
      </body>
    </html>
  );
}
