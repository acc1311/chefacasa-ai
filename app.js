// ===== ChefAcasa App =====
// ATENTIE GitHub Pages: NU pune cheia API in cod (repo-ul public o expune tuturor).
// Fiecare utilizator isi adauga propria cheie gratuita in ⚙️ Setari (se salveaza doar in browserul lui).
const DEFAULT_API_KEY = "";
// URL-ul worker-ului Cloudflare (dupa deploy). Ex: "https://chefacasa-ai.maria.workers.dev"
// Daca e completat, chatul merge INSTANT pentru toti vizitatorii, fara cheie.
// Cheia OpenRouter sta secreta in worker (variabila OPENROUTER_KEY), NU in acest fisier.
const DEFAULT_PROXY_URL = "https://chefacasa-ai.brm-laser-veronese.workers.dev";
function getProxyUrl(){return (localStorage.getItem("chef_proxy")||DEFAULT_PROXY_URL||"").replace(/\/+$/,"");}
function getChatLang(){const c=localStorage.getItem("chef_chat_lang")||"auto";return c==="auto"?lang:c;}

let lang = localStorage.getItem("chef_lang") || "ro";
let allResults = [];
let favorites = JSON.parse(localStorage.getItem("chef_fav") || "[]");
let currentIngredients = [];

const I18N = {
ro:{appName:"ChefAcasă",heroTitle:"Ce ai în frigider? Îți spun ce să gătești 👨‍🍳",heroSub:"Scrie 2-3 ingrediente pe care le ai, iar noi căutăm rețete în baza locală + pe internet + îți recomandăm detalii complete.",search:"Caută rețete",surprise:"Surprinde-mă",searchNet:"Caută și pe internet cu ingredientele tale:",loading:"Caut rețete delicioase...",empty:"Scrie ingredientele sus și apasă „Caută rețete”. Poți scrie și în română și în engleză.",settings:"Setări AI",assistant:"Asistent Bucătar",keyHint:"Cheia se salvează doar în browserul tău (localStorage). Nu o distribui. O poți lua gratis de pe openrouter.ai",details_ingredients:"🧂 Ingrediente",details_steps:"👩‍🍳 Pași de preparare",details_reco:"⭐ Recomandări similare",details_video:"🎥 Video",servings:"porții",minutes:"min",match:"potrivire",view:"Vezi rețeta",fav:"Salvează",netHint:"Se deschide într-un tab nou"},
en:{appName:"HomeChef",heroTitle:"What's in your fridge? I'll tell you what to cook 👨‍🍳",heroSub:"Write 2-3 ingredients you have, we search local database + internet + give full details.",search:"Search recipes",surprise:"Surprise me",searchNet:"Also search the web with your ingredients:",loading:"Searching delicious recipes...",empty:"Write ingredients above and press “Search recipes”. You can write in Romanian or English.",settings:"AI Settings",assistant:"Chef Assistant",keyHint:"Key is saved only in your browser (localStorage). Don't share it. Get one free at openrouter.ai",details_ingredients:"🧂 Ingredients",details_steps:"👩‍🍳 Steps",details_reco:"⭐ Similar recommendations",details_video:"🎥 Video",servings:"servings",minutes:"min",match:"match",view:"View recipe",fav:"Save",netHint:"Opens in a new tab"}
};

// RO -> EN pentru TheMealDB
const RO_EN = {"oua":"egg","ou":"egg","oua ":"egg","pui":"chicken","porc":"pork","vita":"beef","carne":"beef","peste":"fish","ton":"tuna","cartofi":"potato","cartof":"potato","rosii":"tomato","rosie":"tomato","ceapa":"onion","usturoi":"garlic","orez":"rice","morcov":"carrot","ardei":"pepper","ciuperci":"mushroom","branza":"cheese","lapte":"milk","faina":"flour","zahar":"sugar","unt":"butter","ulei":"oil","fasole":"beans","mazare":"peas","porumb":"corn","lamaie":"lemon","mar":"apple","banane":"banana","banana":"banana","ciocolata":"chocolate","paste":"pasta","spaghete":"spaghetti","smantana":"cream","ouale":"egg","paine":"bread","bagheta":"bread","dovlecel":"zucchini","vinete":"eggplant","spanac":"spinach","salata":"lettuce","castraveti":"cucumber","masline":"olive","oua":"egg","miere":"honey","nuci":"nuts","piept":"breast","pulpe":"leg"};

