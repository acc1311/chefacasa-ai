# ChefAcasă PRO v3

## Funcții noi

### 🛒 Cumpărături inteligente
Ingredientele generate automat din meniul săptămânal sunt comparate cu inventarul local. Produsele deja existente în frigider/cămară nu mai sunt cerute în lista de cumpărături.

### ⏰ Ce expiră azi
Produsele cu data curentă sau o dată trecută sunt evidențiate separat. Butonul „Găsește rețete” pune automat aceste produse în căutarea principală.

### 🤖 Meniu săptămânal AI
Generatorul folosește:
- inventarul local și cantitățile declarate;
- produsele care expiră azi sau curând;
- alergenii;
- dieta aleasă;
- bugetul zilnic;
- baza de rețete disponibilă local.

AI-ul întoarce un JSON strict cu 7 zile. Planul existent este înlocuit numai după validarea tuturor celor 7 rețete.

## Compatibilitate
Funcțiile noi sunt adăugate peste aplicația existentă. `ChefAcasaCore` expune intern doar operațiile necesare pentru plan și lista de cumpărături, fără date de autentificare sau chei API.

## PRO v3 — contabilitate cantitativă
Inventarul folosește acum `amount + unit` și migrează automat datele v2. Lista de cumpărături calculează necesarul din rețetele planificate și scade cantitatea disponibilă în stoc atunci când unitățile sunt compatibile.

Exemplu: rețeta cere `1500 g pui`, inventarul are `700 g` → lista va cere `800 g pui`.

Pentru ingredientele fără cantitate sau cu unități incompatibile, aplicația nu inventează valori; păstrează ingredientul ca necesar necontabilizat.
