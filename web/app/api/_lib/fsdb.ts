import { promises as fs } from "fs";
import path from "path";

const PUB = path.join(process.cwd(), "public");
const DATA = path.join(PUB, "data");

export async function ensureLot(lotId: string) {
  const base = path.join(DATA, lotId);
  const photos = path.join(base, "photos");
  await fs.mkdir(photos, { recursive: true });
  // seed files if missing
  for (const f of [
    "events.jsonl",
    "line_env.jsonl",
    "cold.jsonl",
    "meta.json",
  ]) {
    const fp = path.join(base, f);
    try {
      await fs.access(fp);
    } catch {
      await fs.writeFile(fp, f.endsWith(".jsonl") ? "" : "{}");
    }
  }
  return { base, photos };
}

export async function appendJSONL(filePath: string, obj: any) {
  await fs.appendFile(filePath, JSON.stringify(obj) + "\n");
}

export async function readJSONL(filePath: string, limit?: number) {
  const raw = await fs.readFile(filePath, "utf8").catch(() => "");
  const lines = raw.trim() ? raw.trim().split("\n") : [];
  const parsed = lines
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as any[];
  return limit ? parsed.slice(-limit) : parsed;
}

export async function writeJSON(filePath: string, obj: any) {
  await fs.writeFile(filePath, JSON.stringify(obj, null, 2));
}

export async function readJSON<T = any>(
  filePath: string,
  fallback: any = {}
): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export function lotPaths(lotId: string) {
  const base = path.join(DATA, lotId);
  return {
    base,
    meta: path.join(base, "meta.json"),
    events: path.join(base, "events.jsonl"),
    lineEnv: path.join(base, "line_env.jsonl"),
    cold: path.join(base, "cold.jsonl"),
    photos: path.join(base, "photos"),
  };
}