function norm(s){return (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();}
function toEN(w){const n=norm(w);return RO_EN[n]||n;}
function t(k){return (I18N[lang]&&I18N[lang][k])||I18N.ro[k]||k;}

function getApiKey(){return localStorage.getItem("chef_or_key")||DEFAULT_API_KEY||"";}
function getModel(){return localStorage.getItem("chef_or_model")||"nvidia/nemotron-3-super-120b-a12b:free";}
function getProvider(){const p=localStorage.getItem("chef_provider")||"auto";return (p==="nvidia")?"auto":p;}
function getAutoTr(){return localStorage.getItem("chef_autotr")!=="0";}
let DYNAMIC_FREE_MODELS=["nvidia/nemotron-3-super-120b-a12b:free","nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free","google/gemma-4-31b-it:free","google/gemma-4-26b-a4b-it:free","nex-agi/nex-n2.5-pro:free","nex-agi/nex-n2.5-mini:free"];
const POLLI_MODEL="openai"; // GPT-OSS 20B, anonim, nelimitat, fara cheie
async function refreshFreeModels(silent){
  const sel=document.getElementById("modelSelect"),cnt=document.getElementById("modelCount");
  try{
    if(!silent&&cnt)cnt.textContent="⏳ caut...";
    const res=await fetch("https://openrouter.ai/api/v1/models").then(r=>r.json());
    const free=(res.data||[]).filter(m=>m.id.includes(":free")).map(m=>m.id).sort();
    if(free.length)DYNAMIC_FREE_MODELS=free;
    if(sel){
      const cur=getModel();
      sel.innerHTML=DYNAMIC_FREE_MODELS.map(id=>`<option value="${id}">${id.replace(":free","")} 🌐</option>`).join("");
      if(DYNAMIC_FREE_MODELS.includes(cur))sel.value=cur;
      else{sel.value=DYNAMIC_FREE_MODELS[0];}
    }
    if(cnt)cnt.textContent=`(${DYNAMIC_FREE_MODELS.length} modele :free live)`;
    checkApi();
  }catch(e){if(cnt)cnt.textContent=`(${DYNAMIC_FREE_MODELS.length} modele, lista offline)`;}
}
async function callProxy(msgs,maxTokens,model,base){
  base=(base||getProxyUrl()).replace(/\/+$/,"");
  if(!base)throw new Error("proxy neconfigurat");
  const res=await fetch(base+"/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:msgs,max_tokens:maxTokens||900,model:model||undefined})});
  const data=await res.json();
  if(data.reply)return data.reply;
  throw new Error(data.error||("proxy "+res.status));
}
async function callPollinations(msgs,maxTokens){  const res=await fetch("https://text.pollinations.ai/openai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:POLLI_MODEL,messages:msgs,temperature:0.7,max_tokens:maxTokens||900})});
  const data=await res.json();
  const m=data.choices?.[0]?.message||{};
  const ans=(m.content||m.reasoning||"").trim();
  if(!ans)throw new Error("Pollinations: raspuns gol");
  return ans;
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded",()=>{
  applyLang();
  document.getElementById("langRO").onclick=()=>{lang="ro";localStorage.setItem("chef_lang",lang);applyLang();};
  document.getElementById("langEN").onclick=()=>{lang="en";localStorage.setItem("chef_lang",lang);applyLang();};
  document.getElementById("searchBtn").onclick=doSearch;
  document.getElementById("surpriseBtn").onclick=surprise;
  document.getElementById("clearBtn").onclick=()=>{document.getElementById("ingredientsInput").value="";document.getElementById("results").innerHTML="";document.getElementById("empty").style.display="block";document.getElementById("stats").classList.add("hidden");};
  document.getElementById("ingredientsInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey))doSearch();});
  document.getElementById("modalClose").onclick=()=>{stopSpeak();document.getElementById("modal").classList.add("hidden");};
  document.getElementById("modal").addEventListener("click",e=>{if(e.target.id==="modal"){stopSpeak();e.target.classList.add("hidden");}});
  document.getElementById("categoryFilter").onchange=renderResults;
  document.getElementById("timeFilter").onchange=renderResults;
  document.getElementById("sortFilter").onchange=renderResults;
  document.getElementById("dietFilter").onchange=renderResults;
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
  // meniu + lista + retetele mele
  document.getElementById("autoPlanBtn").onclick=autoPlan;
  document.getElementById("clearPlanBtn").onclick=()=>{plan={};savePlan();renderPlan();};
  document.getElementById("copyListBtn").onclick=copyShop;
  document.getElementById("waListBtn").onclick=waShop;
  document.getElementById("clearListBtn").onclick=()=>{shop=[];saveShop();renderShop();};
  document.getElementById("addItemBtn").onclick=addManualItem;
  document.getElementById("addRecipeBtn").onclick=()=>openMineForm();
  document.getElementById("mineClose").onclick=()=>document.getElementById("mineModal").classList.add("hidden");
  document.getElementById("saveMineBtn").onclick=saveMineForm;
  // mod gatire
  document.getElementById("cookClose").onclick=closeCook;
  document.getElementById("cookPrev").onclick=()=>cookGo(cookIdx-1);
  document.getElementById("cookNext").onclick=()=>cookGo(cookIdx+1);
  document.getElementById("cookSpeak").onclick=speakCookStep;
  document.getElementById("cookStart").onclick=cookStart;
  document.getElementById("cookReset").onclick=cookReset;
  document.getElementById("favBtn").onclick=showFavorites;
  document.getElementById("helpBtn").onclick=()=>showIntro(true);
  document.getElementById("backupBtn").onclick=exportBackup;
  document.getElementById("restoreBtn").onclick=()=>document.getElementById("restoreFile").click();
  document.getElementById("restoreFile").onchange=(e)=>{if(e.target.files[0])importBackup(e.target.files[0]);e.target.value="";};
  document.getElementById("introSkip").onclick=closeIntro;
  document.getElementById("introPrev").onclick=()=>{if(introIdx>0){introIdx--;renderIntro();}};
  document.getElementById("introNext").onclick=()=>{if(introIdx<INTRO_STEPS.length-1){introIdx++;renderIntro();}else closeIntro();};
  document.querySelectorAll(".btn.net").forEach(b=>b.onclick=()=>searchNet(b.dataset.net));
  // settings
  document.getElementById("settingsBtn").onclick=()=>{document.getElementById("apiKeyInput").value=getApiKey();document.getElementById("proxyInput").value=getProxyUrl();document.getElementById("providerSelect").value=getProvider();document.getElementById("autoTrBox").checked=getAutoTr();refreshFreeModels(true).then(()=>{document.getElementById("modelSelect").value=getModel();});document.getElementById("settingsModal").classList.remove("hidden");};
  document.getElementById("settingsClose").onclick=()=>document.getElementById("settingsModal").classList.add("hidden");
  document.getElementById("saveKeyBtn").onclick=()=>{localStorage.setItem("chef_or_key",document.getElementById("apiKeyInput").value.trim());localStorage.setItem("chef_proxy",document.getElementById("proxyInput").value.trim().replace(/\/+$/,""));localStorage.setItem("chef_or_model",document.getElementById("modelSelect").value);localStorage.setItem("chef_provider",document.getElementById("providerSelect").value);localStorage.setItem("chef_autotr",document.getElementById("autoTrBox").checked?"1":"0");document.getElementById("settingsModal").classList.add("hidden");checkApi();addMsg("bot",lang==="ro"?"✅ Setări salvate! Provider: "+getProvider():"✅ Settings saved!");};
  document.getElementById("testKeyBtn").onclick=testConnection;
  document.getElementById("refreshModels").onclick=(e)=>{e.preventDefault();refreshFreeModels(false);};
  // chat
  document.getElementById("chatFab").onclick=toggleChat;
  document.getElementById("chatClose").onclick=toggleChat;
  document.getElementById("chatLang").value=localStorage.getItem("chef_chat_lang")||"auto";
  document.getElementById("chatLang").onchange=(e)=>{localStorage.setItem("chef_chat_lang",e.target.value);toast(lang==="ro"?"🌐 Asistentul va răspunde în: "+(getChatLang()==="ro"?"română":"engleză"):"🌐 Assistant language set.","ok");};
  document.getElementById("chatSend").onclick=sendChat;
  document.getElementById("chatInput").addEventListener("keydown",e=>{if(e.key==="Enter")sendChat();});
  buildChips(); updateFavCount(); checkApi(); buildQuickQ(); refreshFreeModels(true); renderPlan(); renderShop(); renderMine(); initInstall(); showIntro(false);
  addMsg("bot", lang==="ro"?"👋 Salut! Sunt asistentul tău bucătar. Scrie ingredientele sus și apasă Caută, sau întreabă-mă direct aici ce vrei să gătești!":"👋 Hi! I'm your chef assistant. Type ingredients above and Search, or ask me directly here!");
});

function applyLang(){
  document.documentElement.lang=lang;
  document.querySelectorAll("[data-i18n]").forEach(el=>{el.textContent=t(el.dataset.i18n);});
  document.getElementById("langRO").classList.toggle("active",lang==="ro");
  document.getElementById("langEN").classList.toggle("active",lang==="en");
  buildChips(); buildQuickQ();
  if(allResults.length)renderResults();
}
function buildChips(){
  const ex = lang==="ro"?["ouă, cartofi","pui, orez","roșii, mozzarella","paste, usturoi","ton, porumb","ciuperci, smântână"]:["eggs, potatoes","chicken, rice","tomatoes, mozzarella","pasta, garlic","tuna, corn","mushrooms, cream"];
  const box=document.getElementById("exampleChips");box.innerHTML="";
  ex.forEach(e=>{const s=document.createElement("span");s.className="chip";s.textContent="+"+e;s.onclick=()=>{document.getElementById("ingredientsInput").value=e;doSearch();};box.appendChild(s);});
}
function buildQuickQ(){
  const qs = lang==="ro"?["Ce pot găti rapid în 15 min?","Am ouă și cartofi, ce fac?","Dă-mi o rețetă de post","Cum fac clătite pufoase?"]:["What can I cook in 15 min?","I have eggs and potatoes?","Give me a vegan recipe","How to make fluffy pancakes?"];
  const box=document.getElementById("quickQ");box.innerHTML="";
  qs.forEach(q=>{const b=document.createElement("button");b.textContent=q;b.onclick=()=>{document.getElementById("chatInput").value=q;sendChat();};box.appendChild(b);});
}
function updateFavCount(){document.getElementById("favCount").textContent=favorites.length;}
function checkApi(){
  const el=document.getElementById("apiStatus");
  const p=getProvider();
  if(getProxyUrl()&&p==="auto"){el.textContent="● AI ⚡ instant";el.className="api-status ok";document.getElementById("chatModel").textContent="proxy ⚡";return;}
  if(p==="pollinations"){el.textContent="● AI ♾️ nelimitat";el.className="api-status ok";document.getElementById("chatModel").textContent="GPT-OSS 20B ♾️";return;}
  const k=getApiKey();
  if(!k&&p!=="auto"){el.textContent="● AI off";el.className="api-status err";return;}
  el.textContent=p==="auto"?"● AI auto ♾️":"● AI on";el.className="api-status ok";
  const m=getModel().split("/").pop().replace(":free","");
  document.getElementById("chatModel").textContent=(p==="auto"?"auto→":"")+m;
}

// ===== SEARCH =====
function parseIngredients(){
  const raw=document.getElementById("ingredientsInput").value;
  return raw.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean);
}
async function doSearch(){
  const ings=parseIngredients();
  if(!ings.length){toast(lang==="ro"?"Scrie cel puțin un ingredient! Ex: ouă, cartofi":"Write at least one ingredient! Ex: eggs, potatoes","err");return;}
  currentIngredients=ings;
  document.getElementById("loading").classList.remove("hidden");
  document.getElementById("empty").style.display="none";
  document.getElementById("results").innerHTML="";
  try{
    const local=searchLocal(ings);
    const net=await searchMealDB(ings);
    allResults=[...local,...net];
    // categorii
    const cats=[...new Set(allResults.map(r=>lang==="ro"?r.category_ro:r.category_en))];
    const sel=document.getElementById("categoryFilter");
    sel.innerHTML=`<option value="">📂 ${lang==="ro"?"Toate categoriile":"All categories"} (${allResults.length})</option>`+cats.map(c=>`<option>${c}</option>`).join("");
    renderResults();
    const st=document.getElementById("stats");st.classList.remove("hidden");
    st.textContent=(lang==="ro"?`Am găsit ${allResults.length} rețete pentru: ${ings.join(", ")} (local + TheMealDB + internet)`:`Found ${allResults.length} recipes for: ${ings.join(", ")} (local + TheMealDB + web)`);
    // notifica chatul
    if(allResults.length)addMsg("bot",(lang==="ro"?`🔍 Am găsit ${allResults.length} rețete cu ${ings.join(", ")}. Apasă pe orice rețetă pentru detalii, sau întreabă-mă: "care e cea mai rapidă?" / "ce-mi recomanzi?"`:`🔍 Found ${allResults.length} recipes with ${ings.join(", ")}. Click any recipe for details, or ask me: "which is fastest?"`));
  }catch(e){console.error(e);}
  document.getElementById("loading").classList.add("hidden");
}
function searchLocal(ings){
  const nIngs=ings.map(norm);
  const pool=[...LOCAL_RECIPES.map(r=>({...r,source:"local"})),...getMine().map(m=>mineToLocal(m))];
  return pool.map(r=>{
    const tagStr=r.tags.join(" ").toLowerCase();
    const ingStr=(lang==="ro"?r.ingredients_ro.join(" "):r.ingredients_en.join(" ")).toLowerCase();
    let hits=0;
    nIngs.forEach(q=>{
      const en=toEN(q);
      if(tagStr.includes(q)||tagStr.includes(en)||ingStr.includes(q)||ingStr.includes(en))hits++;
    });
    const match=Math.round(hits/nIngs.length*100);
    return {...r,match,image:null,
      title:lang==="ro"?r.title_ro:r.title_en,
      category:lang==="ro"?r.category_ro:r.category_en,
      ingredients:lang==="ro"?r.ingredients_ro:r.ingredients_en,
      steps:lang==="ro"?r.steps_ro:r.steps_en,
      difficulty:lang==="ro"?r.difficulty_ro:r.difficulty_en};
  }).filter(r=>r.match>0).sort((a,b)=>b.match-a.match);
}
async function searchMealDB(ings){
  try{
    const enIngs=[...new Set(ings.map(toEN))].slice(0,3);
    let idSets=[];
    for(const ing of enIngs){
      const res=await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ing)}`).then(r=>r.json());
      if(res.meals)idSets.push(new Set(res.meals.map(m=>m.idMeal)));
    }
    let ids=[];
    if(idSets.length===0){
      // fallback: cauta dupa nume
      const res=await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(enIngs[0]||"chicken")}`).then(r=>r.json());
      if(res.meals)ids=res.meals.slice(0,8).map(m=>m.idMeal);
    }else if(idSets.length===1){ids=[...idSets[0]].slice(0,12);}
    else{
      // intersectie, daca goala -> reuniune
      let inter=[...idSets[0]].filter(id=>idSets.every(s=>s.has(id)));
      if(!inter.length){const u=new Set();idSets.forEach(s=>s.forEach(id=>u.add(id)));inter=[...u];}
      ids=inter.slice(0,12);
    }
    const details=[];
    for(const id of ids.slice(0,8)){
      const d=await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`).then(r=>r.json());
      if(d.meals&&d.meals[0])details.push(mealToRecipe(d.meals[0],enIngs));
    }
    return details;
  }catch(e){console.warn("MealDB fail",e);return[];}
}
function mealToRecipe(m,userIngs){
  const ings=[];
  for(let i=1;i<=20;i++){const ing=m["strIngredient"+i],ms=m["strMeasure"+i];if(ing&&ing.trim())ings.push(`${ing.trim()} - ${(ms||"").trim()}`);}
  const match=userIngs.length?Math.max(40,Math.round(userIngs.filter(u=>ings.join(" ").toLowerCase().includes(u.toLowerCase())).length/userIngs.length*100)):50;
  return{id:"meal-"+m.idMeal,emoji:"🌍",title:m.strMeal,category:m.strCategory||"International",category_ro:m.strCategory||"Internațional",category_en:m.strCategory||"International",time:30,servings:4,difficulty:lang==="ro"?"Mediu":"Medium",ingredients:ings,steps:[m.strInstructions||""],tags:userIngs,image:m.strMealThumb,source:"themealdb",match,youtube:m.strYoutube,area:m.strArea};
}
function surprise(){
  const pool=LOCAL_RECIPES[Math.floor(Math.random()*LOCAL_RECIPES.length)];
  document.getElementById("ingredientsInput").value=pool.tags.slice(0,3).join(", ");
  doSearch();
}
function renderResults(){
  const cat=document.getElementById("categoryFilter").value;
  const maxT=document.getElementById("timeFilter").value;
  const sort=document.getElementById("sortFilter").value;
  const diet=document.getElementById("dietFilter").value;
  let list=[...allResults];
  if(cat)list=list.filter(r=>(r.category||r.category_ro)===cat);
  if(maxT)list=list.filter(r=>(r.time||30)<=+maxT);
  if(diet)list=list.filter(r=>{const d=getDiet(r);if(diet==="light")return kcalPerServing(r)<400;return d[diet];});
  if(sort==="time")list.sort((a,b)=>(a.time||30)-(b.time||30));
  else if(sort==="name")list.sort((a,b)=>a.title.localeCompare(b.title));
  else list.sort((a,b)=>b.match-a.match);
  const grid=document.getElementById("results");grid.innerHTML="";
  if(!list.length){grid.innerHTML=`<p style="grid-column:1/-1;text-align:center;color:#888">${lang==="ro"?"Nicio rețetă cu aceste filtre. Încearcă alte ingrediente!":"No recipes with these filters. Try other ingredients!"}</p>`;return;}
  list.forEach(r=>{
    const d=document.createElement("div");d.className="card";
    const dd=getDiet(r),kc=Math.round(kcalPerServing(r));
    const dietTag=dd.post?"🌱":dd.vegetarian?"🥬":dd.gluten?"🌾":"";
    d.innerHTML=`<div class="card-img">${r.image?`<img src="${r.image}" loading="lazy">`:r.emoji||"🍲"}</div>
    <div class="card-body"><h3>${r.title}</h3>
    <div class="meta"><span class="badge match">⭐ ${r.match}% ${t("match")}</span><span class="badge">⏱ ${r.time||30} ${t("minutes")}</span><span class="badge">🔥 ~${kc} kcal</span>${dietTag?`<span class="badge">${dietTag}</span>`:""}<span class="badge">${r.category||""}</span><span class="badge">${r.source==="local"?"🏠 local":r.source==="mine"?"📖 mea":"🌍 web"}</span></div>
    <p>${(r.ingredients||[]).slice(0,4).join(", ")}...</p>
    <div class="card-actions"><button class="btn primary small">${t("view")}</button><button class="btn small fav">❤️</button></div></div>`;
    d.querySelector(".btn.primary").onclick=(e)=>{e.stopPropagation();openModal(r);};
    d.querySelector(".fav").onclick=(e)=>{e.stopPropagation();toggleFav(r);};
    d.onclick=()=>openModal(r);
    grid.appendChild(d);
  });
}
function toggleFav(r){
  const i=favorites.findIndex(f=>f.id===r.id);
  if(i>=0)favorites.splice(i,1);else favorites.push(r);
  localStorage.setItem("chef_fav",JSON.stringify(favorites));
  updateFavCount();
  toast(i>=0?(lang==="ro"?"Șters de la favorite":"Removed from favorites"):(lang==="ro"?"Salvat la favorite ❤️":"Saved to favorites ❤️"),"ok");
}
function showFavorites(){
  if(!favorites.length){toast(lang==="ro"?"Nu ai favorite încă. Apasă ❤️ pe o rețetă!":"No favorites yet. Press ❤️ on a recipe!","info");return;}
  allResults=favorites;renderResults();
  document.getElementById("stats").classList.remove("hidden");
  document.getElementById("stats").textContent=(lang==="ro"?`❤️ Favoritele tale (${favorites.length})`:`❤️ Your favorites (${favorites.length})`);
  document.getElementById("empty").style.display="none";
}
function searchNet(where){
  const ings=parseIngredients();
  const q=ings.length?ings.join(" "):document.getElementById("ingredientsInput").value||"retete";
  const qr=encodeURIComponent(q+(lang==="ro"?" reteta":" recipe"));
  const urls={google:`https://www.google.com/search?q=${qr}`,youtube:`https://www.youtube.com/results?search_query=${qr}`,bucataras:`https://www.bucataras.ro/cauta/${encodeURIComponent(q)}/`,jamila:`https://www.jamilacuisine.ro/?s=${encodeURIComponent(q)}`,allrecipes:`https://www.allrecipes.com/search?q=${encodeURIComponent(ings.join(" ")||q)}`};
  window.open(urls[where],"_blank");
}

// ===== TRANSLATE GRATIS (Google gtx, fara cheie, nelimitat fair-use) =====
const transCache={}; // text_target -> tradus
async function gtxOne(text,target){
  const key=text+"||"+target;
  if(transCache[key])return transCache[key];
  // 1) Google gtx
  try{
    const url=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    const res=await fetch(url);
    const data=await res.json();
    const out=(data[0]||[]).map(s=>s[0]).join("");
    if(out){transCache[key]=out;return out;}
  }catch(e){console.warn("gtx fail, incerc MyMemory",e);}
  // 2) fallback MyMemory (gratis, fara cheie)
  try{
    const url2=`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${target}`;
    const res2=await fetch(url2).then(r=>r.json());
    const out2=res2?.responseData?.translatedText;
    if(out2&&!out2.includes("MYMEMORY WARNING")){transCache[key]=out2;return out2;}
  }catch(e2){console.warn("mymemory fail",e2);}
  return text; // esec -> original
}
async function translateList(items,target,progress){
  const out=[];
  for(let i=0;i<items.length;i++){
    out.push(await gtxOne(items[i],target));
    if(progress)progress(i+1,items.length);
  }
  return out;
}
function chunkLong(text,max=1200){
  if(text.length<=max)return [text];
  const parts=text.split(/(?<=[.!?])\s+/);
  const chunks=[];let cur="";
  parts.forEach(p=>{if((cur+" "+p).length>max){chunks.push(cur);cur=p;}else cur=(cur?cur+" ":"")+p;});
  if(cur)chunks.push(cur);
  return chunks;
}
async function translateRecipe(target){
  const r=window._currentModal;if(!r)return;
  const st=document.getElementById("trStatus");
  const btnRo=document.getElementById("trRO"),btnEn=document.getElementById("trEN"),btnOrig=document.getElementById("trOrig");
  if(st)st.textContent="⏳ Traduc cu Google (gratis)...";
  [btnRo,btnEn,btnOrig].forEach(b=>{if(b)b.disabled=true;});
  try{
    if(!r._orig)r._orig={title:r.title,ingredients:[...r.ingredients],steps:[...r.steps]};
    const cacheKey=r.id+"_"+target;
    if(!r["_trans_"+target]){
      const tTitle=await gtxOne(r._orig.title,target);
      const tIngs=await translateList(r._orig.ingredients,target,(a,b)=>{if(st)st.textContent=`⏳ Traduc ingrediente ${a}/${b}...`;});
      // pasi lungi -> chunk
      let flat=r._orig.steps.flatMap(s=>s.split(/\r?\n/).filter(Boolean));
      let tSteps=[];
      for(let i=0;i<flat.length;i++){
        const chunks=chunkLong(flat[i]);
        let joined="";
        for(const c of chunks)joined+=(joined?" ":"")+await gtxOne(c,target);
        tSteps.push(joined);
        if(st)st.textContent=`⏳ Traduc pași ${i+1}/${flat.length}...`;
      }
      r["_trans_"+target]={title:tTitle,ingredients:tIngs,steps:tSteps};
    }
    const tr=r["_trans_"+target];
    document.getElementById("trTitle").textContent=tr.title+(target==="ro"?" (tradus RO)":" (translated EN)");
    document.getElementById("trIngs").innerHTML=tr.ingredients.map(i=>`<li>${i}</li>`).join("");
    document.getElementById("trSteps").innerHTML=tr.steps.map(s=>`<li>${s}</li>`).join("");
    if(st)st.textContent=(target==="ro"?"✅ Tradus în română cu Google (gratuit).":"✅ Translated to English (free).");
  }catch(e){if(st)st.textContent="❌ Traducerea a eșuat (verifică internetul).";}
  [btnRo,btnEn,btnOrig].forEach(b=>{if(b)b.disabled=false;});
}
function showOriginal(){
  const r=window._currentModal;if(!r||!r._orig)return;
  document.getElementById("trTitle").textContent=r._orig.title;
  document.getElementById("trIngs").innerHTML=r._orig.ingredients.map(i=>`<li>${i}</li>`).join("");
  document.getElementById("trSteps").innerHTML=r._orig.steps.flatMap(s=>s.split(/\r?\n/).filter(Boolean)).map(s=>`<li>${s}</li>`).join("");
  document.getElementById("trStatus").textContent=lang==="ro"?"↩️ Text original.":"↩️ Original text.";
}

// ===== MODAL =====
function openModal(r){
  const recs=allResults.filter(x=>x.id!==r.id).sort((a,b)=>{
    const ca=(a.category===r.category)?1:0, cb=(b.category===r.category)?1:0;
    return (cb-bb(a,r))-(ca-bb(b,r))||b.match-a.match;
  }).slice(0,3);
  function bb(x,ref){return 0;} // placeholder similaritate
  const isFav=favorites.some(f=>f.id===r.id);
  const needTr = r.source==="themealdb"; // retetele web sunt in engleza
  if(!r._pristine)r._pristine={title:r.title,ings:[...r.ingredients],serv:r.servings||4};
  r._orig={title:r._pristine.title,ingredients:[...r._pristine.ings],steps:[...r.steps]};
  r.servings=r._pristine.serv;r._factor=1;
  document.getElementById("modalBody").innerHTML=`
  <div class="detail-hero">
    <div class="detail-emoji">${r.image?`<img src="${r.image}">`:(r.emoji||"🍲")}</div>
    <div class="detail-info"><h2 id="trTitle">${r.title}</h2>
    <div class="meta"><span class="badge match">⭐ ${r.match}% ${t("match")}</span><span class="badge">⏱ ${r.time||30} ${t("minutes")}</span><span class="badge">🍽 <span id="servLbl">${r.servings||4}</span> ${t("servings")}</span><span class="badge">🔥 ~${Math.round(kcalPerServing(r))} kcal/porție</span><span class="badge">${dietLbl(r)}</span><span class="badge">${r.category||""}</span>${r.area?`<span class="badge">🌍 ${r.area}</span>`:""}</div>
    <div class="port-row">🍽️ Porții: <button onclick="changePortions(-1)">−</button><b id="portLbl">${r.servings||4}</b><button onclick="changePortions(1)">+</button><span class="hint">(cantitățile se recalculează)</span></div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn primary" onclick="askAbout('${r.id.replace(/'/g,"")}')">💬 ${lang==="ro"?"Întreabă asistentul":"Ask assistant"}</button><button class="btn primary" onclick="openCook('${r.id}')">🍳 ${lang==="ro"?"Mod gătire":"Cook mode"}</button><button class="btn" onclick='toggleFavById("${r.id}")'>${isFav?"💔":"❤️"} ${t("fav")}</button>${r.youtube?`<a class="btn" target="_blank" href="${r.youtube}">🎥 YouTube</a>`:""}</div>
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center"><select id="planDay" style="padding:8px;border-radius:8px;border:1px solid #ddd">${DAYS.map((d,i)=>`<option value="${i}">${d}</option>`).join("")}</select><button class="btn small" onclick="addToPlan()">📅 Pune în meniu</button><button class="btn small" onclick="waRecipe()">💬 WhatsApp</button><button class="btn small" onclick="window.print()">🖨 Printează</button></div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button id="speakBtn" class="btn" onclick="speakRecipe()">🔊 ${lang==="ro"?"Citește rețeta":"Read recipe"}</button><button class="btn ghost" onclick="stopSpeak()">⏹ Stop</button><span id="speakStatus" style="font-size:12px;color:#666"></span></div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 10px">
      <span style="font-size:13px">🌐 Google Translate <b>gratuit, nelimitat, fără cheie</b>:</span>
      <button id="trRO" class="btn small primary" onclick="translateRecipe('ro')">🇷🇴 Tradu în RO</button>
      <button id="trEN" class="btn small" onclick="translateRecipe('en')">🇬🇧 Translate EN</button>
      <button id="trOrig" class="btn small ghost" onclick="showOriginal()">↩️ Original</button>
      <span id="trStatus" style="font-size:12px;color:#166534">${needTr?(lang==="ro"?"Rețetă în engleză — apasă Tradu în RO 👆":"Recipe in English — press Translate"): ""}</span>
    </div>
    </div></div>
  <h4>${t("details_ingredients")}</h4><ul class="ing-list" id="trIngs">${(r.ingredients||[]).map(i=>`<li>${i}</li>`).join("")}</ul>
  <h4>${t("details_steps")}</h4><ol class="step-list" id="trSteps">${(r.steps||[]).flatMap(s=>s.split(/\r?\n/).filter(Boolean)).map(s=>`<li>${s}</li>`).join("")}</ol>
  <h4>${t("details_reco")}</h4><div class="rec-grid">${recs.length?recs.map(x=>`<div class="rec-card" onclick='openById("${x.id}")'><div style="font-size:36px">${x.image?`<img src="${x.image}" style="width:100%;border-radius:8px">`:(x.emoji||"🍲")}</div><b>${x.title}</b><br><small>⭐ ${x.match}% • ⏱ ${x.time||30} min</small></div>`).join(""):(lang==="ro"?"Caută alte ingrediente pentru mai multe idei!":"Search other ingredients for more ideas!")}</div>`;
  document.getElementById("modal").classList.remove("hidden");
  window._currentModal=r;
  // traducere automata: daca esti pe RO si reteta e EN (web), traduce singura
  if(getAutoTr()&&lang==="ro"&&r.source==="themealdb"&&!r._trans_ro){
    setTimeout(()=>{if(window._currentModal===r&&!document.getElementById("modal").classList.contains("hidden"))translateRecipe("ro");},600);
  }
}
// ===== CITIRE VOCALA (Web Speech API, gratis, nelimitat, fara cheie) =====
function speakRecipe(){
  try{
    stopSpeak();
    const title=document.getElementById("trTitle")?.textContent||"";
    const ings=[...document.querySelectorAll("#trIngs li")].map(li=>li.textContent).join(", ");
    const steps=[...document.querySelectorAll("#trSteps li")].map((li,i)=>`Pasul ${i+1}: ${li.textContent}`).join(". ");
    const full=`${title}. Ingrediente: ${ings}. ${steps}`;
    const st=document.getElementById("speakStatus");
    if(!("speechSynthesis" in window)){if(st)st.textContent="❌ Browserul nu suportă citirea vocală.";return;}
    const u=new SpeechSynthesisUtterance(full);
    u.lang=lang==="ro"?"ro-RO":"en-US";u.rate=1;u.pitch=1;
    const voices=speechSynthesis.getVoices();
    const v=voices.find(v=>v.lang&&v.lang.toLowerCase().startsWith(lang==="ro"?"ro":"en"));
    if(v)u.voice=v;
    u.onend=()=>{if(st)st.textContent="✅ Gata.";};
    if(st)st.textContent="🔊 Citesc... apasă Stop pentru oprire.";
    speechSynthesis.speak(u);
  }catch(e){console.warn("tts fail",e);}
}
function stopSpeak(){try{if("speechSynthesis" in window)speechSynthesis.cancel();const st=document.getElementById("speakStatus");if(st)st.textContent="";}catch(e){}}
function openById(id){const r=findRecipe(id)||favorites.find(x=>x.id===id);if(r)openModal(r);}
function toggleFavById(id){const r=allResults.find(x=>x.id===id)||window._currentModal;if(r){toggleFav(r);openModal(r);updateFavCount();}}
function askAbout(id){
  const r=findRecipe(id)||allResults.find(x=>x.id===id);
  document.getElementById("modal").classList.add("hidden");
  openChat();
  if(r){addMsg("user",(lang==="ro"?`Povestește-mi despre rețeta "${r.title}". Am aceste ingrediente: `:`Tell me about "${r.title}". I have: `)+(currentIngredients.join(", ")||r.ingredients.slice(0,5).join(", ")));callAI(); }
}

// ===== CHAT =====
function toggleChat(){document.getElementById("chatPanel").classList.toggle("hidden");document.getElementById("chatBadge").classList.add("hidden");}
function openChat(){document.getElementById("chatPanel").classList.remove("hidden");}
function addMsg(who,text){
  const box=document.getElementById("chatMessages");
  const d=document.createElement("div");d.className="msg "+who;d.textContent=text;box.appendChild(d);box.scrollTop=box.scrollHeight;
  if(who==="bot"&&document.getElementById("chatPanel").classList.contains("hidden"))document.getElementById("chatBadge").classList.remove("hidden");
  return d;
}
let chatHistory=[];
async function sendChat(){
  const inp=document.getElementById("chatInput");
  const txt=inp.value.trim();if(!txt)return;
  inp.value="";openChat();addMsg("user",txt);callAI(txt);
}
async function testConnection(){
  const box=document.getElementById("testResult");
  const key=document.getElementById("apiKeyInput").value.trim()||getApiKey();
  const model=document.getElementById("modelSelect").value||getModel();
  const prov=document.getElementById("providerSelect").value||getProvider();
  box.textContent=lang==="ro"?"⏳ Testez...":"⏳ Testing...";
  const notes=[]; // rezultate partiale in mod auto
  // -1) ⚡ proxy Cloudflare (doar Auto): chat instant, testat cu URL-ul din camp
  if(prov==="auto"){
    const proxyField=(document.getElementById("proxyInput").value.trim().replace(/\/+$/,""))||getProxyUrl();
    if(proxyField){
      try{
        box.textContent="⏳ Testez proxy...";
        const t0=Date.now();
        await callProxy([{role:"user",content:"Salut! Raspunde cu OK."}],20,undefined,proxyField);
        notes.push(`✅ ⚡ Proxy instant merge (${((Date.now()-t0)/1000).toFixed(1)}s)`);
      }catch(e){notes.push("⚠️ Proxy eroare: "+e.message);}
    }
  }
  // 1) testeaza Pollinations (nelimitat, fara cheie)
  if(prov==="pollinations"||prov==="auto"){
    try{
      const a=await callPollinations([{role:"user",content:"Salut! Raspunde cu OK."}],20);
      const okP="✅ ♾️ Nelimitat GRATIS merge";
      if(prov==="pollinations"){box.textContent=okP+"! Raspuns: "+a.slice(0,80);return;}
      notes.push(okP);
    }catch(e){if(prov==="auto")notes.push("⚠️ Nelimitat indisponibil");else{box.textContent="⚠️ Nelimitat indisponibil momentan ("+e.message+").";return;}}
  }
  try{
    // Incearca TOATA lista :free (19 modele) ca sa gaseasca unul liber — limitele free se reseteaza la cateva minute
    const candidates=[model,...DYNAMIC_FREE_MODELS.filter(m=>m!==model)];
    let lastHint="";
    for(let i=0;i<candidates.length;i++){
      const cand=candidates[i];
      box.textContent=`⏳ Testez ${i+1}/${candidates.length}: ${cand.replace(":free","")}...`;
      try{
        const ctl=new AbortController();const to=setTimeout(()=>ctl.abort(),12000);
        const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json","HTTP-Referer":(location.origin||"https://localhost/"),"X-Title":"ChefAcasa"},body:JSON.stringify({model:cand,messages:[{role:"user",content:"Salut! Raspunde cu OK."}],max_tokens:20}),signal:ctl.signal});
        clearTimeout(to);
        const data=await res.json();
        if(!data.error){
          document.getElementById("modelSelect").value=cand;
          localStorage.setItem("chef_or_model",cand);
          checkApi();
          box.textContent=(notes.length?notes.join(" | ")+" | ":"")+`✅ OpenRouter liber gasit (${i+1}/${candidates.length}): `+cand+` (l-am selectat automat, apasa Salveaza)`;
          return;
        }
        lastHint=data.error.message||"";
        if(res.status===429)await new Promise(r=>setTimeout(r,1000));
        else if(res.status!==404&&res.status!==500&&res.status!==503)break; // eroare reala (ex 401 cheie gresita), nu mai incerca
      }catch(e1){lastHint=(e1&&e1.name==="AbortError")?"timeout 12s, incerc urmatorul":e1.message;continue;}
    }
    let hint=lastHint||"";
    if(hint.includes("429")||hint.includes("rate"))hint="Toate cele 4 modele incercate sunt aglomerate pe pool-ul comun (eroare 429 upstream). Solutii: 1) treci Provider pe ♾️ Nelimitat GRATIS si apasa Salveaza, 2) asteapta 1-2 min, 3) adauga cheia ta Google AI Studio in openrouter.ai/settings/integrations.";
    else if(hint.includes("401")||hint.includes("key"))hint="Cheie OpenRouter invalida (401). Genereaza una noua pe openrouter.ai/keys.";
    else hint=`Am incercat toate cele ${DYNAMIC_FREE_MODELS.length} modele :free si toate sunt momentan pline (limitele gratis se reseteaza la cateva minute — re-testeaza peste 2-3 min). Chatul incearca oricum toata lista la fiecare mesaj. Ultima eroare: `+hint;
    box.textContent=(notes.length?notes.join(" | ")+" | ":"")+"❌ OpenRouter: "+hint;
  }catch(e){box.textContent="❌ Eroare retea: "+e.message;}
}
async function callAI(lastUser){
  const prov=getProvider();
  const box=document.getElementById("chatMessages");
  if(!lastUser){const users=[...box.querySelectorAll(".msg.user")];lastUser=users.length?users[users.length-1].textContent:"Salut";}
  const recipesCtx=allResults.slice(0,6).map(r=>`- ${r.title} (${r.match}%): ${(r.ingredients||[]).slice(0,8).join(", ")}`).join("\n")||"none yet";
  const cl=getChatLang();
  const sys=cl==="ro"
   ?`Ești un bucătar-șef român prietenos "ChefAcasă". Ingredientele userului: ${currentIngredients.join(", ")||"nespecificate"}. Rețete găsite:\n${recipesCtx}\nREGULI STRICTE: 1) Răspunde EXCLUSIV în limba română — ZERO cuvinte în engleză. 2) NU îți arăta gândirea/raționamentul, oferă DOAR răspunsul final. 3) Dă mereu RETETA COMPLETA (titlu, ingrediente cu cantitati, pasi numerotati, timp, pont). Nu intreba "vrei reteta?" - D-O direct! Daca userul zice DA, da reteta imediat.`
   :`You are friendly chef "HomeChef". User ingredients: ${currentIngredients.join(", ")||"unspecified"}. Found recipes:\n${recipesCtx}\nSTRICT RULES: 1) Answer EXCLUSIVELY in English — ZERO words in any other language. 2) NEVER show your thinking/reasoning, give ONLY the final answer. 3) Always give FULL RECIPE (title, ingredients with amounts, numbered steps, time, tip). Never ask "want the recipe?" - GIVE it directly! If user says YES, give recipe immediately.`;
  const msgs=[{role:"system",content:sys},...chatHistory.slice(-8),{role:"user",content:lastUser}];
  const typing=addMsg("bot","✍️ ...");
  let ok=false,lastErr="";
  // Pasul 0 (doar Auto): ⚡ proxy Cloudflare — chat instant, cheie secreta pe server
  if(prov==="auto"&&getProxyUrl()){
    try{
      const ans=await callProxy(msgs,900,getModel());
      typing.textContent=ans;chatHistory.push({role:"user",content:lastUser},{role:"assistant",content:ans});box.scrollTop=box.scrollHeight;ok=true;
      document.getElementById("chatModel").textContent="proxy ⚡";
    }catch(e){console.warn("proxy fail",e);lastErr="proxy: "+e.message;}
  }
  if(ok)return;
  // Provderul ♾️ nelimitat direct (fara cheie)
  if(prov==="pollinations"){
    try{
      const ans=await callPollinations(msgs,900);
      typing.textContent=ans;chatHistory.push({role:"user",content:lastUser},{role:"assistant",content:ans});box.scrollTop=box.scrollHeight;
      document.getElementById("chatModel").textContent="GPT-OSS 20B ♾️";
      return;
    }catch(e){typing.textContent="";typing.remove();addMsg("bot",(lang==="ro"?`⚠️ Nelimitat indisponibil (${e.message}). Îți dau rețeta locală 👇`:`⚠️ Unlimited unavailable (${e.message}). Local recipe 👇`));fallbackAnswer(lastUser);return;}
  }
  const key=getApiKey();
  if(!key&&prov==="openrouter"){typing.textContent="";typing.remove();addMsg("bot",lang==="ro"?"⚠️ Pune cheia OpenRouter în ⚙️ sau treci pe ♾️ Nelimitat GRATIS (fără cheie). Până atunci, rețeta locală: ":"⚠️ Add OpenRouter key or switch to Unlimited FREE. Local recipe: ");fallbackAnswer(lastUser);return;}
  const models=[getModel(),...DYNAMIC_FREE_MODELS];
  for(const model of [...new Set(models)]){
    try{
      const ctl=new AbortController();const to=setTimeout(()=>ctl.abort(),45000);
      const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json","HTTP-Referer":(location.origin||"https://localhost/"),"X-Title":"ChefAcasa"},body:JSON.stringify({model,messages:msgs,temperature:0.7,max_tokens:900}),signal:ctl.signal});
      clearTimeout(to);
      const data=await res.json();
      if(data.error){
        lastErr=data.error.message||JSON.stringify(data.error);
        console.warn("model fail",model,lastErr);
        // 404 = modelul nu mai e gratis -> incearca urmatorul, fara pauza
        // 429 = aglomerat -> asteapta 1s si incearca urmatorul
        if(res.status===429)await new Promise(r=>setTimeout(r,1200));
        continue;
      }
      const m=data.choices?.[0]?.message||{};
      const ans=(m.content||m.reasoning||"").trim();
      if(ans){typing.textContent=ans;chatHistory.push({role:"user",content:lastUser},{role:"assistant",content:ans});box.scrollTop=box.scrollHeight;ok=true;
        document.getElementById("chatModel").textContent=model.split("/").pop().replace(":free","")+" (free)";
        break;}
      else{lastErr="raspuns gol de la "+model;continue;}
    }catch(e){console.warn("model fail",model,e);lastErr=e.message;continue;}
  }
  // Fallback final: ♾️ Pollinations nelimitat (doar in mod auto)
  if(!ok&&prov==="auto"){
    try{
      typing.textContent="♾️ OpenRouter aglomerat, trec pe modul Nelimitat gratis...";
      const ans=await callPollinations(msgs,900);
      typing.textContent=ans;chatHistory.push({role:"user",content:lastUser},{role:"assistant",content:ans});box.scrollTop=box.scrollHeight;ok=true;
      document.getElementById("chatModel").textContent="GPT-OSS 20B ♾️ (backup)";
    }catch(e2){lastErr+=" | pollinations: "+e2.message;}
  }
  if(!ok){typing.textContent="";typing.remove();addMsg("bot",(lang==="ro"?`⚠️ AI online e aglomerat momentan (${(lastErr||"").slice(0,150)}). Îți dau rețeta din bucătăria locală 👇`:`⚠️ Online AI is busy (${(lastErr||"").slice(0,150)}). Here's a local recipe 👇`));fallbackAnswer(lastUser);}
}
function smartLocalRecipe(q){
  q=norm(q||"")+" "+currentIngredients.map(norm).join(" ");
  let best=null,bestScore=0;
  LOCAL_RECIPES.forEach(r=>{
    let s=0;
    const hay=(r.tags.join(" ")+" "+r.title_ro+" "+r.ingredients_ro.join(" ")).toLowerCase();
    ["oua","cartofi","pui","rosii","paste","orez","ton","ciuperci","faina","lapte","branza","ceapa","usturoi","fasole","morcov"].forEach(w=>{if(q.includes(w)&&hay.includes(w))s+=2;});
    if(q.includes("omleta")&&r.id==="local-2")s+=5;
    if(q.includes("clatite")&&r.id==="local-8")s+=5;
    if(q.includes("post")&&(r.id==="local-6"||r.id==="local-9"||r.id==="local-10"))s+=4;
    if(q.includes("rapid")||q.includes("15")||q.includes("repede")){if(r.time<=20)s+=3;}
    if(s>bestScore){bestScore=s;best=r;}
  });
  if(!best||bestScore===0)best=allResults[0]||LOCAL_RECIPES[1];
  return best;
}
function formatFullRecipe(r){
  const title=r.title||r.title_ro;
  const ings=r.ingredients||r.ingredients_ro;
  const steps=r.steps||r.steps_ro;
  if(lang==="ro")return `🍳 ${title} (⏱ ${r.time||30} min, 🍽 ${r.servings||2} portii)\n\n🧂 Ingrediente:\n- ${ings.join("\n- ")}\n\n👩‍🍳 Pasi:\n${steps.map((s,i)=>(i+1)+". "+s).join("\n")}\n\n💡 Pont: gusta de sare la final + presara patrunjel. Pofta buna! Scrie-mi alt ingredient daca vrei alta reteta.`;
  return `🍳 ${title} (${r.time||30} min, ${r.servings||2} servings)\n\nIngredients:\n- ${ings.join("\n- ")}\n\nSteps:\n${steps.map((s,i)=>(i+1)+". "+s).join("\n")}\n\nTip: enjoy! Tell me another ingredient for more.`;
}
function fallbackAnswer(q){
  const r=smartLocalRecipe(q||"");
  // normalizeaza la format comun
  const uni={title:r.title||(lang==="ro"?r.title_ro:r.title_en),ingredients:r.ingredients||(lang==="ro"?r.ingredients_ro:r.ingredients_en),steps:r.steps||(lang==="ro"?r.steps_ro:r.steps_en),time:r.time,servings:r.servings};
  addMsg("bot",formatFullRecipe(uni));
}
// ===== TOASTURI (notificari elegante in loc de alert) =====
function toast(msg,type){
  const box=document.getElementById("toasts");if(!box){alert(msg);return;}
  const d=document.createElement("div");d.className="msg toast "+(type||"info");d.textContent=msg;
  box.appendChild(d);
  setTimeout(()=>{d.style.opacity="0";d.style.transition="opacity .3s";setTimeout(()=>d.remove(),320);},2800);
}

// ===== BACKUP / RESTAURARE JSON =====
const BACKUP_KEYS=["chef_fav","chef_plan","chef_shop","chef_mine","chef_lang","chef_chat_lang","chef_or_model","chef_provider","chef_autotr"];
function exportBackup(){
  try{
    const data={};
    BACKUP_KEYS.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)data[k]=JSON.parse(v);});
    const blob=new Blob([JSON.stringify({app:"chefacasa",v:1,date:new Date().toISOString(),data},null,2)],{type:"application/json"});
    const a=document.createElement("a");
    const d=new Date(),p=n=>String(n).padStart(2,"0");
    a.href=URL.createObjectURL(blob);
    a.download=`chefacasa-backup-${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}.json`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    toast(lang==="ro"?"⬇️ Backup descărcat! Păstrează-l bine.":"⬇️ Backup downloaded!","ok");
  }catch(e){toast("❌ Eroare backup: "+e.message,"err");}
}
function importBackup(file){
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const obj=JSON.parse(rd.result);
      if(!obj||obj.app!=="chefacasa"||!obj.data)throw new Error(lang==="ro"?"Fișier invalid (nu e backup ChefAcasă).":"Invalid file (not a ChefAcasă backup).");
      if(!confirm(lang==="ro"?"Restaurezi backupul? Datele actuale din browser vor fi înlocuite.":"Restore backup? Current browser data will be replaced."))return;
      Object.keys(obj.data).forEach(k=>{if(BACKUP_KEYS.includes(k))localStorage.setItem(k,JSON.stringify(obj.data[k]));});
      lang=localStorage.getItem("chef_lang")||"ro";
      favorites=JSON.parse(localStorage.getItem("chef_fav")||"[]");
      try{plan=JSON.parse(localStorage.getItem("chef_plan")||"{}");}catch(e){plan={};}
      try{shop=JSON.parse(localStorage.getItem("chef_shop")||"[]");}catch(e){shop=[];}
      applyLang();updateFavCount();checkApi();renderPlan();renderShop();renderMine();
      document.getElementById("chatLang").value=localStorage.getItem("chef_chat_lang")||"auto";
      toast(lang==="ro"?"✅ Backup restaurat cu succes!":"✅ Backup restored!","ok");
    }catch(e){toast("❌ "+e.message,"err");}
  };
  rd.readAsText(file);
}

