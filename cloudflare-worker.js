// ============================================================
// ChefAcasă — AI Proxy pentru Cloudflare Workers (plan GRATUIT)
// Rol: tine cheia OpenRouter SECRETA (in variabila de mediu),
//      iar site-ul public vorbeste cu acest worker.
//      Chatul merge INSTANT pentru toti vizitatorii, fara cheie.
//
// INSTALARE (10 minute, o singura data):
//  1. Cont gratuit pe https://dash.cloudflare.com/sign-up
//  2. Stanga: "Workers & Pages" -> "Create" -> "Create Worker"
//     -> (nume ex: chefacasa-ai) -> "Deploy" (codul default e ok momentan)
//  3. Pe pagina worker-ului: "Edit code" (sau "Code" -> "Edit code") ->
//     sterge tot, lipeste continutul ACESTUI fisier -> "Deploy".
//  4. "Settings" (tab) -> "Variables and Secrets" -> "Add" ->
//     Type: Secret, Name: OPENROUTER_KEY,
//     Value: cheia ta sk-or-v1-... (de pe https://openrouter.ai/keys) -> "Deploy".
//  5. Copiaza URL-ul worker-ului (ex: https://chefacasa-ai.maria.workers.dev)
//  6. In aplicatie (app.js): DEFAULT_PROXY_URL = "https://...workers.dev"
//     (sau in ⚙️ Setari -> Proxy Cloudflare) -> re-uploadeaza pe GitHub.
//  7. Testeaza: ⚙️ -> 🔌 Testează (trebuie ✅ Proxy).
//
// SECURITATE:
//  - Bifeaza in worker doar modele :free (lista de mai jos).
//  - Daca cineva abuzeaza URL-ul: schimbi cheia / pui Allowed Origin
//    doar pe domeniul tau (vezi ALLOWED_ORIGIN mai jos).
// ============================================================

// SCHIMBA cu domeniul site-ului tau dupa publicare, ex: "https://maria.github.io"
// Cat e "*" raspunde oricarui site (ok pentru inceput, mai putin strict).
const ALLOWED_ORIGIN = "*";

// Modele OpenRouter gratuite incercate in ordine (primele 8 / request).
const FREE_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nex-agi/nex-n2.5-pro:free",
  "nex-agi/nex-n2.5-mini:free",
  "liquid/lfm-2.5-2.6b:free",
  "poolside/laguna-s-2.1:free",
  "thinkingmachines/inkling-small:free",
  "cohere/north-mini-code:free"
];

// Protectie anti-abuz: max 20 requesturi / minut / IP (memorie locala worker-ului).
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 2000) hits.clear();
  return arr.length > 20;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health")
      return json({ ok: true, service: "chefacasa-ai-proxy" });
    if (request.method !== "POST" || url.pathname !== "/chat")
      return json({ error: "Foloseste POST /chat cu {messages:[...]}" }, 404);

    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    if (rateLimited(ip)) return json({ error: "Prea multe cereri. Așteaptă 1 minut." }, 429);

    let body;
    try { body = await request.json(); } catch (e) { body = {}; }
    const messages = Array.isArray(body.messages) ? body.messages.slice(-10) : null;
    if (!messages || !messages.length) return json({ error: "Lipsesc messages." }, 400);
    const clean = messages
      .filter(m => m && (m.role === "user" || m.role === "assistant" || m.role === "system") && typeof m.content === "string")
      .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
    if (!clean.length) return json({ error: "Mesaje invalide." }, 400);
    const maxTokens = Math.min(900, Math.max(50, +body.max_tokens || 800));
    const debug = url.searchParams.get("debug") === "1";
    const trace = { hasKey: !!env.OPENROUTER_KEY, openrouterTried: 0, openrouterLast: "", pollinations: "skip" };

    // 1) OpenRouter cu cheia secreta (doar modele :free)
    if (env.OPENROUTER_KEY) {
      const wanted = typeof body.model === "string" && body.model.endsWith(":free") ? [body.model] : [];
      const models = [...new Set([...wanted, ...FREE_MODELS])].slice(0, 8);
      for (const model of models) {
        trace.openrouterTried++;
        try {
          const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": "Bearer " + env.OPENROUTER_KEY, "Content-Type": "application/json", "HTTP-Referer": "https://chefacasa.pages.dev/", "X-Title": "ChefAcasa" },
            body: JSON.stringify({ model, messages: clean, temperature: 0.7, max_tokens: maxTokens })
          });
          const d = await r.json();
          if (!d.error) {
            const m = (d.choices && d.choices[0] && d.choices[0].message) || {};
            const ans = (m.content || m.reasoning || "").trim();
            if (ans) return json({ reply: ans, via: "openrouter:" + model });
          } else trace.openrouterLast = (d.error.message || JSON.stringify(d.error)).slice(0, 160);
        } catch (e) { trace.openrouterLast = String(e).slice(0, 160); }
      }
    }

    // 2) Fallback Pollinations (fara cheie, nelimitat)
    try {
      const r = await fetch("https://text.pollinations.ai/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openai", messages: clean, temperature: 0.7, max_tokens: maxTokens })
      });
      const d = await r.json();
      const m = (d.choices && d.choices[0] && d.choices[0].message) || {};
      const ans = (m.content || m.reasoning || "").trim();
      if (ans) return json({ reply: ans, via: "pollinations" });
      trace.pollinations = "raspuns gol";
    } catch (e) { trace.pollinations = String(e).slice(0, 160); }

    const err = { error: "Toate modelele sunt aglomerate momentan. Încearcă peste 1-2 minute." };
    if (debug) err.debug = trace; // NU contine cheia, doar diagnosticare
    return json(err, 503);
  }
};
