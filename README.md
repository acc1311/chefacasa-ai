# 🍳 ChefAcasă — Rețete după ingrediente + Asistent AI

Site: scrie 2-3 ingrediente din frigider → primești rețete (bază locală + TheMealDB),
calorii estimate, traducere EN→RO, mod gătire cu timer, meniu săptămânal,
listă de cumpărături pe raioane, rețetele tale, chat cu asistent AI.

## ▶️ Demo local
Deschide `index.html` sau rulează `start.bat` → http://localhost:8000

## 🌍 Publicare pe GitHub Pages
1. Repo nou pe GitHub (Public pe planul gratuit).
2. Uploadează **conținutul** acestui folder (index.html, app.js, ...) la rădăcina repo-ului.
3. Settings → Pages → Deploy from a branch → `main` → `/(root)` → Save.
4. Așteaptă 1-2 min → site-ul e la `https://<user>.github.io/<repo>/`.

## 🔑 Chei API (importante!)
Repo-ul NU conține chei. Două variante pentru chat:
- **A. Proxy Cloudflare (recomandat, chat instant pentru toți):**
  1. Cont gratuit pe https://dash.cloudflare.com/sign-up
  2. Workers & Pages → Create → Create Worker → Deploy.
  3. Edit code → lipește `cloudflare-worker.js` → Deploy.
  4. Settings → Variables and Secrets → Add Secret `OPENROUTER_KEY` = cheia ta
     (de pe https://openrouter.ai/keys) → Deploy.
  5. Copiază URL-ul worker-ului în `app.js` la `DEFAULT_PROXY_URL`
     (sau în ⚙️ Setări → Proxy) → re-uploadează pe GitHub.
- **B. Cheie proprie:** fiecare vizitator își pune cheia lui în ⚙️ Setări.
- Fără cheie merg oricum: rețetele, traducerea, lista, iar chatul are fallback local.

**Nu commita niciodată chei în repo.**