// ===== GHID PRIM UTILIZATOR =====
const INTRO_STEPS=[
 {e:"🔍",t:"1. Caută după ingrediente",d:"Scrie ce ai în frigider (ex: ouă, cartofi) și primești rețete cu calorii, traducere și detalii complete."},
 {e:"📅",t:"2. Meniu + listă singură",d:"Pune rețete în meniul săptămânal, iar lista de cumpărături grupată pe raioane se face automat."},
 {e:"💬",t:"3. Vorbește cu asistentul",d:"Întreabă ce să gătești — asistentul încearcă automat toate modelele AI gratis."}
];
let introIdx=0;
function showIntro(force){
  if(!force&&localStorage.getItem("chef_intro")==="1")return;
  introIdx=0;renderIntro();
  document.getElementById("intro").classList.remove("hidden");
}
function renderIntro(){
  const s=INTRO_STEPS[introIdx];
  document.getElementById("introEmoji").textContent=s.e;
  document.getElementById("introTitle").textContent=s.t;
  document.getElementById("introText").textContent=s.d;
  document.getElementById("introDots").textContent=INTRO_STEPS.map((_,i)=>i===introIdx?"●":"○").join(" ");
  document.getElementById("introPrev").disabled=introIdx===0;
  document.getElementById("introNext").textContent=introIdx===INTRO_STEPS.length-1?"Gata ✅":"Următorul ▶";
}
function closeIntro(){document.getElementById("intro").classList.add("hidden");localStorage.setItem("chef_intro","1");}

