// Borderplan 3D server
// Leest foto's van een getekend beplantingsplan + plantenlijst uit met Claude, en zoekt plantgegevens op.
// De API-sleutel blijft op de server; de app praat alleen met deze twee routes:
//   POST /api/plan    { images: [{ media_type, data(base64) }] }  -> { plants, outline, zones, north }
//   POST /api/plants  { plants: [{ nr, label }] }                 -> { "<nr>": { name, form, h, w, leaf, ... } }
import http from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { PROMPT_PLAN, promptPlants } from "../src/prompts.mjs";

const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.BORDERPLAN_MODEL || "claude-opus-5-5";
const ORIGINS = (process.env.ALLOWED_ORIGINS || "capacitor://localhost,https://localhost,http://localhost:5173").split(",").map((s) => s.trim());
const MAX_BODY = 20 * 1024 * 1024;
const MAX_IMAGES = 6;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const client = new Anthropic(); // leest ANTHROPIC_API_KEY uit de omgeving

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Eenvoudige limiet per IP: 10 verzoeken per 10 minuten
const hits = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (list.length >= 10) throw new HttpError(429, "Te veel verzoeken, probeer het later opnieuw.");
  list.push(now);
  hits.set(ip, list);
}

async function askJson(content) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    output_config: { effort: "high" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [{ role: "user", content }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new HttpError(422, "Claude kon dit verzoek niet uitvoeren.");
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const start = text.search(/[\[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start < 0 || end < start) throw new HttpError(422, "Geen bruikbaar resultaat.");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new HttpError(422, "Geen bruikbaar resultaat.");
  }
}

async function handlePlan(body) {
  const images = Array.isArray(body.images) ? body.images : [];
  if (!images.length) throw new HttpError(400, "Geen foto's ontvangen.");
  if (images.length > MAX_IMAGES) throw new HttpError(413, `Maximaal ${MAX_IMAGES} foto's.`);
  const content = images.map((img) => {
    if (!IMAGE_TYPES.has(img.media_type) || typeof img.data !== "string") throw new HttpError(413, "Onbekend fotoformaat.");
    return { type: "image", source: { type: "base64", media_type: img.media_type, data: img.data } };
  });
  content.push({ type: "text", text: PROMPT_PLAN });
  return askJson(content);
}

async function handlePlants(body) {
  const list = (Array.isArray(body.plants) ? body.plants : [])
    .slice(0, 80)
    .map((p) => ({ nr: Number(p.nr) || 0, label: String(p.label || "").slice(0, 120) }))
    .filter((p) => p.nr && p.label);
  if (!list.length) return {};
  return askJson([{ type: "text", text: promptPlants(list) }]);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new HttpError(413, "Te groot.")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch { reject(new HttpError(400, "Ongeldige JSON.")); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
  if (req.method === "GET" && req.url === "/health") { res.writeHead(200).end("ok"); return; }
  try {
    if (req.method !== "POST" || !["/api/plan", "/api/plants"].includes(req.url)) throw new HttpError(404, "Niet gevonden.");
    rateLimit(req.socket.remoteAddress || "?");
    const body = await readBody(req);
    const out = req.url === "/api/plan" ? await handlePlan(body) : await handlePlants(body);
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(out));
  } catch (err) {
    let status = 500;
    let message = "Er ging iets mis.";
    if (err instanceof HttpError) { status = err.status; message = err.message; }
    else if (err instanceof Anthropic.RateLimitError) { status = 429; message = "Claude is even druk, probeer het later opnieuw."; }
    else if (err instanceof Anthropic.BadRequestError) { status = 413; message = "Claude accepteerde de foto's niet."; }
    else if (err instanceof Anthropic.APIError) { status = 502; message = "Claude is tijdelijk niet bereikbaar."; }
    if (status >= 500) console.error(err);
    res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify({ error: message }));
  }
});

server.listen(PORT, () => console.log(`Borderplan-server luistert op poort ${PORT} (model ${MODEL})`));
