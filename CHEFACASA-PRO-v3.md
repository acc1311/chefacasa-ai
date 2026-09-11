# ChefAcasă PRO v3

## Ce aduce

- Inventar cantitativ: `amount + unit` în IndexedDB.
- Migrare automată din formatul PRO v2 (`qty` / `qtyText`).
- Unități normalizate: g, kg, ml, l, buc, lingură, linguriță, cană.
- Parser pentru linii de ingrediente precum `500g pulpe de pui`, `1 kg cartofi`, `4 ouă`, `2 linguri ulei`, `50ml ulei`.
- Cumpărături calculate cantitativ când unitățile sunt compatibile.
- Ingredientele repetate din meniul săptămânal sunt agregate.
- Exemplu: necesar 1.5 kg + stoc 700 g => cumpără 800 g.
- Ingredientele fără cantitate rămân necontabilizate, fără presupuneri artificiale.
- Service Worker cache v3 include `pro.js`.

## Compatibilitate
Versiunea păstrează `ChefAcasaCore` și datele existente. Inventarul v2 este migrat la prima pornire.

## Ce urmează în PRO v4
- deduplicare mai bună a denumirilor (`piept/pulpe/pui`)
- consum explicit din inventar după gătire
- cost real pe ingredient
- cantități pe porții și multiplicare automată