// ===== INSTALARE PWA =====
let deferredPrompt=null;
function initInstall(){
  const btn=document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;btn.classList.remove("hidden");});
  btn.onclick=async()=>{
    if(!deferredPrompt){toast(lang==="ro"?"Deschide meniul browserului → „Adaugă pe ecranul de pornire”.":"Open browser menu → 'Add to Home Screen'.","info");return;}
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;deferredPrompt=null;btn.classList.add("hidden");
  };
  window.addEventListener("appinstalled",()=>btn.classList.add("hidden"));
}

// ===== TABURI =====
function showTab(name){
  ["search","plan","list","mine"].forEach(n=>document.getElementById("sec-"+n).classList.toggle("hidden",n!==name));
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
  if(name==="plan")renderPlan();if(name==="list")renderShop();if(name==="mine")renderMine();
  window.scrollTo({top:0,behavior:"smooth"});
}

// ===== CALORII (estimare locala, orientativ) + DIETA =====
const KCAL100={"pulpa de pui":200,"piept de pui":165,pui:170,porc:250,vita:200,carne:220,miel:280,curcan:160,peste:150,somon:200,ton:130,macrou:200,bacon:400,sunca:280,salam:450,carnati:350,ou:155,oua:155,cartof:77,cartofi:77,orez:360,paste:360,spaghete:360,faina:364,malai:360,gris:360,pesmet:390,paine:260,bagheta:275,lapte:60,iaurt:80,branza:300,telemea:270,mozzarella:280,parmezan:430,cascaval:350,smantana:200,frisca:300,unt:750,ulei:884,zahar:400,miere:305,gem:270,ciocolata:550,cacao:230,fasole:330,linte:350,naut:360,mazare:80,porumb:100,morcov:41,morcovi:41,ceapa:40,cepe:40,usturoi:149,rosie:18,rosii:18,bulion:80,ardei:31,dovlecel:17,vanata:25,ciuperci:25,salata:15,spanac:23,varza:25,conopida:25,broccoli:35,castravete:15,masline:150,lamaie:29,portocala:47,mar:52,banana:89,avocado:160,nuci:650,alune:570,stafide:300,apa:0,sare:0,piper:250,vegeta:200,maioneza:680,mustar:160,ketchup:100,otet:20,vin:80,patrunjel:35,marar:40,leustean:30,busuioc:25,chicken:170,beef:200,pork:250,fish:150,egg:155,eggs:155,potato:77,potatoes:77,rice:360,pasta:360,flour:364,milk:60,cheese:300,butter:750,oil:884,sugar:400,chocolate:550,beans:330,tomato:18,tomatoes:18,onion:40,garlic:149,carrot:41,mushroom:25,bread:260};
const KCAL_KEYS=Object.keys(KCAL100).sort((a,b)=>b.length-a.length);
const PIECE_G={"ou":60,"oua":60,egg:60,eggs:60,cartof:150,cartofi:150,potato:150,potatoes:150,ceapa:100,cepe:100,onion:100,rosie:120,rosii:120,tomato:120,tomatoes:120,morcov:80,morcovi:80,carrot:80,ardei:120,pepper:120,dovlecel:200,zucchini:200,mozzarella:125,bagheta:250,baguette:250,mar:150,apple:150,banana:120,lamaie:60,lemon:60,avocado:150,"piept de pui":180,"chicken breast":180,conserva:240,ulei:15,oil:15,sare:3,salt:3,piper:2,patrunjel:10,marar:10,leustean:10,busuioc:5,cimbru:3,oregano:3,boia:5,otet:15,mustar:15,miere:20,honey:20};
const UNIT_G={g:1,gr:1,kg:1000,mg:0.001,ml:1,l:1000,cl:10,lingura:15,linguri:15,lg:15,lingurita:5,lingurite:5,lt:5,cana:200,cani:200,cup:200,cups:200,pahar:200,catel:5,catei:5,clove:5,felie:30,felii:30,slice:30,conserva:240,conserve:240,cutie:240,plic:10,praf:1,legatura:50,cub:15};
function tokens(s){return norm(s).split(/[^a-z]+/).filter(Boolean);}
function hasTok(t,words){const ts=new Set(tokens(t));return words.some(w=>ts.has(w));}
function qtyGrams(line){
  const n=norm(line);
  const m=n.match(/(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?|\d+\s*-\s*\d+(?:[.,]\d+)?)\s*([a-z]*)/);
  let qty=1,unit="";
  if(m){let q=m[1];if(q.includes("-")&&!q.includes("/")){const p=q.split("-").map(x=>parseFloat(x.replace(",",".")));qty=(p[0]+p[1])/2;}else qty=parseNum(q);unit=(m[2]||"").replace(/\.$/,"");}
  if(UNIT_G[unit])return qty*UNIT_G[unit];
  // bucata implicita dupa ingredient (merge si la plural / fara unitate: "4 oua", "ulei", "2 cepe")
  for(const k of Object.keys(PIECE_G).sort((a,b)=>b.length-a.length))if(n.includes(k))return qty*PIECE_G[k];
  return qty*100;
}
function kcalOf(line){
  const n=norm(line);
  let kcal100=100;
  for(const k of KCAL_KEYS)if(n.includes(k)){kcal100=KCAL100[k];break;}
  if(/conserva|cutie|doza/.test(n)){if(n.includes("fasole"))kcal100=110;else if(n.includes("naut"))kcal100=120;else if(n.includes("porumb"))kcal100=100;else if(n.includes("ton"))kcal100=130;else if(n.includes("ros"))kcal100=25;}
  return qtyGrams(line)/100*kcal100;
}
function kcalPerServing(r){
  if(r._kcal)return r._kcal;
  try{const tot=(r.ingredients||[]).reduce((s,l)=>s+kcalOf(l),0);r._kcal=tot/Math.max(1,(r.servings||4));}catch(e){r._kcal=300;}
  return r._kcal;
}
const W_MEAT=["pui","chicken","pulpa","pulpe","piept","breast","porc","pork","bacon","sunca","ham","carnat","carnati","mititei","vita","beef","carne","meat","miel","lamb","curcan","turkey","rata","duck","peste","fish","somon","salmon","ton","tuna","pastrav","macrou","crap","salau","tonul"];
const W_FISH=["peste","fish","somon","salmon","ton","tuna","pastrav","macrou","crap","salau","stiuca","cod","merluciu"];
const W_DAIRY=["lapte","milk","branza","cheese","telemea","cascaval","mozzarella","parmezan","smantana","frisca","iaurt","yogurt","zer","mascarpone","ricotta"];
const W_EGG=["ou","oua","ouale","egg","eggs","galbenus","albus"];
const W_HONEY=["miere","honey"];
const W_GLUTEN=["faina","flour","paste","pasta","spaghete","spaghetti","macaroane","paine","bread","bagheta","baguette","gris","pesmet","aluat","cuscus","couscous","taietei","lasagna","chifle","covrigi","biscuiti","crutoane","lipie","tortilla"];
function getDiet(r){
  if(r._diet)return r._diet;
  const tx=norm((r.title||"")+" "+(r.ingredients||[]).join(" "));
  const meat=hasTok(tx,W_MEAT)||tx.includes("fructe de mare")||tx.includes("seafood")||hasTok(tx,["creveti","shrimp"]);
  const fish=!meat&&hasTok(tx,W_FISH);
  let dairy=hasTok(tx,W_DAIRY)||tx.includes("sour cream");
  if(hasTok(tx,["arahide","peanut"]))dairy=hasTok(tx,W_DAIRY.filter(w=>w!=="unt"&&w!=="butter"))||tx.includes("sour cream");
  else dairy=dairy||hasTok(tx,["unt","butter"]);
  const egg=hasTok(tx,W_EGG),hon=hasTok(tx,W_HONEY),glu=hasTok(tx,W_GLUTEN);
  const vegetarian=!meat&&!fish,post=vegetarian&&!dairy&&!egg&&!hon;
  r._diet={vegetarian,post,gluten:!glu};
  return r._diet;
}
function dietLbl(r){const d=getDiet(r);let s=d.post?"🌱 Post":d.vegetarian?"🥬 Vegetarian":"";if(d.gluten)s+=(s?" • ":"")+"🌾 GF";return s||"🍖";}

