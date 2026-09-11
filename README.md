# ChefAcasă PRO

Versiune PRO incrementală peste aplicația existentă.

## Noutăți PRO v3
- inventar cu cantități reale și unități normalizate (g/kg/ml/l/buc etc.)
- migrare automată a inventarului PRO v2 către modelul cantitativ
- scădere cantitativă la lista de cumpărături: necesar − stoc = de cumpărat
- agregare a ingredientelor repetate din meniul săptămânal
- parser pentru cantități din ingrediente (`500g`, `1 kg`, `4 ouă`, `2 linguri` etc.)
- service worker actualizat la cache v3 și include `pro.js`

## Noutăți PRO v2
- Frigider / cămară locală în IndexedDB
- lista de cumpărături scade automat ingredientele deja existente în frigider
- secțiune „Ce expiră azi”
- meniu săptămânal AI pe baza stocului, alergenilor, dietei și bugetului

## Noutăți PRO
- Frigider / cămară locală în IndexedDB
- cantități și termene de expirare
- indicator pentru produse care expiră curând
- recomandări locale pe baza ingredientelor existente
- profil alimentar: dietă + alergeni + buget zilnic
- context AI personalizat + generator de meniu săptămânal
- proxy Cloudflare cu Origin restriction și headere de securitate

## Structură
- `app.js` — aplicația existentă
- `pro.js` — stratul PRO izolat
- `recipes-ro.js` — rețete locale
- `cloudflare-worker.js` — proxy AI
- `sw.js` — PWA offline

---

# ChefAcasă PRO

Versiune incrementală: păstrează aplicația existentă și adaugă un strat PRO pentru inventar și profil alimentar.

## Noutăți
- Frigider / cămară în IndexedDB
- cantități și termene de expirare
- indicator produse care expiră curând
- recomandări locale bazate pe ingredientele din inventar
- profil dietă + alergeni
- bază pentru context AI personalizat
- worker Cloudflare cu Origin restriction + headers de securitate

## Structură
- `app.js` — aplicația existentă
- `pro.js` — funcționalități PRO izolate
- `cloudflare-worker.js` — proxy AI
- `sw.js` — PWA offline
<div align="center">

# 🍳 ChefAcasă / HomeChef

**Rețete după ingredientele din frigider + asistent AI — fără cont, fără server.**
**Recipes from your fridge ingredients + AI assistant — no account, no server.**

[🇬🇧 English](#-english) · [🇷🇴 Română](#-română) · [🚀 Live Demo](https://acc1311.github.io/chefacasa-ai/)

![Static](https://img.shields.io/badge/100%25-static_HTML_CSS_JS-orange)
![Backend](https://img.shields.io/badge/backend-none_needed-green)
![PWA](https://img.shields.io/badge/PWA-installable-blue)
![Pages](https://img.shields.io/badge/hosting-GitHub_Pages-lightgrey)
![Lang](https://img.shields.io/badge/lang-RO_%2B_EN-red)

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
| `app.js` | all logic (search, AI, planner, PWA glue) |
| `recipes-ro.js` | built-in Romanian recipe base (offline) |
| `cloudflare-worker.js` | optional free AI proxy (Cloudflare Workers) |
| `manifest.json`, `icon-*.png`, `sw.js` | PWA install + offline cache |

All personal data (favorites, menu, lists, recipes, keys) stays in **your browser**
(`localStorage`). **Never commit API keys** — the repo contains none.

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
| `app.js` | toată logica (căutare, AI, meniu, PWA) |
| `recipes-ro.js` | baza de rețete românești (offline) |
| `cloudflare-worker.js` | proxy AI opțional gratuit (Cloudflare Workers) |
| `manifest.json`, `icon-*.png`, `sw.js` | instalare PWA + cache offline |

Toate datele tale (favorite, meniu, liste, rețete, chei) rămân **în browserul tău**
(`localStorage`). **Nu publica niciodată chei API** — repo-ul nu conține niciuna.

---

<div align="center">Poftă bună! 🍲 Enjoy your meal!</div>
