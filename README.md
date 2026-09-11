<div align="center">

# 🍳 ChefAcasă PRO / HomeChef PRO

**Rețete după ingredientele din frigider + inventar cantitativ + asistent AI — fără cont, fără server.**
**Recipes from your fridge ingredients + quantitative pantry + AI assistant — no account, no server.**

[🇬🇧 English](#-english) · [🇷🇴 Română](#-română) · [🚀 Live Demo](https://acc1311.github.io/chefacasa-ai/)

![Static](https://img.shields.io/badge/100%25-static_HTML_CSS_JS-orange)
![Backend](https://img.shields.io/badge/backend-none_needed-green)
![PWA](https://img.shields.io/badge/PWA-installable-blue)
![Pages](https://img.shields.io/badge/hosting-GitHub_Pages-lightgrey)
![Lang](https://img.shields.io/badge/lang-RO_%2B_EN-red)
![PRO](https://img.shields.io/badge/PRO-v3-blueviolet)

</div>

---

## 🇬🇧 English

### What it does
Type 2–3 ingredients you already have → get recipes with full details:
- 🔍 Local recipe base + TheMealDB (thousands of recipes) + web search shortcuts
- 🔥 Estimated kcal per serving + 🥗 diet filters (vegetarian / vegan / gluten-free / light)
- ⚖️ Adjustable servings with auto-recalculated quantities
- 🌐 Auto EN→RO translation (free, no key) + 🔊 text-to-speech
- 🍳 Hands-free cook mode: big steps, timer with alarm, voice reading
- 📅 Weekly menu planner + 🛒 shopping list grouped by store aisles
- 📖 Your own recipes (saved in browser, included in search)
- 💬 AI chef chat with automatic fallback across models + local recipes
- 🌐 Chat language selector (RO/EN) + 😂🤬 funny & spicy reply modes
- 📲 Installable on phone (PWA, works offline) · ⬇️⬆️ JSON backup/restore

### ⭐ PRO features (new in v3)
- 🧊 **Quantitative pantry inventory** (IndexedDB): every product stored as
  `amount + unit`, with expiry dates. v2 inventories migrate automatically on first start.
- 🛒 **Smart shopping = need − stock:** the weekly menu's needs are aggregated and
  the stock on hand is subtracted whenever units are compatible.
  Example: recipe needs `1500 g chicken`, stock has `700 g` → list asks for `800 g chicken`.
  Ingredients without quantity (or incompatible units) stay listed as-is — never invented values.
- ⏰ **Expiring today:** products expiring now are highlighted separately, and one tap
  pushes them into the main search so nothing goes to waste.
- 🤖 **AI weekly menu** built from real stock + quantities, allergens, chosen diet,
  daily budget and the local recipe base. The AI returns a strict 7-day JSON and the
  existing plan is replaced only after all 7 recipes validate.
- 🔢 **Ingredient parser** (`500g`, `1 kg`, `4 eggs`, `2 tbsp`, `50ml`…) with normalized
  units (g / kg / ml / l / pcs / tbsp / tsp / cup).
- 📴 Service Worker cache v3 (includes `pro.js`) — pantry and recipes work offline.

### PRO v2 / v1 (already included)
- Fridge / pantry in IndexedDB, quantities + expiry dates, soon-to-expire indicator
- Shopping list skips what you already have; local recommendations from stock
- Food profile: diet + allergens + daily budget; personalized AI context
- Cloudflare proxy with Origin restriction + security headers

### 🔜 Roadmap (PRO v4)
- Smarter name dedup (`piept / pulpe / pui`)
- Explicit "consume from stock" after cooking
- Real cost per ingredient · per-serving quantities with auto-scaling

### Try it
**Live:** https://acc1311.github.io/chefacasa-ai/ · **Local:** open `index.html`
(or run `start.bat` → http://localhost:8000 — recommended, enables PWA + AI).

### Publish your own copy (free)
1. Upload this folder's **contents** to a new **public** GitHub repo (root level).
2. Repo **Settings → Pages → Deploy from a branch → `main` → `/(root)`** → Save.
3. Wait 1–2 min → `https://<you>.github.io/<repo>/`.

### 🤖 AI chat options
- **A. Cloudflare proxy (recommended, instant chat for every visitor):**
  free account → Workers & Pages → Create Worker → paste `cloudflare-worker.js` →
  Deploy → Settings → Variables and Secrets → add secret `OPENROUTER_KEY`
  (from https://openrouter.ai/keys) → Deploy → put the worker URL in
  `DEFAULT_PROXY_URL` in `app.js` (or ⚙️ Settings → Proxy) → re-upload.
- **B. Own key:** each visitor pastes a free key in ⚙️ Settings.
- Without any key: recipes, translation, lists still work; chat falls back to local recipes.

### Privacy & files
| File | Role |
|---|---|
| `index.html` / `style.css` | UI + design |
| `app.js` | base app logic (search, AI, planner, PWA glue) |
| `pro.js` | isolated PRO layer (inventory, smart shopping, AI menu) |
| `recipes-ro.js` | built-in Romanian recipe base (offline) |
| `cloudflare-worker.js` | optional free AI proxy (Cloudflare Workers) |
| `manifest.json`, `icon-*.png`, `sw.js` | PWA install + offline cache |

Pantry lives in **IndexedDB**, everything else in **your browser** (`localStorage`).
**Never commit API keys** — the repo contains none.

---

## 🇷🇴 Română

### Ce face
Scrii 2-3 ingrediente pe care le ai → primești rețete complete:
- 🔍 Bază locală + TheMealDB (mii de rețete) + scurtături de căutare pe net
- 🔥 Calorii estimate/porție + 🥗 filtre dietă (vegetarian / post / fără gluten / ușor)
- ⚖️ Porții ajustabile cu recalcularea cantităților
- 🌐 Traducere automată EN→RO (gratis, fără cheie) + 🔊 citire vocală
- 🍳 Mod gătire hands-free: pași mari, timer cu alarmă, citire vocală
- 📅 Meniu săptămânal + 🛒 listă de cumpărături grupată pe raioane
- 📖 Rețetele tale (salvate în browser, incluse în căutare)
- 💬 Chat cu asistent bucătar + fallback automat pe modele + rețete locale
- 🌐 Selector limbă chat (RO/EN) + 😂🤬 mod comic & piperat (opțional)
- 📲 Se instalează pe telefon (PWA, merge offline) · ⬇️⬆️ backup/restaurare JSON

### ⭐ Funcții PRO (noutăți v3)
- 🧊 **Inventar cantitativ** (frigider/cămară în IndexedDB): fiecare produs cu
  `cantitate + unitate` și termen de expirare. Inventarul v2 migrează automat la prima pornire.
- 🛒 **Cumpărături inteligente = necesar − stoc:** necesarul din meniul săptămânal se
  adună, iar stocul existent se scade când unitățile sunt compatibile.
  Exemplu: rețeta cere `1500 g pui`, ai `700 g` → lista cere `800 g pui`.
  Ingredientele fără cantitate (sau cu unități incompatibile) rămân pe listă ca atare —
  aplicația nu inventează valori.
- ⏰ **Ce expiră azi:** produsele expirate azi sunt evidențiate separat, iar butonul
  „Găsește rețete” le pune automat în căutarea principală.
- 🤖 **Meniu săptămânal AI** din stocul real + cantități, alergeni, dieta aleasă,
  bugetul zilnic și baza locală de rețete. AI-ul întoarce un JSON strict cu 7 zile,
  iar planul existent se înlocuiește doar după validarea tuturor celor 7 rețete.
- 🔢 **Parser de ingrediente** (`500g`, `1 kg`, `4 ouă`, `2 linguri`, `50ml`…) cu unități
  normalizate (g / kg / ml / l / buc / lingură / linguriță / cană).
- 📴 Service Worker cache v3 (include `pro.js`) — inventarul și rețetele merg offline.

### PRO v2 / v1 (deja incluse)
- Frigider / cămară în IndexedDB, cantități + expirări, indicator „expiră curând”
- Lista scade automat ce ai deja; recomandări locale din stoc
- Profil alimentar: dietă + alergeni + buget zilnic; context AI personalizat
- Proxy Cloudflare cu Origin restriction + headere de securitate

### 🔜 Plan (PRO v4)
- Deduplicare mai bună a denumirilor (`piept / pulpe / pui`)
- Consum explicit din stoc după gătire
- Cost real pe ingredient · cantități pe porții cu scalare automată

### Testează
**Live:** https://acc1311.github.io/chefacasa-ai/ · **Local:** deschide `index.html`
(sau rulează `start.bat` → http://localhost:8000 — recomandat, activează PWA + AI).

### Publică copia ta (gratis)
1. Uploadează **conținutul** acestui folder într-un repo GitHub nou, **public**, la rădăcină.
2. **Settings → Pages → Deploy from a branch → `main` → `/(root)`** → Save.
3. Așteaptă 1–2 min → `https://<nume>.github.io/<repo>/`.

### 🤖 Opțiuni chat AI
- **A. Proxy Cloudflare (recomandat, chat instant pentru toți):**
  cont gratuit → Workers & Pages → Create Worker → lipește `cloudflare-worker.js` →
  Deploy → Settings → Variables and Secrets → secret `OPENROUTER_KEY`
  (de pe https://openrouter.ai/keys) → Deploy → pune URL-ul worker-ului în
  `DEFAULT_PROXY_URL` din `app.js` (sau ⚙️ Setări → Proxy) → re-uploadează.
- **B. Cheie proprie:** fiecare vizitator își pune cheia lui gratuită în ⚙️ Setări.
- Fără cheie merg oricum: rețetele, traducerea, listele; chatul răspunde cu rețete locale.

### Confidențialitate & fișiere
| Fișier | Rol |
|---|---|
| `index.html` / `style.css` | interfața + designul |
| `app.js` | logica aplicației de bază (căutare, AI, meniu, PWA) |
| `pro.js` | stratul PRO izolat (inventar, cumpărături smart, meniu AI) |
| `recipes-ro.js` | baza de rețete românești (offline) |
| `cloudflare-worker.js` | proxy AI opțional gratuit (Cloudflare Workers) |
| `manifest.json`, `icon-*.png`, `sw.js` | instalare PWA + cache offline |

Inventarul stă în **IndexedDB**, restul în **browserul tău** (`localStorage`).
**Nu publica niciodată chei API** — repo-ul nu conține niciuna.

---

<div align="center">Poftă bună! 🍲 Enjoy your meal!</div>