// ===== PORTII =====
function parseNum(s){s=(""+s).replace(",",".");if(s.includes("/")){const p=s.split("/").map(Number);if(p[1])return p[0]/p[1];}return parseFloat(s)||0;}
function fmtQ(x){const r=Math.round(x*10)/10;if(!isFinite(r))return "0";if(Number.isInteger(r))return ""+r;return (""+r).replace(".",",");}
function scaleIngredient(line,f){
  return line.replace(/(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?|\d+\s*-\s*\d+(?:[.,]\d+)?)/g,m=>{
    if(m.includes("-")&&!m.includes("/")){const p=m.split("-").map(parseNum);return fmtQ(p[0]*f)+"–"+fmtQ(p[1]*f);}
    return fmtQ(parseNum(m)*f);
  });
}
function changePortions(d){
  const r=window._currentModal;if(!r||!r._pristine)return;
  const ns=Math.max(1,Math.min(24,(r.servings||r._pristine.serv)+d));
  r.servings=ns;r._factor=ns/r._pristine.serv;
  const scaled=r._pristine.ings.map(l=>scaleIngredient(l,r._factor));
  r._orig.ingredients=scaled;delete r._trans_ro;delete r._trans_en;delete r._kcal;
  document.getElementById("portLbl").textContent=ns;
  document.getElementById("servLbl").textContent=ns;
  document.getElementById("trTitle").textContent=r._orig.title;
  document.getElementById("trIngs").innerHTML=scaled.map(i=>`<li>${i}</li>`).join("");
  const st=document.getElementById("trStatus");if(st)st.textContent=`⚖️ Cantități pentru ${ns} porții. Apasă Tradu din nou dacă vrei traducerea.`;
}

