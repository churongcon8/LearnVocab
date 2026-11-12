// API lưu tiến độ học theo tên tài khoản (Netlify Functions + Netlify Blobs)
//   GET  /api/progress?name=TEN   -> { progress: {...} | null }
//   POST /api/progress            -> body { name, progress } : gộp với dữ liệu đã lưu, trả về { progress } đã gộp
// Dữ liệu nằm trong kho Blobs tên "Default", mỗi tên tài khoản là một mục.
import { getStore } from "@netlify/blobs";

const STORE_NAME = "Default";
const MAX_NAME = 60;
const MAX_WORDS = 50000;
const MAX_BODY = 2000000; // ~2MB
const BAD_KEYS = ["__proto__", "constructor", "prototype"];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function normName(n) {
  return String(n == null ? "" : n).normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
}
function keyFor(norm) {
  return "acc:" + encodeURIComponent(norm);
}

function cleanWords(a) {
  if (!Array.isArray(a)) return [];
  const seen = new Set();
  const out = [];
  for (const w of a) {
    if (typeof w !== "string") continue;
    const s = w.slice(0, 200);
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= MAX_WORDS) break;
  }
  return out;
}
function num(x) {
  return typeof x === "number" && Number.isFinite(x) ? x : 0;
}
function cleanProgress(p) {
  const out = { topics: {}, updated_at: num(p && p.updated_at) };
  const t = p && typeof p.topics === "object" && p.topics ? p.topics : {};
  for (const id of Object.keys(t).slice(0, 300)) {
    if (BAD_KEYS.includes(id)) continue;
    const v = t[id] || {};
    out.topics[id] = {
      completed_words: cleanWords(v.completed_words),
      wrong_words: cleanWords(v.wrong_words),
      updated_at: num(v.updated_at),
    };
  }
  return out;
}

// Từ đã học: hợp của 2 bên (không bao giờ mất). Từ sai: lấy theo bên mới hơn.
function mergeTopic(a, b) {
  a = a || {};
  b = b || {};
  const comp = new Set([...(a.completed_words || []), ...(b.completed_words || [])]);
  const newer = num(b.updated_at) > num(a.updated_at) ? b : a;
  return {
    completed_words: [...comp],
    wrong_words: [...(newer.wrong_words || [])],
    updated_at: Math.max(num(a.updated_at), num(b.updated_at)),
  };
}
function mergeProgress(a, b) {
  const ta = (a && a.topics) || {};
  const tb = (b && b.topics) || {};
  const out = { topics: {}, updated_at: Math.max(num(a && a.updated_at), num(b && b.updated_at)) };
  for (const id of [...Object.keys(ta), ...Object.keys(tb)]) {
    if (BAD_KEYS.includes(id) || Object.prototype.hasOwnProperty.call(out.topics, id)) continue;
    out.topics[id] = mergeTopic(ta[id], tb[id]);
  }
  return out;
}

export default async (req) => {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });

  try {
    if (req.method === "GET") {
      const name = normName(new URL(req.url).searchParams.get("name"));
      if (!name || name.length > MAX_NAME) return json({ error: "Tên tài khoản không hợp lệ" }, 400);
      const rec = await store.get(keyFor(name), { type: "json" });
      return json({ progress: rec && rec.progress ? rec.progress : null });
    }

    if (req.method === "POST") {
      const len = Number(req.headers.get("content-length") || 0);
      if (len > MAX_BODY) return json({ error: "Dữ liệu quá lớn" }, 413);
      const text = await req.text();
      if (text.length > MAX_BODY) return json({ error: "Dữ liệu quá lớn" }, 413);

      let body;
      try { body = JSON.parse(text); } catch (e) { return json({ error: "JSON không hợp lệ" }, 400); }

      const display = String((body && body.name) || "").replace(/\s+/g, " ").trim();
      const name = normName(display);
      if (!name || name.length > MAX_NAME) return json({ error: "Tên tài khoản không hợp lệ" }, 400);

      const incoming = cleanProgress(body && body.progress);
      const key = keyFor(name);
      const rec = await store.get(key, { type: "json" });
      const merged = rec && rec.progress ? mergeProgress(cleanProgress(rec.progress), incoming) : incoming;

      await store.setJSON(key, { name: display, progress: merged, updated_at: Date.now() });
      return json({ progress: merged });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ error: "Lỗi máy chủ: " + (e && e.message ? e.message : "unknown") }, 500);
  }
};

export const config = { path: "/api/progress" };
