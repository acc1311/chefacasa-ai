/* ChefAcasă PRO v2 — inventar, expirări, cumpărături inteligente și meniu AI */
(function(){
  'use strict';
  const DB_NAME='chefacasa-pro', DB_VERSION=2, STORE='inventory', PROFILE_KEY='chef_pro_profile';
  const DAYS=['Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă','Duminică'];
  const state={inventory:[],profile:{allergens:[],diet:'',budget:0},db:null};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const uid=()=>`inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const words=s=>norm(s).split(/[^a-z0-9]+/).filter(x=>x.length>2);
  const UNIT_ALIASES={
    g:'g',gr:'g',gram:'g',grame:'g',grami:'g',kg:'kg',kilogram:'kg',kilograme:'kg',
    ml:'ml',millilitru:'ml',mililitri:'ml',l:'l',litru:'l',litri:'l',
    buc:'buc',bucata:'buc',bucati:'buc',bucată:'buc',bucăți:'buc',
    ou:'buc',oua:'buc',ouă:'buc',lingura:'lingura',linguri:'lingura',lingură:'lingura',
    lingurita:'lingurita',lingurite:'lingurita',linguriță:'lingurita',lingurițe:'lingurita',
    cana:'cana',cani:'cana',cană:'cana',căni:'cana',
    conserva:'buc',conserve:'buc',conserva:'buc',cutie:'buc',pachet:'buc',pachete:'buc'
  };
  const UNIT_TO_BASE={kg:['g',1000],g:['g',1],l:['ml',1000],ml:['ml',1],buc:['buc',1],lingura:['lingura',1],lingurita:['lingurita',1],cana:['cana',1]};
  function parseQtyText(text){
    const raw=norm(text).trim();
    const m=raw.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*([a-zăâîșț]+)?/i);
    if(!m)return {amount:null,unit:'unknown',raw:String(text||'').trim()};
    const amount=Number(String(m[1]).replace(',','.')); const unit=UNIT_ALIASES[m[2]||'buc']||'buc';
    return {amount:Number.isFinite(amount)?amount:null,unit,raw:String(text||'').trim()};
  }
  function normalizeInventoryItem(x){
    if(x.amount==null){
      const parsed=parseQtyText(x.qtyText||`${x.qty||1} buc`);
      x.amount=parsed.amount ?? (+x.qty||1); x.unit=x.unit||parsed.unit;
    }
    x.unit=x.unit||'buc'; x.amount=Number(x.amount)||0; x.qty=x.amount;
    return x;
  }
  function ingredientParts(line){
    const raw=String(line||'').trim();
    const m=raw.match(/^\s*(\d+(?:[.,]\d+)?)\s*([a-zA-ZăâîșțĂÂÎȘȚ]+)?\s+(.*)$/);
    if(!m)return {amount:null,unit:'unknown',name:raw};
    const candidate=norm(m[2]||''); const unit=UNIT_ALIASES[candidate];
    if(!unit){
      return {amount:Number(String(m[1]).replace(',','.')),unit:'buc',name:`${m[2]} ${m[3]}`.trim()};
    }
    return {amount:Number(String(m[1]).replace(',','.')),unit,name:m[3].trim()};
  }
  function unitCompatible(a,b){return a===b || (a==='kg'&&b==='g') || (a==='g'&&b==='kg') || (a==='l'&&b==='ml') || (a==='ml'&&b==='l');}
  function toBase(amount,unit){const u=UNIT_TO_BASE[unit];return u?[amount*u[1],u[0]]:[amount,unit];}
  function fromBase(amount,unit){if(unit==='g')return {amount,unit:'g'};if(unit==='ml')return {amount,unit:'ml'};return {amount,unit};}
  function ingredientKey(name){
    let n=norm(name).replace(/\b(de|din|cu|si|și|pentru|la|optional|opțional|dupa|după|gust)\b/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
    const aliases={pulpe:'pui',pulpa:'pui',piept:'pui',pulpewpui:'pui',cartofi:'cartof',cepe:'ceapa',ceapa:'ceapa',rosii:'rosie',ouale:'oua',oua:'ou'};
    const first=n.split(' ')[0]; return aliases[first]||first||n;
  }
  function formatAmount(a,u){
    if(a==null)return '';
    const n=Math.round(a*100)/100; return `${n} ${u}`;
  }
  function dateOnly(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
  function daysUntil(date){if(!date)return Infinity; const [y,m,d]=date.split('-').map(Number); const x=new Date(y,m-1,d); return Math.round((x-dateOnly())/86400000);}
  function saveProfile(){localStorage.setItem(PROFILE_KEY,JSON.stringify(state.profile));}
  function loadProfile(){try{state.profile=Object.assign(state.profile,JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}'));}catch{}}
  function openDB(){return new Promise((resolve,reject)=>{if(!window.indexedDB){reject(new Error('IndexedDB indisponibil'));return;}const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};r.onsuccess=()=>{state.db=r.result;resolve(r.result)};r.onerror=()=>reject(r.error);});}
  const tx=mode=>state.db.transaction(STORE,mode).objectStore(STORE);
  const dbGetAll=()=>new Promise((resolve,reject)=>{const r=tx('readonly').getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});
  const dbPut=item=>new Promise((resolve,reject)=>{const r=tx('readwrite').put(item);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});
  const dbDelete=id=>new Promise((resolve,reject)=>{const r=tx('readwrite').delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});
  function toastPro(msg,type){if(typeof window.toast==='function'){window.toast(msg,type);return;}const t=document.createElement('div');t.className='pro-toast '+(type||'');t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2500);}

  async function refresh(){state.inventory=(await dbGetAll()).map(normalizeInventoryItem); for(const item of state.inventory) await dbPut(item); render();renderExpiringToday();renderWeekSummary();updateBadges();}
  function updateBadges(){const n=state.inventory.filter(x=>x.qty>0).length, e=state.inventory.filter(x=>daysUntil(x.expiry)<=0).length;const b=$('fridgeCount');if(b){b.textContent=n||'';b.classList.toggle('hidden',!n);}const eb=$('expiryCount');if(eb){eb.textContent=e||'';eb.classList.toggle('hidden',!e);}}
  function render(){const box=$('inventoryGrid');if(!box)return;const q=($('inventoryFilter')?.value||'').toLowerCase();const items=state.inventory.filter(x=>(x.name+' '+(x.category||'')).toLowerCase().includes(q)).sort((a,b)=>(a.expiry||'9999').localeCompare(b.expiry||'9999'));box.innerHTML='';if(!items.length){box.innerHTML='<div class="pro-empty">🥶 <b>Frigiderul este gol</b><span>Adaugă ingredientele pe care le ai acasă.</span></div>';return;}items.forEach(x=>{const d=daysUntil(x.expiry),danger=d<=0,soon=d>0&&d<=2;const card=document.createElement('article');card.className='pro-item'+(danger?' danger':'')+(soon?' soon':'');card.innerHTML=`<div class="pro-item-main"><span class="pro-emoji">${esc(x.emoji||'🥕')}</span><div><b>${esc(x.name)}</b><div class="hint">${esc(x.qtyText||'')} ${x.expiry?`• ${danger?'⚠️ expirat':soon?'⏰ expiră curând':'📅 '+esc(x.expiry)}`:''}</div></div></div><div class="pro-item-actions"><button class="btn small" data-minus>-</button><span>${esc(formatAmount(x.amount??x.qty??1,x.unit||'buc'))}</span><button class="btn small" data-plus>+</button><button class="btn small ghost" data-del>✖</button></div>`;card.querySelector('[data-minus]').onclick=async()=>{x.amount=Math.max(0,(+x.amount||1)-1);x.qty=x.amount;if(!x.amount)await dbDelete(x.id);else {x.qtyText=formatAmount(x.amount,x.unit);await dbPut(x);}await refresh();};card.querySelector('[data-plus]').onclick=async()=>{x.amount=(+x.amount||0)+1;x.qty=x.amount;x.qtyText=formatAmount(x.amount,x.unit);await dbPut(x);await refresh();};card.querySelector('[data-del]').onclick=async()=>{await dbDelete(x.id);await refresh();};box.appendChild(card);});}
  async function addInventory(){
    const name=$('invName')?.value.trim();if(!name)return;
    const amount=Math.max(0,Number($('invAmount')?.value||$('invQty')?.value||1));
    const unit=$('invUnit')?.value||'buc';
    const item={id:uid(),name,amount,unit,qty:amount,qtyText:formatAmount(amount,unit),expiry:$('invExpiry')?.value||'',category:$('invCat')?.value||'',emoji:$('invEmoji')?.value.trim()||'🥕',createdAt:new Date().toISOString()};
    await dbPut(item);
    ['invName','invExpiry','invCat','invEmoji'].forEach(id=>{const e=$(id);if(e)e.value='';});
    if($('invAmount'))$('invAmount').value='1'; if($('invQty'))$('invQty').value='1';
    await refresh(); toastPro(`✅ ${name}: ${formatAmount(amount,unit)} adăugat în stoc`,'ok');
  }
  function profileFromUI(){state.profile.allergens=[...document.querySelectorAll('#allergenBox input:checked')].map(x=>x.value);state.profile.diet=$('proDiet')?.value||'';state.profile.budget=Math.max(0,+($('proBudget')?.value||0));saveProfile();toastPro('✅ Profil PRO salvat','ok');}
  function loadProfileUI(){document.querySelectorAll('#allergenBox input').forEach(x=>x.checked=state.profile.allergens.includes(x.value));if($('proDiet'))$('proDiet').value=state.profile.diet||'';if($('proBudget'))$('proBudget').value=state.profile.budget||'';}
  function ingredientWords(s){return words(s);}
  function recipeMatches(r){const have=state.inventory.flatMap(x=>ingredientWords(x.name));const haveSet=new Set(have);const ings=(r.ingredients||r.ingredients_ro||[]).join(' ');const ws=[...new Set(ingredientWords(ings))];let hits=0;ws.forEach(w=>{if(haveSet.has(w))hits++;});return{hits,total:Math.max(ws.length,1),score:Math.round(hits/Math.max(ws.length,1)*100)};}
  function allergenConflict(r){const text=ingredientWords((r.ingredients||r.ingredients_ro||[]).join(' '));const all=text.join(' ');const map={lapte:['lapte','milk','cheese','branza','unt','butter','smantana','cream'],oua:['oua','ou','egg','eggs'],gluten:['grau','wheat','faina','flour','paine','bread','paste','pasta'],arahide:['arahida','arahide','peanut'],nuci:['nuci','alune','migdale','walnut'],soia:['soia','soy']};return state.profile.allergens.some(a=>(map[a]||[]).some(k=>all.includes(k)));}
  function renderRecommendations(){const box=$('proRecommendations');if(!box)return;let pool=[];try{pool=typeof poolRecipes==='function'?poolRecipes():[];}catch{}if(!pool.length&&Array.isArray(window.LOCAL_RECIPES))pool=window.LOCAL_RECIPES;const ranked=pool.map(r=>Object.assign({r},recipeMatches(r))).filter(x=>x.score>0&&!allergenConflict(x.r)).sort((a,b)=>b.score-a.score).slice(0,6);box.innerHTML=ranked.length?ranked.map(x=>`<button class="pro-rec" data-id="${esc(x.r.id||'')}"><span>${esc(x.r.emoji||'🍲')}</span><b>${esc(x.r.title||x.r.title_ro||'Rețetă')}</b><small>${x.hits} ingrediente potrivite • ${x.score}%</small></button>`).join(''):'<div class="pro-empty compact">💡 Adaugă produse în frigider și caută câteva rețete pentru recomandări.</div>';box.querySelectorAll('.pro-rec').forEach(b=>b.onclick=()=>{try{window.openById(b.dataset.id);}catch{}});}

  function renderExpiringToday(){const box=$('expiringToday');if(!box)return;const arr=state.inventory.filter(x=>x.qty>0&&daysUntil(x.expiry)<=0).sort((a,b)=>daysUntil(a.expiry)-daysUntil(b.expiry));if(!arr.length){box.innerHTML='<div class="pro-empty compact">✅ Nimic de folosit astăzi. Stocul este în regulă.</div>';return;}box.innerHTML=arr.map(x=>`<div class="pro-exp-item"><span class="pro-emoji">${esc(x.emoji||'🥕')}</span><div><b>${esc(x.name)}</b><small>${esc(x.qtyText||('× '+x.qty))} • ${daysUntil(x.expiry)<0?'deja expirat':'expiră azi'}</small></div></div>`).join('');}
  function getInventoryContext(){return state.inventory.filter(x=>(x.amount??x.qty)>0).map(x=>({name:x.name,amount:Number(x.amount??x.qty),unit:x.unit||'buc',expiry:x.expiry||''}));}
  function buildAIContext(){const inv=getInventoryContext();const exp=inv.filter(x=>daysUntil(x.expiry)<=0).map(x=>x.name).join(', ');const have=inv.map(x=>`${x.amount} ${x.unit} ${x.name}`).join(', ');return `INVENTAR CHEFACASĂ PRO: ${have||'gol'}\nEXPIRĂ AZI/EXPIRAT: ${exp||'nimic'}\nALERGENI DECLARAȚI: ${state.profile.allergens.join(', ')||'niciunul'}\nDIETĂ: ${state.profile.diet||'oricare'}\nBUGET: ${state.profile.budget?state.profile.budget+' lei/zi':'nespecificat'}`;}

  function getCore(){return window.ChefAcasaCore||null;}
  function planRecipeLines(){const core=getCore(),p=core?core.getPlan():{},out=[];Object.keys(p).forEach(day=>{const r=typeof window.findRecipe==='function'?window.findRecipe(p[day]):null;if(r){const lines=(r._pristine?r._pristine.ings:r.ingredients||r.ingredients_ro||[]);lines.forEach(line=>out.push({day:+day,recipe:r,line:String(line)}));}});return out;}
  function collectNeeds(){
    const needs=new Map();
    planRecipeLines().forEach(({line})=>{
      const p=ingredientParts(line), key=ingredientKey(p.name);
      if(!key)return;
      const cur=needs.get(key)||{key,name:p.name,amount:null,unit:p.unit,unknown:false,count:0};
      if(p.amount!=null && p.unit!=='unknown'){
        if(cur.amount==null){cur.amount=0;cur.unit=p.unit;}
        if(unitCompatible(cur.unit,p.unit)){
          const [ca,cu]=toBase(cur.amount,cur.unit),[pa,pu]=toBase(p.amount,p.unit);
          if(cu===pu){cur.amount=fromBase(ca+pa,cu).amount;cur.unit=p.unit==='kg'||p.unit==='l'?p.unit:fromBase(ca+pa,cu).unit;}
          else {cur.amount+=p.amount;}
        } else cur.unknown=true;
      } else cur.unknown=true;
      cur.count++;
      needs.set(key,cur);
    });
    return [...needs.values()];
  }
  function findInventoryForKey(key){
    return state.inventory.filter(x=>(x.amount??x.qty)>0 && ingredientKey(x.name)===key);
  }
  function reconcileShoppingExact(){
    const core=getCore();if(!core)return;
    const needs=collectNeeds(); const manual=core.getShop().filter(it=>it.src!=='auto');
    const out=[...manual];
    needs.forEach(n=>{
      const inv=findInventoryForKey(n.key); let remaining=n.amount; let unit=n.unit;
      let covered=0;
      if(n.amount!=null && !n.unknown){
        const base=toBase(n.amount,n.unit); let haveBase=0; let baseUnit=base[1];
        inv.forEach(x=>{const xu=x.unit||'buc'; if(unitCompatible(xu,n.unit)){const xb=toBase(Number(x.amount??x.qty),xu); if(xb[1]===baseUnit) haveBase+=xb[0];}});
        covered=haveBase/base[1]; const left=Math.max(0,base[0]-haveBase); if(left>0) remaining=left; else remaining=0; unit=baseUnit==='g'&&n.unit==='kg'?'g':baseUnit==='ml'&&n.unit==='l'?'ml':n.unit;
      } else {
        if(inv.length){return;}
      }
      if(remaining===0 && n.amount!=null&&!n.unknown)return;
      const label=n.amount!=null&&!n.unknown?`${formatAmount(remaining,unit)} ${n.name}`:`${n.name}${n.count>1?' (după necesar)':''}`;
      out.push({t:label,done:false,src:'auto',needAmount:n.amount,remainingAmount:remaining,unit,name:n.name,key:n.key,coveredAmount:covered});
    });
    core.setShop(out); if(typeof window.renderShop==='function')window.renderShop(); renderWeekSummary();
  }
  function reconcileShopping(){reconcileShoppingExact();}
  function renderWeekSummary(data){const box=$('weekBudgetSummary');if(!box)return;const core=getCore(),pl=core?core.getPlan():{};const n=Object.keys(pl).length;const inv=state.inventory.filter(x=>(x.amount??x.qty)>0).length;const exp=state.inventory.filter(x=>(x.amount??x.qty)>0&&daysUntil(x.expiry)<=0).length;const needs=collectNeeds();const missing=needs.filter(n=>n.amount!=null&&!n.unknown&&(n.amount-findCoveredAmount(n))>0).length;const cost=data&&data.estimatedWeekCost?Number(data.estimatedWeekCost):0;box.innerHTML=`<div class="pro-week-stat"><span>📅</span><b>${n}/7</b><small>zile planificate</small></div><div class="pro-week-stat"><span>🥶</span><b>${inv}</b><small>produse în stoc</small></div><div class="pro-week-stat"><span>${exp?'⚠️':'✅'}</span><b>${exp}</b><small>expiră azi</small></div><div class="pro-week-stat"><span>🛒</span><b>${missing}</b><small>ingrediente de cumpărat</small></div>${cost?`<div class="pro-week-stat"><span>💰</span><b>${cost.toFixed(2)} lei</b><small>cost estimat / săptămână</small></div>`:''}`;}
  function findCoveredAmount(n){const inv=findInventoryForKey(n.key);if(n.amount==null||n.unknown)return 0;const [needBase,needUnit]=toBase(n.amount,n.unit);let have=0;inv.forEach(x=>{const xb=toBase(Number(x.amount??x.qty),x.unit||'buc');if(xb[1]===needUnit)have+=xb[0];});return have/(UNIT_TO_BASE[n.unit]?.[1]||1);}
  function useExpiring(){const names=state.inventory.filter(x=>(x.amount??x.qty)>0&&daysUntil(x.expiry)<=0).map(x=>x.name);if(!names.length){toastPro('✅ Nu există ingrediente expirate/expiră azi','ok');return;}const input=$('ingredientsInput');if(input){input.value=names.join(', ');if(typeof window.doSearch==='function')window.doSearch();if(typeof window.showTab==='function')window.showTab('search');}}

  function installShoppingHook(){
    if(typeof window.rebuildAutoShop!=='function')return;
    const original=window.rebuildAutoShop;
    if(original.__proV3)return;
    const wrapped=function(){ original.apply(this,arguments); reconcileShoppingExact(); };
    wrapped.__proV3=true; window.rebuildAutoShop=wrapped;
  }

  function parseJson(text){let s=String(text||'').trim().replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```$/,'').trim();const a=s.indexOf('{'),b=s.lastIndexOf('}');if(a>=0&&b>a)s=s.slice(a,b+1);return JSON.parse(s);}
  async function aiRequest(messages){const model=typeof window.getModel==='function'?window.getModel():undefined;const provider=typeof window.getProvider==='function'?window.getProvider():'auto';let last='';if((provider==='auto'||provider==='openrouter')&&typeof window.getProxyUrl==='function'&&window.getProxyUrl()){
      try{const r=await window.callProxy(messages,1800,model,window.getProxyUrl());if(r)return r;}catch(e){last=e.message;}
    }
    if((provider==='openrouter'||provider==='auto')&&typeof window.getApiKey==='function'&&window.getApiKey()){
      try{const res=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${window.getApiKey()}`,'Content-Type':'application/json','HTTP-Referer':location.origin,'X-Title':'ChefAcasa PRO'},body:JSON.stringify({model:model||'nvidia/nemotron-3-super-120b-a12b:free',messages,temperature:.2,max_tokens:1800})});const d=await res.json();const c=d.choices?.[0]?.message?.content;if(c)return c;last=d.error?.message||`OpenRouter ${res.status}`;}catch(e){last=e.message;}
    }
    try{const res=await fetch('https://text.pollinations.ai/openai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'openai',messages,temperature:.2,max_tokens:1800})});const d=await res.json();const c=d.choices?.[0]?.message?.content;if(c)return c;last=d.error?.message||`Pollinations ${res.status}`;}catch(e){last=e.message;}
    throw new Error(last||'Niciun furnizor AI disponibil');
  }

  function allowedDietText(){return state.profile.diet?`Dieta obligatorie: ${state.profile.diet}.`:'Fără dietă obligatorie.';}
  async function generateWeeklyMenu(){const btn=$('generateWeekBtn'),status=$('weekAiStatus');if(btn)btn.disabled=true;if(status){status.className='hint pro-ai-loading';status.textContent='🤖 Analizez stocul, expirările și restricțiile...';}
    try{
      const inventory=getInventoryContext();
      const expiring=inventory.filter(x=>daysUntil(x.expiry)<=0||daysUntil(x.expiry)===1);
      let pool=[];try{pool=typeof poolRecipes==='function'?poolRecipes():[];}catch{}if(!pool.length&&Array.isArray(window.LOCAL_RECIPES))pool=window.LOCAL_RECIPES.map(r=>({...r,id:r.id||('local-'+Math.random()),title:r.title_ro,ingredients:r.ingredients_ro,steps:r.steps_ro,source:'local'}));
      const candidates=pool.filter(r=>!allergenConflict(r)).map(r=>({id:r.id,title:r.title,title_ro:r.title_ro,ingredients:(r.ingredients||r.ingredients_ro||[]).slice(0,12),time:r.time||30,kcal:typeof window.kcalPerServing==='function'?Math.round(window.kcalPerServing(r)):0})).slice(0,80);
      const prompt=`Generează un meniu pentru 7 zile pentru ChefAcasă. Răspunde EXCLUSIV JSON valid, fără markdown.\nSTOC: ${JSON.stringify(inventory)}\nEXPIRĂ CURÂND: ${JSON.stringify(expiring)}\nALERGENI: ${JSON.stringify(state.profile.allergens)}\n${allowedDietText()}\nBUGET MAXIM/ZI: ${state.profile.budget||'nespecificat'} lei\nCANDIDAȚI DISPONIBILI: ${JSON.stringify(candidates)}\nREGULI: 1) Alege exact 7 zile. 2) Folosește cât mai mult stocul existent, mai ales produsele care expiră. 3) Nu folosi rețete care încalcă alergeni/dieta. 4) Respectă cât mai bine bugetul, estimând realist. 5) Poți reutiliza ingrediente între zile. 6) Folosește numai id-uri din candidați.\nSCHEMA: {"days":[{"day":0,"recipeId":"...","title":"...","reason":"...","estimatedCost":12.5}],"estimatedWeekCost":87.5,"usedInventory":["..."],"notes":["..."]}`;
      const raw=await aiRequest([{role:'system',content:'Ești planificatorul culinar ChefAcasă. Produce doar JSON valid și nu inventa id-uri.'},{role:'user',content:prompt}]);
      const data=parseJson(raw);if(!Array.isArray(data.days)||data.days.length!==7)throw new Error('AI nu a întors 7 zile valide');
      const candidateIds=new Set(candidates.map(r=>r.id));const next={};data.days.forEach((d,i)=>{const day=Number.isInteger(+d.day)?+d.day:i;if(day>=0&&day<7&&candidateIds.has(d.recipeId))next[day]=d.recipeId;});if(Object.keys(next).length<7)throw new Error('Planul AI conține rețete inexistente');
      const core=getCore();if(!core)throw new Error('API planner indisponibil');core.setPlan(next);if(typeof window.rebuildAutoShop==='function')window.rebuildAutoShop();if(typeof window.renderPlan==='function')window.renderPlan();renderWeekSummary(data);if(typeof window.showTab==='function')window.showTab('plan');
      if(status){status.className='hint';status.textContent=`✅ Meniu generat: ~${Number(data.estimatedWeekCost||0).toFixed(2)} lei/săptămână. ${Array.isArray(data.notes)&&data.notes[0]?esc(data.notes[0]):''}`;}
      toastPro('✅ Meniul săptămânal PRO a fost generat','ok');
    }catch(e){if(status){status.className='hint';status.textContent='❌ '+e.message;}toastPro('❌ Nu am putut genera meniul AI','err');}
    finally{if(btn)btn.disabled=false;}
  }
  function renderWeekSummary(data){const box=$('weekBudgetSummary');if(!box)return;const pl=window.plan||{};const n=Object.keys(pl).length;let inv=state.inventory.filter(x=>x.qty>0).length;let exp=state.inventory.filter(x=>x.qty>0&&daysUntil(x.expiry)<=0).length;let cost=data&&data.estimatedWeekCost?Number(data.estimatedWeekCost):0;box.innerHTML=`<div class="pro-week-stat"><span>📅</span><b>${n}/7</b><small>zile planificate</small></div><div class="pro-week-stat"><span>🥶</span><b>${inv}</b><small>produse în stoc</small></div><div class="pro-week-stat"><span>${exp?'⚠️':'✅'}</span><b>${exp}</b><small>expiră azi</small></div>${cost?`<div class="pro-week-stat"><span>💰</span><b>${cost.toFixed(2)} lei</b><small>cost estimat / săptămână</small></div>`:''}`;}
  function useExpiring(){const names=state.inventory.filter(x=>x.qty>0&&daysUntil(x.expiry)<=0).map(x=>x.name);if(!names.length){toastPro('✅ Nu există ingrediente expirate/expiră azi','ok');return;}const input=$('ingredientsInput');if(input){input.value=names.join(', ');if(typeof window.doSearch==='function')window.doSearch();if(typeof window.showTab==='function')window.showTab('search');}}

  function patchBackup(){if(typeof window.exportBackup!=='function')return;const original=window.exportBackup;if(original.__proV2)return;const wrap=function(){try{localStorage.setItem('chef_pro_inventory_export','1');}catch{} return original.apply(this,arguments);};wrap.__proV2=true;window.exportBackup=wrap;}
  window.ChefAcasaPRO={state,refresh,addInventory,buildAIContext,renderRecommendations,saveProfile:profileFromUI,renderExpiringToday,reconcileShopping,generateWeeklyMenu,collectNeeds,reconcileShoppingExact,parseQtyText,ingredientParts,ingredientKey};

  document.addEventListener('DOMContentLoaded',async()=>{
    loadProfile();try{await openDB();await refresh();}catch(e){console.warn('ChefAcasă PRO storage',e);}loadProfileUI();renderRecommendations();patchBackup();installShoppingHook();reconcileShoppingExact();
    const add=$('addInventoryBtn');if(add)add.onclick=addInventory;const f=$('inventoryFilter');if(f)f.oninput=render;const save=$('saveProProfileBtn');if(save)save.onclick=profileFromUI;const gen=$('generateWeekBtn');if(gen)gen.onclick=generateWeeklyMenu;const exp=$('useExpiringBtn');if(exp)exp.onclick=useExpiring;document.querySelectorAll('.pro-open-recs').forEach(b=>b.onclick=()=>{renderRecommendations();});
  });
  setInterval(()=>{if(state.db){refresh();renderRecommendations();reconcileShopping();}},60000);
})();