// ===== MOD GATIRE =====
let cookSteps=[],cookIdx=0,cookTimer=null,cookLeft=0;
function openCook(id){
  const r=findRecipe(id);if(!r)return;
  document.getElementById("modal").classList.add("hidden");stopSpeak();
  const titleEl=document.getElementById("trTitle"),stepEls=[...document.querySelectorAll("#trSteps li")];
  document.getElementById("cookTitle").textContent=titleEl?titleEl.textContent:r.title;
  cookSteps=stepEls.length?stepEls.map(li=>li.textContent):(r.steps||[]);
  cookIdx=0;cookReset();
  document.getElementById("cookMode").classList.remove("hidden");
  cookGo(0);
}
function cookGo(i){
  if(!cookSteps.length)return;
  cookIdx=Math.max(0,Math.min(cookSteps.length-1,i));
  document.getElementById("cookCount").textContent=`Pasul ${cookIdx+1} din ${cookSteps.length}`;
  document.getElementById("cookText").textContent=cookSteps[cookIdx];
  document.getElementById("cookProg").style.width=Math.round((cookIdx+1)/cookSteps.length*100)+"%";
}
function speakCookStep(){
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(document.getElementById("cookText").textContent);
    u.lang=lang==="ro"?"ro-RO":"en-US";
    speechSynthesis.speak(u);
  }catch(e){}
}
function cookStart(){
  cookReset();
  const mins=Math.max(1,Math.min(180,+document.getElementById("cookMin").value||5));
  cookLeft=mins*60;tickCook();
  cookTimer=setInterval(()=>{cookLeft--;tickCook();if(cookLeft<=0){cookReset();beep();speakText(lang==="ro"?"Gata! Timpul a expirat.":"Done! Time is up.");}},1000);
}
function tickCook(){const m=Math.floor(cookLeft/60),s=cookLeft%60;document.getElementById("cookClock").textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");}
function cookReset(){if(cookTimer){clearInterval(cookTimer);cookTimer=null;}cookLeft=+document.getElementById("cookMin").value*60||300;tickCook();}
function closeCook(){cookReset();try{speechSynthesis.cancel();}catch(e){}document.getElementById("cookMode").classList.add("hidden");}
function beep(){try{const ctx=new (window.AudioContext||window.webkitAudioContext)();[0,300,600].forEach(t=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=880;const s=ctx.currentTime+t/1000;g.gain.setValueAtTime(0.001,s);g.gain.exponentialRampToValueAtTime(0.5,s+0.05);g.gain.exponentialRampToValueAtTime(0.001,s+0.25);o.start(s);o.stop(s+0.3);});}catch(e){}}
function speakText(txt){try{const u=new SpeechSynthesisUtterance(txt);u.lang=lang==="ro"?"ro-RO":"en-US";speechSynthesis.speak(u);}catch(e){}}

// ===== MENIU SAPTAMANAL + LISTA CUMPARATURI =====
const DAYS=["Luni","Marți","Miercuri","Joi","Vineri","Sâmbătă","Duminică"];
let plan={};try{plan=JSON.parse(localStorage.getItem("chef_plan")||"{}");}catch(e){plan={};}
let shop=[];try{shop=JSON.parse(localStorage.getItem("chef_shop")||"[]");}catch(e){shop=[];}
function savePlan(){localStorage.setItem("chef_plan",JSON.stringify(plan));}
function saveShop(){localStorage.setItem("chef_shop",JSON.stringify(shop));}
function poolRecipes(){const m=new Map();[...allResults,...favorites,...getMine().map(mineToLocal)].forEach(r=>{if(r&&r.id)m.set(r.id,r);});return[...m.values()];}
function findRecipe(id){return poolRecipes().find(r=>r.id===id);}
function renderPlan(){
  const g=document.getElementById("planGrid");if(!g)return;g.innerHTML="";
  const pool=poolRecipes();
  DAYS.forEach((d,i)=>{
    const cur=plan[i]?findRecipe(plan[i]):null;
    const card=document.createElement("div");card.className="day-card";
    card.innerHTML=`<h4>${d}</h4><select data-day="${i}"><option value="">— alege rețeta —</option>${pool.map(r=>`<option value="${r.id}" ${plan[i]===r.id?"selected":""}>${(r.emoji||"🍲")} ${r.title}</option>`).join("")}</select>${cur?`<div class="day-pick">${cur.emoji||"🍲"} <b>${cur.title}</b><br><small>⏱ ${cur.time||30} min • 🔥 ~${Math.round(kcalPerServing(cur))} kcal</small> <a href="#" data-del="${i}">✖</a></div>`:""}`;
    g.appendChild(card);
  });
  g.querySelectorAll("select").forEach(s=>s.onchange=()=>{const day=s.dataset.day;if(s.value)plan[day]=s.value;else delete plan[day];savePlan();rebuildAutoShop();renderPlan();});
  g.querySelectorAll("[data-del]").forEach(a=>a.onclick=(e)=>{e.preventDefault();delete plan[a.dataset.del];savePlan();rebuildAutoShop();renderPlan();});
  const n=Object.keys(plan).length,pc=document.getElementById("planCount");
  pc.textContent=n||"";pc.classList.toggle("hidden",!n);
}
function autoPlan(){
  let pool=allResults.length?[...allResults]:[...favorites,...getMine().map(mineToLocal)];
  if(!pool.length)pool=[...LOCAL_RECIPES.map(r=>({...r,source:"local",match:100,title:r.title_ro,category:r.category_ro,ingredients:r.ingredients_ro,steps:r.steps_ro}))];
  pool=[...pool].sort(()=>Math.random()-0.5);
  for(let i=0;i<7;i++)plan[i]=pool[i%pool.length].id;
  savePlan();rebuildAutoShop();renderPlan();showTab("plan");
}
function addToPlan(){
  const r=window._currentModal;if(!r)return;
  const day=document.getElementById("planDay").value;
  if(!poolRecipes().some(x=>x.id===r.id))allResults.push(r);
  plan[day]=r.id;savePlan();rebuildAutoShop();renderPlan();
  toast((lang==="ro"?`✅ ${r.title} → ${DAYS[day]}`:`✅ ${r.title} → ${DAYS[day]}`),"ok");
}
function rebuildAutoShop(){
  shop=shop.filter(it=>it.src!=="auto");
  const counts={};
  Object.keys(plan).forEach(day=>{
    const r=findRecipe(plan[day]);if(!r)return;
    (r._pristine?r._pristine.ings:r.ingredients||[]).forEach(l=>{const k=norm(l);counts[k]=counts[k]||{t:l,n:0};counts[k].n++;});
  });
  Object.values(counts).forEach(c=>shop.push({t:c.n>1?`${c.t} (×${c.n})`:c.t,done:false,src:"auto"}));
  saveShop();renderShop();
}
// ===== RAIOANE MAGAZIN =====
const RAIOANE=[
 {e:"🥩",n:"Carne, Pește & Mezeluri",k:["pui","chicken","pulpa","pulpe","piept","breast","porc","pork","vita","beef","miel","lamb","curcan","turkey","rata","duck","carne","meat","peste","fish","somon","salmon","ton","tuna","pastrav","macrou","crap","salau","creveti","shrimp","fructe de mare","seafood","bacon","sunca","ham","salam","carnat","mititei","prosciutto","mezel"]},
 {e:"🧀",n:"Lactate & Ouă",k:["lapte","milk","branza","cheese","telemea","cascaval","mozzarella","parmezan","parmesan","cheddar","feta","brie","gouda","smantana","sour cream","frisca","cream","unt","butter","iaurt","yogurt","zer","mascarpone","ricotta","ou","oua","egg","eggs","galbenus","albus"]},
 {e:"🍞",n:"Panificație",k:["paine","bread","bagheta","baguette","lipie","chifle","covrigi","pesmet","crutoane","foietaj","aluat","tortilla","croissant"]},
 {e:"🥦",n:"Legume & Fructe",k:["cartof","potato","ceapa","cepe","onion","usturoi","garlic","morcov","carrot","rosie","rosii","tomato","tomatoes","ardei","pepper","dovlecel","zucchini","vanata","eggplant","ciuperci","mushroom","salata","lettuce","spanac","spinach","varza","cabbage","conopida","broccoli","castravete","cucumber","telina","celery","sfecla","ridiche","dovleac","pumpkin","praz","fasole verde","mazare verde","lamaie","lemon","portocala","orange","mar ","apple","para","banana","avocado","struguri","capsuni","afine","piersica","patrunjel","parsley","marar","dill","leustean","busuioc","basil","cimbru","thyme","salvie","rozmarin","menta","ghimbir","ginger","ardei iute","chilli","chili","masline","olives","legume","vegetables","fructe","fruit"]},
 {e:"🫘",n:"Băcănie (paste, orez, conserve)",k:["orez","rice","paste","pasta","spaghete","spaghetti","macaroane","taietei","noodles","lasagna","cuscus","couscous","faina","flour","malai","gris","zahar","sugar","fasole","beans","linte","lentil","naut","mazare","porumb","corn","conserva","cutie","supa","stock","bulion","sos de rosii","fulgi","musli","cereale","cereal"]},
 {e:"🧂",n:"Condimente, Ulei & Sosuri",k:["sare","salt","piper","ulei","oil","otet","vinegar","mustar","mustard","ketchup","maioneza","mayo","sos","sauce","boia","paprika","scortisoara","cinnamon","oregano","dafin","vegeta","drojdie","yeast","bicarbonat","praf de copt","esenta","vanilie","cuisoare","chimion","curry","turmeric","soia","worcester"]},
 {e:"🍫",n:"Dulciuri & Snacks",k:["ciocolata","chocolate","cacao","cocoa","biscuiti","napolitane","inghetata","gem","dulceata","jam","miere","honey","nuci","alune","migdale","stafide","seminte","cafea","coffee","ceai","tea","chips","snacks","alune"]}
];
function catShopItem(text){
  const n=" "+norm(text)+" ",ts=new Set(tokens(text));
  for(let i=0;i<RAIOANE.length;i++){
    for(const k of RAIOANE[i].k){
      if(k.length<=3){if(ts.has(k))return i;}
      else if(n.includes(k))return i;
    }
  }
  return RAIOANE.length; // Altele
}
const RAION_ALTELE={e:"🧴",n:"Altele"};
function raionLabel(i){return i<RAIOANE.length?RAIOANE[i]:RAION_ALTELE;}
function renderShop(){
  const ul=document.getElementById("shopList");if(!ul)return;ul.innerHTML="";
  const groups=RAIOANE.map(()=>[]);groups.push([]); // ultimul = Altele
  shop.forEach((it,i)=>groups[catShopItem(it.t)].push({it,i}));
  groups.forEach((g,gi)=>{
    if(!g.length)return;
    const L=raionLabel(gi),left=g.filter(x=>!x.it.done).length;
    const h=document.createElement("li");h.className="shop-group";
    h.innerHTML=`${L.e} <b>${L.n}</b> <span class="hint">${left}/${g.length}</span>`;
    ul.appendChild(h);
    g.forEach(({it,i})=>{
      const li=document.createElement("li");if(it.done)li.className="done";
      li.innerHTML=`<input type="checkbox" ${it.done?"checked":""}><span style="flex:1">${it.t}</span><a href="#" style="color:#999">✖</a>`;
      li.querySelector("input").onchange=(e)=>{it.done=e.target.checked;saveShop();renderShop();};
      li.querySelector("a").onclick=(e)=>{e.preventDefault();shop.splice(i,1);saveShop();renderShop();};
      ul.appendChild(li);
    });
  });
  if(!shop.length)ul.innerHTML=`<p class="hint">${lang==="ro"?"Lista e goală. Pune rețete în meniu sau adaugă manual.":"List is empty. Add recipes to the plan or add manually."}</p>`;
  const left=shop.filter(x=>!x.done).length,lc=document.getElementById("listCount");
  lc.textContent=left||"";lc.classList.toggle("hidden",!left);
}
function addManualItem(){const v=document.getElementById("manualItem").value.trim();if(!v)return;shop.push({t:v,done:false,src:"manual"});document.getElementById("manualItem").value="";saveShop();renderShop();}
function shopText(){
  const head="🛒 "+(lang==="ro"?"Lista mea de cumpărături (ChefAcasă)":"My shopping list (HomeChef)")+"\n";
  const groups=RAIOANE.map(()=>[]);groups.push([]);
  shop.forEach(it=>groups[catShopItem(it.t)].push(it));
  let out=head;
  groups.forEach((g,gi)=>{
    if(!g.length)return;
    const L=raionLabel(gi);
    out+=`\n${L.e} ${L.n}\n`+g.map(s=>`${s.done?"[x]":"[ ]"} ${s.t}`).join("\n")+"\n";
  });
  return out;
}
function copyShop(){const t=shopText();if(navigator.clipboard)navigator.clipboard.writeText(t).then(()=>toast("📋 Copiat!","ok")).catch(()=>toast("❌ Nu am putut copia.","err"));else{const ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();toast("📋 Copiat!","ok");}}
function waShop(){window.open("https://wa.me/?text="+encodeURIComponent(shopText()),"_blank");}

// ===== RETETE PROPRII =====
function getMine(){try{return JSON.parse(localStorage.getItem("chef_mine")||"[]");}catch(e){return[];}}
function saveMine(a){localStorage.setItem("chef_mine",JSON.stringify(a));const mc=document.getElementById("mineCount");mc.textContent=a.length||"";mc.classList.toggle("hidden",!a.length);}
function mineToLocal(m){
  const words=(m.title+" "+m.ings.join(" ")).toLowerCase().split(/[^a-zăâîșț]+/);
  return{id:m.id,emoji:m.emoji||"🍲",title_ro:m.title,title_en:m.title,category_ro:m.cat||"Rețetele mele",category_en:m.cat||"My recipes",time:m.time,servings:m.serv,difficulty_ro:"—",difficulty_en:"—",ingredients_ro:m.ings,ingredients_en:m.ings,steps_ro:m.steps,steps_en:m.steps,tags:[...new Set(words.filter(w=>w.length>2))],source:"mine"};
}
let editingMine=null;
function openMineForm(id){
  editingMine=id||null;
  const m=id?getMine().find(x=>x.id===id):null;
  document.getElementById("mineFormTitle").textContent=m?"Editează rețeta":"Rețetă nouă";
  document.getElementById("fTitle").value=m?m.title:"";
  document.getElementById("fEmoji").value=m?(m.emoji||""):"";
  document.getElementById("fTime").value=m?m.time:30;
  document.getElementById("fServ").value=m?m.serv:4;
  document.getElementById("fCat").value=m?(m.cat||""):"";
  document.getElementById("fIngs").value=m?m.ings.join("\n"):"";
  document.getElementById("fSteps").value=m?m.steps.join("\n"):"";
  document.getElementById("mineModal").classList.remove("hidden");
}
function saveMineForm(){
  const title=document.getElementById("fTitle").value.trim();
  const ings=document.getElementById("fIngs").value.split("\n").map(s=>s.trim()).filter(Boolean);
  const steps=document.getElementById("fSteps").value.split("\n").map(s=>s.trim()).filter(Boolean);
  if(!title||!ings.length||!steps.length){toast(lang==="ro"?"Completează titlu + minim 1 ingredient + 1 pas!":"Fill title + 1 ingredient + 1 step!","err");return;}
  const all=getMine();
  const obj={id:editingMine||("mine-"+Date.now()),title,emoji:document.getElementById("fEmoji").value.trim()||"🍲",time:+document.getElementById("fTime").value||30,serv:+document.getElementById("fServ").value||4,cat:document.getElementById("fCat").value.trim(),ings,steps};
  const ix=all.findIndex(x=>x.id===obj.id);
  if(ix>=0)all[ix]=obj;else all.push(obj);
  saveMine(all);renderMine();
  document.getElementById("mineModal").classList.add("hidden");
}
function delMine(id){if(!confirm(lang==="ro"?"Ștergi rețeta?":"Delete recipe?"))return;saveMine(getMine().filter(x=>x.id!==id));Object.keys(plan).forEach(d=>{if(plan[d]===id)delete plan[d];});savePlan();renderMine();renderPlan();}
function renderMine(){
  const g=document.getElementById("mineGrid");if(!g)return;g.innerHTML="";
  const all=getMine();
  const mc=document.getElementById("mineCount");mc.textContent=all.length||"";mc.classList.toggle("hidden",!all.length);
  if(!all.length){g.innerHTML=`<p class="hint" style="grid-column:1/-1">${lang==="ro"?"Nicio rețetă încă. Apasă „+ Adaugă rețetă”.":"No recipes yet. Press '+ Add recipe'."}</p>`;return;}
  all.map(mineToLocal).forEach(r=>{
    const d=document.createElement("div");d.className="card";
    d.innerHTML=`<div class="card-img">${r.emoji}</div><div class="card-body"><h3>${r.title_ro}</h3><div class="meta"><span class="badge">⏱ ${r.time} min</span><span class="badge">🔥 ~${Math.round(kcalPerServing({...r,ingredients:r.ingredients_ro,servings:r.servings}))} kcal</span></div><div class="card-actions"><button class="btn primary small">Deschide</button><button class="btn small">✏️</button><button class="btn small">🗑</button></div></div>`;
    const btns=d.querySelectorAll("button");
    btns[0].onclick=()=>{allResults.push(r);openModal(r);};
    btns[1].onclick=(e)=>{e.stopPropagation();openMineForm(r.id);};
    btns[2].onclick=(e)=>{e.stopPropagation();delMine(r.id);};
    d.onclick=()=>{if(!allResults.some(x=>x.id===r.id))allResults.push(r);openModal(r);};
    g.appendChild(d);
  });
}

// ===== SHARE RETETA =====
function recipeText(){
  const t=document.getElementById("trTitle")?.textContent||"";
  const ings=[...document.querySelectorAll("#trIngs li")].map(li=>"- "+li.textContent).join("\n");
  const steps=[...document.querySelectorAll("#trSteps li")].map((li,i)=>(i+1)+". "+li.textContent).join("\n");
  return `🍳 ${t} (ChefAcasă)\n\n🧂 Ingrediente:\n${ings}\n\n👩‍🍳 Pași:\n${steps}`;
}
function waRecipe(){window.open("https://wa.me/?text="+encodeURIComponent(recipeText()),"_blank");}
window.openById=openById;window.toggleFavById=toggleFavById;window.askAbout=askAbout;window.translateRecipe=translateRecipe;window.showOriginal=showOriginal;window.speakRecipe=speakRecipe;window.stopSpeak=stopSpeak;window.changePortions=changePortions;window.openCook=openCook;window.addToPlan=addToPlan;window.waRecipe=waRecipe;
