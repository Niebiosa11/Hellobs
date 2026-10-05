const panelFileUrls=new Set();
const supabaseConfig = window.HBS_SUPABASE || {};
const supabaseReady = Boolean(
  window.supabase &&
  supabaseConfig.url &&
  supabaseConfig.anonKey &&
  !supabaseConfig.url.includes("TU_WKLEJ") &&
  !supabaseConfig.anonKey.includes("TU_WKLEJ")
);
const hbsDb = supabaseReady ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})}}) : null;

const navItems = [
  ["dashboard","Panel Główny"],
  ["onlineBookings","Rezerwacje online"],
  ["availability","Dostępne terminy"],
  ["clients","Klientki"],
  ["consultations","Konsultacje"],
  ["visits","Wizyty"],
  ["colors","Koloryzacje"],
  ["photos","Zdjęcia"],
  ["contracts","Umowy"],
  ["training","Szkolenia"],
  ["settings","Użytkownicy / ustawienia"]
];
const navIcons = {
  dashboard:`<svg viewBox="0 0 24 24" fill="none"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/></svg>`,
  onlineBookings:`<svg viewBox="0 0 24 24" fill="none"><path d="M7 3v4M17 3v4M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><path d="m8 14 2 2 5-5"/></svg>`,
  availability:`<svg viewBox="0 0 24 24" fill="none"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/></svg>`,
  clients:`<svg viewBox="0 0 24 24" fill="none"><path d="M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4"/><circle cx="12" cy="9" r="3"/><path d="M20 19c0-1.7-1-3.1-2.5-3.7"/><path d="M17 6.4a2.5 2.5 0 0 1 0 5.2"/><path d="M4 19c0-1.7 1-3.1 2.5-3.7"/><path d="M7 6.4a2.5 2.5 0 0 0 0 5.2"/></svg>`,
  consultations:`<svg viewBox="0 0 24 24" fill="none"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 10h8M8 14h5"/></svg>`,
  visits:`<svg viewBox="0 0 24 24" fill="none"><path d="M7 3v4M17 3v4M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><path d="m9 15 2 2 4-5"/></svg>`,
  colors:`<svg viewBox="0 0 24 24" fill="none"><path d="M12 3s6 6.1 6 11a6 6 0 0 1-12 0c0-4.9 6-11 6-11Z"/></svg>`,
  photos:`<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 16-5-5-4 4-2-2-5 6"/></svg>`,
  contracts:`<svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v6h5"/><path d="M10 13h6M10 17h6"/></svg>`,
  training:`<svg viewBox="0 0 24 24" fill="none"><path d="m3 8 9-4 9 4-9 4z"/><path d="M7 10v5c2 2 8 2 10 0v-5"/><path d="M21 8v6"/></svg>`,
  settings:`<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3"/><path d="M5 21c0-3.3 3.1-6 7-6s7 2.7 7 6"/><path d="M19 4v4M21 6h-4"/></svg>`
};
function navIcon(id){
  return navIcons[id] || `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8"/></svg>`;
}
const prices = {
  "Do 50 g": { Nano:500, Micro:600, Mini:null, Standard:null },
  "Do 100 g": { Nano:650, Micro:700, Mini:600, Standard:550 },
  "Do 150 g": { Nano:800, Micro:900, Mini:750, Standard:700 },
  "Do 200 g": { Nano:900, Micro:1200, Mini:850, Standard:800 }
};
let session = null;
let activeClientId = null;
let activeClientTab = "consultations";
let consult = { step:0, answers:{}, notes:[], clientInfo:[], addons:[] };
let state = load();
state.pastRevenues ||= [];
let onlineBookings = [];
let onlineBookingsLoaded = false;
let availabilitySlots = [];
let availabilitySlotsLoaded = false;
let slotCalendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedSlotDate = today();
let dashboardDateKey = "";
const workRules = {
  2:{ start:"09:00", end:"19:00" },
  3:{ start:"09:00", end:"19:00" },
  4:{ start:"09:00", end:"19:00" },
  5:{ start:"09:00", end:"13:00" }
};
const closedHolidayKeys = ["01-01","01-06","05-01","05-03","08-15","11-01","11-11","12-25","12-26"];

function seed(){ return {clients:[],training:[],pastRevenues:[]}; }
function load(){ return seed(); }
let cloudVersion=0, saveQueue=Promise.resolve(), saveBlocked=false, authGeneration=0;
function save(){
 if(!isAdmin()||saveBlocked) return;
 const snapshot=JSON.parse(JSON.stringify(state)), generation=authGeneration;
 document.querySelector('#syncStatus').textContent='Zapisuję…';
 saveQueue=saveQueue.then(async()=>{
  if(generation!==authGeneration||!isAdmin()||saveBlocked)return;
  const {data,error}=await hbsDb.rpc('hbs_panel_write',{p_expected:cloudVersion,p_body:snapshot});
  if(error){saveBlocked=true; document.querySelector('#syncStatus').textContent='Zapis nie powiódł się. Nie zamykaj karty. Zachowaj kopię roboczą i odśwież panel.';return;}
  cloudVersion=data; document.querySelector('#syncStatus').textContent='Zapisano w bezpiecznej bazie';
 }).catch(()=>{saveBlocked=true;document.querySelector('#syncStatus').textContent='Błąd zapisu. Zachowaj kopię roboczą.';});
}
function $(selector, root=document){ return root.querySelector(selector); }
function $all(selector, root=document){ return [...root.querySelectorAll(selector)]; }
function isAdmin(){ return session && session.role === "admin"; }
function canDelete(){ return isAdmin(); }
function esc(value=""){
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
}
function today(){ return slotCalendarDateKey(new Date()); }
function moneyNumber(value){
  const text = String(value || "").replace(",", ".");
  const match = text.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}
function depositAmount(value){
  const amount = moneyNumber(value);
  return amount ? `${Math.round(amount * 0.6)} zł` : "Do uzupełnienia";
}
const hairGramPrices = {
  "Rosyjskie": {"40cm":12,"45cm":12,"50cm":13,"55cm":13.5,"60cm":14,"65cm":14.5,"70cm":15},
  "Słowiańskie Lux": {"40cm":14,"45cm":14,"50cm":14.5,"55cm":15.5,"60cm":16,"65cm":17,"70cm":18},
  "Słowiańskie Premium": {"40cm":16,"45cm":16,"50cm":17,"55cm":17.5,"60cm":18,"65cm":19,"70cm":20},
  "Dziewicze polskie": {"40cm":24,"45cm":32.5,"50cm":40,"55cm":45,"60cm":45,"65cm":45,"70cm":45}
};
function gramsNumber(value){
  const n = moneyNumber(value);
  return n || 0;
}
function gramsBracket(grams){
  if(grams <= 50) return "Do 50 g";
  if(grams <= 100) return "Do 100 g";
  if(grams <= 150) return "Do 150 g";
  return "Do 200 g";
}
function setupPrice(method, grams){
  const bracket = gramsBracket(grams);
  if(method.startsWith("Keratyna")){
    const connection = method.replace("Keratyna ", "");
    const correction = prices[bracket]?.[connection] || 0;
    return Math.max(0, correction - 50);
  }
  if(method === "Tape On"){
    if(grams <= 100) return 450;
    if(grams <= 150) return 500;
    return 600;
  }
  if(method === "Bio Tape KLASIC"){
    if(grams >= 200) return 890;
    if(grams > 100) return 590;
    return 490;
  }
  if(method === "Bio Tape MAGIC"){
    if(grams >= 200) return 1000;
    if(grams > 100) return 690;
    return 590;
  }
  return 0;
}
function formField(form, name){
  return form.querySelector(`[name="${name}"]`);
}
function calculateInstallPrice(form){
  const method = formField(form, "method").value;
  const hairKind = formField(form, "hairKind")?.value || "Rosyjskie";
  const length = formField(form, "length").value;
  const grams = gramsNumber(formField(form, "grams").value);
  const hairPrice = (hairGramPrices[hairKind]?.[length] || 0) * grams;
  const workPrice = setupPrice(method, grams);
  const extra = formField(form, "specialHair")?.checked ? 100 : 0;
  const total = Math.round(hairPrice + workPrice + extra);
  formField(form, "price").value = total ? `${total} zł` : "";
  const hairOut = form.querySelector("[data-hair-cost]");
  const workOut = form.querySelector("[data-work-cost]");
  const extraOut = form.querySelector("[data-extra-cost]");
  const depositOut = form.querySelector("[data-deposit]");
  if(hairOut) hairOut.textContent = hairPrice ? `${Math.round(hairPrice)} zł` : "-";
  if(workOut) workOut.textContent = workPrice ? `${workPrice} zł` : "-";
  if(extraOut) extraOut.textContent = extra ? `${extra} zł` : "-";
  if(depositOut) depositOut.textContent = depositAmount(total);
}
function setupPhoneFields(root=document){
  root.querySelectorAll("[data-phone-country]").forEach(country => {
    const phone = root.querySelector(`[data-phone-input="${country.dataset.phoneCountry}"]`);
    if(!phone || phone.dataset.phoneReady) return;
    phone.dataset.phoneReady = "true";
    const limit = () => Number(country.selectedOptions[0].dataset.digits);
    const sync = () => {
      phone.value = phone.value.replace(/\D/g, "").slice(0, limit());
      phone.placeholder = country.selectedOptions[0].dataset.prefix + " " + "0".repeat(limit());
    };
    country.addEventListener("change", sync);
    phone.addEventListener("input", sync);
    sync();
  });
}
function phoneValue(root, key){
  const country = root.querySelector(`[data-phone-country="${key}"]`);
  const phone = root.querySelector(`[data-phone-input="${key}"]`);
  return `${country.selectedOptions[0].dataset.prefix} ${phone.value}`;
}
function phoneValid(root, key){
  const country = root.querySelector(`[data-phone-country="${key}"]`);
  const phone = root.querySelector(`[data-phone-input="${key}"]`);
  return phone.value.length === Number(country.selectedOptions[0].dataset.digits);
}

function currentWeekRange(){
  const date = new Date(`${today()}T12:00:00`);
  const day = (date.getDay() + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start:slotCalendarDateKey(monday), end:slotCalendarDateKey(sunday) };
}
function visitDurationLabel(visit){
  const start = visit.time ? timeToMinutes(visit.time) : null;
  const end = visit.endTime ? timeToMinutes(visit.endTime) : null;
  if(Number.isFinite(start) && Number.isFinite(end) && end > start) return slotDurationText(end - start);
  if(visit.duration) return slotDurationText(Number(visit.duration));
  return "czas nie wpisany";
}
function statIcon(type){
  const icons = {
    today:`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3v3M17 3v3M4.5 9.5h15M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z"/><path d="m9.2 14.1 1.8 1.8 3.8-4"/></svg>`,
    week:`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3v3M17 3v3M4.5 9.5h15M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z"/><path d="M8 13h2M12 13h2M16 13h.01M8 16h2M12 16h2"/><circle cx="17" cy="17" r="3"/><path d="M17 15.7V17l.9.8"/></svg>`,
    revenue:`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 20V9M12 20V5M19 20v-8M3.5 20h17"/><path d="M9.5 9.5 12 7l2.5 2.5M15.5 16.5h2.2c.7 0 1.3.6 1.3 1.3s-.6 1.2-1.3 1.2h-2.2M17.7 16.5v-.8M17.7 19.8V19"/></svg>`,
    training:`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 8.5 9-4 9 4-9 4-9-4Z"/><path d="M6.5 10.2v4.4c0 1.8 2.5 3.2 5.5 3.2s5.5-1.4 5.5-3.2v-4.4M21 8.5v5"/></svg>`
  };
  return icons[type] || icons.today;
}
function renderDashboard(){
  const statsNode = $("#dashboardStats");
  const todayNode = $("#dashboardToday");
  const dateLabelNode = $("#dashboardDateLabel");
  const quickDate = $('#quickBusyForm input[name="date"]');
  if(quickDate && !quickDate.value) quickDate.value = today();
  if(!statsNode || !todayNode) return;

  const todayKey = today();
  const visibleWorkDate = currentDashboardDateKey();
  if(dateLabelNode) dateLabelNode.textContent = slotDateLabel(visibleWorkDate);
  const week = currentWeekRange();
  const monthKey = todayKey.slice(0, 7);
  const allVisits = state.clients.flatMap(client =>
    (client.visits || []).map(visit => ({ client:client.name, ...visit }))
  );
  const todayVisits = allVisits
    .filter(visit => visit.date === visibleWorkDate)
    .sort((a,b) => timeToMinutes(a.time || "23:59") - timeToMinutes(b.time || "23:59"));
  const weekVisits = allVisits.filter(visit => visit.date >= week.start && visit.date <= week.end);
  const pastRevenueItems = (state.pastRevenues || []).map(item => ({ date:item.date, price:item.amount }));
  const monthRevenue = [...allVisits, ...pastRevenueItems]
    .filter(visit => String(visit.date || "").startsWith(monthKey))
    .reduce((sum, visit) => sum + moneyNumber(visit.price), 0);

  statsNode.innerHTML = `
    <div class="dash-stat"><span class="dash-stat-icon">${statIcon("today")}</span><div><small>Wizyt dziś</small><b>${todayVisits.length}</b></div><span class="dash-stat-arrow">›</span></div>
    <div class="dash-stat"><span class="dash-stat-icon">${statIcon("week")}</span><div><small>Wizyty w tygodniu</small><b>${weekVisits.length}</b></div><span class="dash-stat-arrow">›</span></div>
    <div class="dash-stat"><span class="dash-stat-icon">${statIcon("revenue")}</span><div><small>Przychód w miesiącu</small><b>${monthRevenue ? `${Math.round(monthRevenue)} zł` : "0 zł"}</b></div><span class="dash-stat-arrow">›</span></div>
    <div class="dash-stat"><span class="dash-stat-icon">${statIcon("training")}</span><div><small>Zapisy na szkolenia</small><b>${state.training.length}</b></div><span class="dash-stat-arrow">›</span></div>
  `;

  todayNode.innerHTML = todayVisits.map((visit, index) => {
    const serviceText = visit.services?.join(" + ") || visit.type || "Wizyta";
    const methodText = visit.method ? ` · ${visit.method}` : "";
    const fallbackTime = `${String(9 + index * 2).padStart(2, "0")}:00`;
    return `
    <div class="timeline-item">
      <span class="timeline-time"><b>${esc(visit.time || fallbackTime)}</b>${visit.endTime ? `<small>${esc(visit.endTime)}</small>` : ""}</span>
      <span class="timeline-main">
        <span class="timeline-client">${esc(visit.client || "Klientka")}</span>
        <span class="timeline-service">${esc(serviceText)}${esc(methodText)}</span>
      </span>
      <span class="timeline-duration">${esc(visitDurationLabel(visit))}</span>
      <span class="status-pill">${esc(visit.status || visit.price || "zaplanowana")}</span>
    </div>`;
  }).join("") || `<div class="empty">Na wybrany dzień nie ma jeszcze wpisanych wizyt.</div>`;

  renderSuggestedSlotRows("dashboardSuggestedSlots", suggestedFreeSlots({ duration:180, limit:5, includePublished:false }), { note:"wolny termin", compact:true });
  renderDashboardInquiries();
}

// Photos travel with the existing booking message; legacy messages remain plain text.
function consultationMessage(value){
  const raw = String(value || "");
  const marker = "\n[HBS_PHOTOS_V1]";
  const position = raw.lastIndexOf(marker);
  if(position < 0) return {text:raw, photos:[]};
  try {
    const photos = JSON.parse(raw.slice(position + marker.length));
    if(!Array.isArray(photos) || photos.length > 5 || photos.some(photo => !photo || typeof photo.path !== "string" || !/^consultations\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(photo.path) || typeof photo.name !== "string")) return {text:raw, photos:[]};
    return {text:raw.slice(0,position), photos};
  } catch { return {text:raw, photos:[]}; }
}
function consultationPhotos(value){
  const {photos} = consultationMessage(value);
  return photos.length ? `<div class="consultation-photos">${photos.map(photo => `<span class="consultation-photo" data-consultation-photo="${esc(photo.path)}" data-photo-name="${esc(photo.name)}">Ładuję zdjęcie…</span>`).join("")}</div>` : "";
}
const consultationPhotoUrls = new Map();
async function loadConsultationPhotos(node){
  if(!hbsDb || !isAdmin()) return;
  const generation=authGeneration;
  await Promise.all($all("[data-consultation-photo]", node).map(async target => {
    const path = target.dataset.consultationPhoto;
    let cached = consultationPhotoUrls.get(path);
    try {
      if(!cached || cached.expires < Date.now()){
        const {data,error} = await hbsDb.storage.from("consultation-photos").download(path);
        if(generation!==authGeneration||!isAdmin())return;
        if(error || !data) throw new Error("photo unavailable");
        if(cached)URL.revokeObjectURL(cached.url);
        cached = {url:URL.createObjectURL(data), expires:Date.now()+60000};
        consultationPhotoUrls.set(path,cached);
      }
      if(!target.isConnected) return;
      const link = document.createElement("a");
      link.href = cached.url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.title = "Otwórz zdjęcie w pełnym rozmiarze";
      const img = document.createElement("img");
      img.src = cached.url; img.alt = target.dataset.photoName; img.loading = "lazy";
      img.addEventListener("error", () => { target.textContent = "Zdjęcie niedostępne. Odśwież zgłoszenia."; });
      link.append(img, document.createTextNode(target.dataset.photoName));
      target.replaceChildren(link);
    } catch { if(target.isConnected) target.textContent = "Nie udało się pobrać zdjęcia. Odśwież zgłoszenia."; }
  }));
}

function renderDashboardInquiries(errorMessage=""){
  const node = $("#dashboardInquiries");
  if(!node) return;
  if(!hbsDb){
    node.innerHTML = `<p class="dashboard-inquiry-message">Zgłoszenia pojawią się po połączeniu panelu z Supabase.</p>`;
    return;
  }
  if(errorMessage){
    node.innerHTML = `<p class="dashboard-inquiry-message">Nie udało się pobrać zgłoszeń. ${esc(errorMessage)}</p>`;
    return;
  }
  if(!onlineBookingsLoaded){
    node.innerHTML = `<p class="dashboard-inquiry-message">Ładuję zgłoszenia ze strony...</p>`;
    return;
  }
  const latestBookings = [...onlineBookings]
    .sort((a,b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0,5);
  node.innerHTML = latestBookings.map(item => {
    const time = String(item.visit_time || "").slice(0,5);
    const hasDate = Boolean(item.visit_date);
    const hasTerm = hasDate || Boolean(time);
    return `<article class="dashboard-inquiry">
      <div class="dashboard-inquiry-head">
        <b class="dashboard-inquiry-name">${esc(item.client_name || "Klientka")}</b>
        <span class="status-pill ${esc(item.status)}">${esc(bookingStatusText(item.status))}</span>
      </div>
      ${hasTerm ? `<div class="dashboard-inquiry-date"><span>${hasDate ? esc(formatOnlineDate(item.visit_date)) : "Data niepodana"}</span><strong>${esc(time || "Godzina niepodana")}</strong></div>` : `<div class="dashboard-inquiry-no-date">Zapytanie bez terminu</div>`}
      <div class="dashboard-inquiry-details">${esc(item.service || "Zapytanie")}${item.phone ? ` · ${esc(item.phone)}` : ""}</div>
      ${item.message || item.slot_note ? `<p class="dashboard-inquiry-note">${esc(consultationMessage(item.message || item.slot_note).text)}</p>` : ""}
      ${consultationPhotos(item.message)}
      ${item.created_at ? `<small class="dashboard-inquiry-sent">Wysłano: ${esc(formatOnlineDateTime(item.created_at))}</small>` : ""}
    </article>`;
  }).join("") || `<p class="dashboard-inquiry-message">Nie ma jeszcze zgłoszeń ze strony.</p>`;
  loadConsultationPhotos(node);
}

function resetPanel(message='Zaloguj się do panelu.'){
 const hadSession=!!session; authGeneration++; session=null; saveBlocked=true; state=seed(); onlineBookings=[];availabilitySlots=[];
 onlineBookingsLoaded=false;availabilitySlotsLoaded=false;activeClientId=null;consult={step:0,answers:{},notes:[],clientInfo:[],addons:[]};
 consultationPhotoUrls.forEach(p=>URL.revokeObjectURL(p.url));consultationPhotoUrls.clear();
 panelFileUrls.forEach(url=>URL.revokeObjectURL(url));panelFileUrls.clear();
 $('#app').classList.remove('active');$('#login').style.display='';closeModal();
 $all('.list,.view .empty,#dashboardInquiries,#userBox').forEach(n=>n.replaceChildren());
 if(hadSession){$('#app').replaceChildren();location.reload();return;}
 $('#authStatus').textContent=message;$('#loginPass').value='';$('#mfaArea').replaceChildren();
}
async function openPanel(){
 const {data:identity,error}=await hbsDb.rpc('hbs_panel_identity');
 if(error||!identity?.authorized){resetPanel('Brak uprawnień lub wymagana ponowna weryfikacja.');return;}
 const generation=authGeneration;
 const {data,error:readError}=await hbsDb.rpc('hbs_panel_read');
 if(readError||generation!==authGeneration){resetPanel('Nie udało się pobrać panelu. Zaloguj się ponownie.');return;}
 cloudVersion=data.version;state=data.body||seed();state.pastRevenues||=[];saveBlocked=!data.body;
 const {data:user}=await hbsDb.auth.getUser();if(generation!==authGeneration)return;if(!user.user){resetPanel();return;}
 session={role:'admin',name:user.user.email};$('#login').style.display='none';$('#app').classList.add('active');
 $('#syncStatus').textContent=data.body?'Dane z bezpiecznej bazy':'Kartoteka nie została jeszcze przeniesiona. Nie twórz jej ponownie.';
 renderShell();renderAll();if(!data.body){const b=document.createElement('button');b.className='btn';b.textContent='Przenieś zachowaną kopię kartoteki';b.onclick=migrateKartoteka;$('#syncStatus').append(b);}
}
async function afterPassword(){
 const {data,error}=await hbsDb.rpc('hbs_panel_identity');
 if(error||!data?.admin){await hbsDb.auth.signOut();resetPanel('Nie udało się uzyskać dostępu do panelu.');return;}
 if(data.authorized){await openPanel();return;}
 const {data:factors,error:factorError}=await hbsDb.auth.mfa.listFactors();
 if(factorError){resetPanel('Nie udało się sprawdzić drugiego czynnika.');return;}
 const factor=factors.totp.find(f=>f.status==='verified');
 const area=$('#mfaArea');area.replaceChildren();
 if(!factor){
  const label=document.createElement('p');label.textContent='SANDRA — TERAZ WŁĄCZ MFA. Otwórz aplikację uwierzytelniającą i wybierz „Dodaj konto”.';area.append(label);
  const setup=document.createElement('button');setup.className='btn';setup.textContent='Przygotuj konfigurację MFA';
  setup.onclick=async()=>{
   setup.disabled=true;
   const {data:enrollment,error}=await hbsDb.auth.mfa.enroll({factorType:'totp',friendlyName:'HBS administrator '+Date.now()});
   if(error){$('#authStatus').textContent='Nie udało się przygotować MFA.';setup.disabled=false;return;}
   const img=document.createElement('img');img.alt='Kod QR do konfiguracji MFA — nie udostępniaj go';img.src=enrollment.totp.qr_code.startsWith('data:')?enrollment.totp.qr_code:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(enrollment.totp.qr_code);area.append(img);
   addCodeInput(enrollment.id,()=>img.remove());setup.remove();
  };area.append(setup);
 }else addCodeInput(factor.id);
}
function addCodeInput(factorId,clear=()=>{}){
 const area=$('#mfaArea'),form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input'),button=document.createElement('button');
 label.textContent='Kod z aplikacji uwierzytelniającej';input.inputMode='numeric';input.autocomplete='one-time-code';input.pattern='[0-9]{6}';input.required=true;input.maxLength=6;button.textContent='Potwierdź i otwórz panel';button.className='btn';label.append(input);form.append(label,button);area.append(form);
 form.onsubmit=async e=>{e.preventDefault();button.disabled=true;const {error}=await hbsDb.auth.mfa.challengeAndVerify({factorId,code:input.value});input.value='';if(error){$('#authStatus').textContent='Nie udało się potwierdzić kodu.';button.disabled=false;return;}clear();area.replaceChildren();await openPanel();};
}
$('#loginBtn').addEventListener('click',async()=>{
 if(!hbsDb){$('#authStatus').textContent='Panel niedostępny. Nie można zalogować się lokalnie.';return;}
 const button=$('#loginBtn');button.disabled=true;$('#authStatus').textContent='Sprawdzam logowanie…';
 const {error}=await hbsDb.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPass').value});$('#loginPass').value='';
 if(error)$('#authStatus').textContent='Nie udało się zalogować. Sprawdź dane lub spróbuj później.';
 else await afterPassword();button.disabled=false;
});
$('#logoutBtn').addEventListener('click',async()=>{$('#app').classList.remove('active');await hbsDb?.auth.signOut();resetPanel('Wylogowano.');});
hbsDb?.auth.onAuthStateChange((event,current)=>{if(event==='SIGNED_OUT'||(!current&&event!=='INITIAL_SESSION'))resetPanel('Sesja zakończona. Zaloguj się ponownie.');});
$('#exportDraft').addEventListener('click',()=>{
 if(!isAdmin()||!confirm('Kopia zawiera prywatne dane. Zapisz ją wyłącznie w bezpiecznym miejscu na swoim urządzeniu.'))return;
 const url=URL.createObjectURL(new Blob([JSON.stringify(state)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='HBS-prywatna-kopia-robocza.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
let lastActivity=Date.now();['pointerdown','keydown'].forEach(e=>document.addEventListener(e,()=>lastActivity=Date.now(),{passive:true}));
setInterval(async()=>{if(!session)return;if(Date.now()-lastActivity>15*60*1000){$('#app').classList.remove('active');await hbsDb.auth.signOut();resetPanel('Sesja zakończona po okresie bezczynności.');return;}
 const {data,error}=await hbsDb.rpc('hbs_panel_identity');if(error||!data?.authorized)resetPanel('Sesja wygasła. Zaloguj się ponownie.');},30000);
resetPanel();
async function migrateKartoteka(){
 if(cloudVersion!==0||!isAdmin())return;
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
 input.onchange=async()=>{
  const file=input.files[0];if(!file||file.size>10*1024*1024){alert('Wybierz prawidłową kopię JSON, do 10 MB.');return;}
  let imported;try{imported=JSON.parse(await file.text());if(!imported||!Array.isArray(imported.clients)||!Array.isArray(imported.training))throw Error();
   const check=v=>{if(!v||typeof v!=='object')return;for(const [k,x]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error();check(x);}};check(imported);
  }catch{alert('Ta kopia nie ma prawidłowego formatu. Niczego nie zapisano.');return;}
  if(!confirm(`Przenieść kopię do prywatnej bazy HBS? Klientki: ${imported.clients.length}, szkolenia: ${imported.training.length}. Oryginał na tym urządzeniu pozostanie bez zmian.`))return;
  const {data,error}=await hbsDb.rpc('hbs_panel_write',{p_expected:0,p_body:imported});
  if(error){alert('Nie udało się przenieść kopii. Oryginał pozostaje bez zmian.');return;}
  const verified=await hbsDb.rpc('hbs_panel_read');
  if(verified.error||JSON.stringify(verified.data.body)!==JSON.stringify(imported)){
   // JSONB key order differs: compare canonical sorted key representation below.
   const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
   if(verified.error||JSON.stringify(canonical(verified.data.body))!==JSON.stringify(canonical(imported))){alert('Weryfikacja nie zakończyła się sukcesem. Zachowaj oryginalną kopię.');return;}
  }
  cloudVersion=data;state=verified.data.body;saveBlocked=false;$('#syncStatus').textContent='Migracja potwierdzona. Oryginalna kopia nie została usunięta.';renderAll();
 };input.click();
}
function renderShell(){
  $("#userBox").innerHTML = `<b>${esc(session.name)}</b><br>${isAdmin() ? "Admin - pełny dostęp" : "Pracownica - bez usuwania i ustawień"}`;
  $("#nav").innerHTML = navItems.map(([id,label]) => {
    const locked = id === "settings" && !isAdmin();
    return `<button data-view="${id}" class="${id==="dashboard"?"active":""} ${locked?"locked":""}" ${locked?"disabled":""}><span class="nav-icon">${navIcon(id)}</span><span>${label}</span></button>`;
  }).join("");
  $all("[data-view]").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
  $all("[data-go]").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.go)));
  bindActions(document);
}
function bindActions(root){
  $all("[data-action]", root).forEach(btn => btn.addEventListener("click", () => handleAction(btn.dataset.action, btn.dataset.id)));
}
function showView(id){
  if(id === "settings" && !isAdmin()) return;
  $all(".view").forEach(v => v.classList.toggle("active", v.id === id));
  $all(".nav button").forEach(b => b.classList.toggle("active", b.dataset.view === id));
  $(".main")?.classList.toggle("dashboard-mode", id === "dashboard");
  $("#viewTitle").textContent = navItems.find(item => item[0] === id)?.[1] || "Karta klientki";
  renderAll();
}
function handleAction(action, id){
  const client = id ? state.clients.find(c => c.id === id) : (activeClientId ? state.clients.find(c => c.id === activeClientId) : state.clients[0]);
  if(action === "new-client") openClientForm();
  if(action === "open-client"){ activeClientId = id; showView("clientCard"); }
  if(action === "free-consult") openFreeConsultation();
  if(action === "new-consult") openTabletConsult(id || activeClientId || "");
  if(action === "tablet-consult") openTabletConsult(id || activeClientId || "");
  if(action === "new-install") openVisitForm(id || "", true);
  if(action === "dashboard-new-visit") openVisitForm(activeClientId || "");
  if(action === "new-visit") openVisitForm(client?.id);
  if(action === "edit-visit"){
    const [clientId, visitId] = String(id || "").split("|");
    const editClient = state.clients.find(c => c.id === clientId);
    const visit = editClient?.visits?.find(v => v.id === visitId);
    openVisitForm(clientId, Boolean(visit?.services?.includes("Nowe założenie")), visitId);
  }
  if(action === "new-color") openColorForm(client?.id);
  if(action === "new-photo") openPhotoForm(client?.id);
  if(action === "new-contract") openContractForm(client?.id);
  if(action === "delete-client") deleteClient(id);
}
function renderAll(){
  renderClients();
  renderDashboardSearch();
  renderClientCard();
  renderGlobalLists();
  renderDashboard();
  renderSlotCalendar();
  renderAvailabilitySlots();
  renderOnlineBookings();
}
function renderDashboardSearch(){
  const input = $("#globalSearch");
  if(!input || input.dataset.bound) return;
  input.dataset.bound = "1";
  input.addEventListener("input", () => {
    const term = input.value.toLowerCase();
    const found = state.clients.find(c => `${c.name} ${c.phone}`.toLowerCase().includes(term));
    if(found && term.length > 2){ activeClientId = found.id; showView("clientCard"); }
  });
}
function renderClients(){
  const list = $("#clientList");
  if(!list) return;
  list.innerHTML = state.clients.map(c => `
    <div class="card client-card">
      <div>
        <h3>${esc(c.name)}</h3>
        <div class="meta">
          ${esc(c.phone)} · ${esc(c.instagram || "brak IG")}<br>
          Adres: ${esc(c.address || "brak adresu")}<br>
          Gramatura: ${esc(c.grams || "Brak")} · Metoda: ${esc(c.method || "Brak")}<br>
          Ostatnia wizyta: ${esc(c.lastVisit || "brak")} · Ostatnia cena: ${esc(c.lastPrice || "brak")}
        </div>
      </div>
      <div class="actions">
        <button class="btn" data-action="open-client" data-id="${c.id}">Otwórz kartę</button>
        <button class="btn secondary" data-action="new-install" data-id="${c.id}">Nowe założenie</button>
        <button class="btn secondary" data-action="new-consult" data-id="${c.id}">Ankieta korekty</button>
        <button class="btn secondary" data-action="new-visit" data-id="${c.id}">Dodaj wizytę</button>
        ${canDelete() ? `<button class="btn danger" data-action="delete-client" data-id="${c.id}">Usuń</button>` : ""}
      </div>
    </div>
  `).join("");
  bindActions(list);
}
function renderClientCard(){
  const wrap = $("#clientCardContent");
  if(!wrap) return;
  const c = state.clients.find(item => item.id === activeClientId) || state.clients[0];
  if(!c){ wrap.innerHTML = `<div class="card">Brak klientek.</div>`; return; }
  activeClientId = c.id;
  const tabs = [["consultations","Konsultacje"],["visits","Wizyty"],["colors","Koloryzacje"],["photos","Zdjęcia"],["contracts","Umowy"],["notes","Notatki"]];
  wrap.innerHTML = `
    <div class="stats">
      <div class="stat"><small>Gramatura</small><b>${esc(c.grams || "Brak")}</b></div>
      <div class="stat"><small>Łączenia / metoda</small><b>${esc(c.method || "Brak")}</b></div>
      <div class="stat"><small>Kolor</small><b>${esc(c.color || "Brak")}</b></div>
      <div class="stat"><small>Telefon</small><b>${esc(c.phone)}</b></div>
      <div class="stat"><small>Adres</small><b>${esc(c.address || "Brak")}</b></div>
      <div class="stat"><small>Ostatnia wizyta</small><b>${esc(c.lastVisit || "Brak")}</b></div>
      <div class="stat"><small>Ostatnia cena</small><b>${esc(c.lastPrice || "Brak")}</b></div>
    </div>
    <div class="card">
      <div class="topbar">
        <h1>${esc(c.name)}</h1>
        <div class="actions">
          <button class="btn secondary" data-action="new-install" data-id="${c.id}">Nowe założenie</button>
          <button class="btn secondary" data-action="new-consult" data-id="${c.id}">Ankieta korekty</button>
          <button class="btn secondary" data-action="new-visit" data-id="${c.id}">Dodaj wizytę</button>
          <button class="btn secondary" data-action="new-photo" data-id="${c.id}">Dodaj zdjęcia</button>
          <button class="btn secondary" data-action="new-contract" data-id="${c.id}">Dodaj umowę</button>
          <button class="btn secondary" data-action="new-color" data-id="${c.id}">Dodaj koloryzację</button>
        </div>
      </div>
      <div class="tabs">${tabs.map(([id,label]) => `<button data-client-tab="${id}" class="${activeClientTab===id?"active":""}">${label}</button>`).join("")}</div>
      <div id="clientTabBody">${renderClientTab(c)}</div>
    </div>
  `;
  bindActions(wrap);
  $all("[data-client-tab]", wrap).forEach(btn => btn.addEventListener("click", () => {
    activeClientTab = btn.dataset.clientTab;
    renderClientCard();
  }));
}
function renderClientTab(c){
  if(activeClientTab === "notes"){
    return `<div class="grid cols-2">
      <div class="record"><h3>Notatki techniczne</h3><p>${esc(c.techNotes || "Brak")}</p><p class="meta">szampon · problemy po korekcie · metoda · gramatura · karbowanie · reakcja na keratynę</p></div>
      <div class="record"><h3>Notatki prywatne</h3><p>${esc(c.privateNotes || "Brak")}</p><p class="meta">rozmowy · wakacje · dzieci · pies · praca · zainteresowania</p></div>
    </div>`;
  }
  const map = {
    consultations:c.consultations || [],
    visits:c.visits || [],
    colors:c.colors || [],
    photos:c.photos || [],
    contracts:c.contracts || []
  };
  const items = map[activeClientTab] || [];
  return `<div class="list">${items.map(item => `<div class="record">${
    activeClientTab === "contracts" ? formatContractRecord(item) :
    activeClientTab === "visits" ? formatVisitRecord(c.id, item) :
    formatRecord(item)
  }</div>`).join("") || `<div class="empty">Brak wpisów.</div>`}</div>`;
}
function formatContractRecord(item){
  if(!item.contractText && !item.signature){
    return formatRecord(item);
  }
  return `<div class="saved-contract">
    <div class="saved-contract-head">
      <h3>${esc(item.type || "Umowa")}</h3>
      <div class="meta">${esc(item.signedDate || item.date || "")} · ${esc(item.client || "")} · ${esc(item.price || "")}</div>
    </div>
    <div class="saved-contract-body">
      <pre>${esc(item.contractText || "Brak treści umowy.")}</pre>
      <div class="signature-preview">
        <div class="signature-preview-box">
          <small>Podpis klientki</small>
          ${item.signature ? `<img src="${esc(item.signature)}" alt="Podpis klientki">` : `<div class="empty">Brak podpisu klientki.</div>`}
        </div>
        <div class="signature-preview-box">
          <small>Podpis salonu</small>
          <div class="owner-signature">Sandra Kuk</div>
        </div>
      </div>
    </div>
  </div>`;
}
function formatRecord(item){
  return Object.entries(item).filter(([k]) => k !== "id" && !k.startsWith("_")).map(([k,v]) => {
    const value = Array.isArray(v) ? v.join(", ") : v === true ? "Tak" : v === false ? "Nie" : v;
    return `<b>${esc(label(k))}:</b> ${esc(value)}`;
  }).join("<br>")+attachmentMarkup(item._attachments);
}
function formatVisitRecord(clientId, item){
  const services = Array.isArray(item.services) ? item.services : [];
  const colorDetails = item.colorDetails || {};
  const hasColor = services.includes("Koloryzacja") && Object.values(colorDetails).some(Boolean);
  return `${attachmentMarkup(item._attachments)}<div class="visit-card">
    <div class="visit-head">
      <div>
        <h3>${esc(item.date || "Wizyta")}</h3>
        <div class="visit-services">${services.map(service => `<span class="visit-pill">${esc(service)}</span>`).join("") || `<span class="visit-pill">Wizyta</span>`}</div>
      </div>
      <div class="visit-price">${esc(item.price || "Brak ceny")}</div>
    </div>
    <div class="visit-grid">
      ${item.client ? `<div class="visit-box"><small>Klientka</small><b>${esc(item.client)}</b></div>` : ""}
      ${item.time ? `<div class="visit-box"><small>Godzina</small><b>${esc(item.time)}${item.endTime ? ` - ${esc(item.endTime)}` : ""} · ${slotDurationText(visitDurationMinutes(item))}</b></div>` : ""}
      <div class="visit-box"><small>Metoda</small><b>${esc(item.method || "Brak")}</b></div>
      <div class="visit-box"><small>Gramatura</small><b>${esc(item.grams || "Brak")}</b></div>
      <div class="visit-box"><small>Długość</small><b>${esc(item.length || "Brak")}</b></div>
      <div class="visit-box"><small>Kolor</small><b>${esc(item.color || "Brak")}</b></div>
      ${item.hairKind ? `<div class="visit-box"><small>Rodzaj włosów</small><b>${esc(item.hairKind)}</b></div>` : ""}
      ${item.orderedHair ? `<div class="visit-box"><small>Domówione włosy</small><b>${esc(item.orderedHair)}</b></div>` : ""}
      ${item.afterPhoto ? `<div class="visit-box"><small>Zdjęcie po</small><b>${esc(item.afterPhoto)}</b></div>` : ""}
      ${item.connectionPhoto ? `<div class="visit-box"><small>Zdjęcie łączeń</small><b>${esc(item.connectionPhoto)}</b></div>` : ""}
    </div>
    ${item.orderedNote ? `<div class="visit-note"><b>Uwagi do włosów</b>${esc(item.orderedNote)}</div>` : ""}
    ${hasColor ? `<div class="visit-note"><b>Koloryzacja</b>
      ${esc(colorDetails.root || "Odrost: brak")} · ${esc(colorDetails.oxidant || "Oxydant: brak")}<br>
      ${esc(colorDetails.toner || "Tonowanie: brak")} · ${esc(colorDetails.pigments || "Pigmenty: brak")} · ${esc(colorDetails.processingTime || "Czas: brak")}<br>
      ${esc(colorDetails.result || "Efekt: brak")}
    </div>` : ""}
    ${item.note ? `<div class="visit-note"><b>Notatka po wizycie</b>${esc(item.note)}</div>` : ""}
    ${item.privateNote ? `<div class="visit-private"><b>Prywatna notatka</b>${esc(item.privateNote)}</div>` : ""}
    <div class="actions" style="margin-top:14px">
      <button class="btn secondary" data-action="edit-visit" data-id="${esc(clientId)}|${esc(item.id)}">Edytuj wizytę</button>
    </div>
  </div>`;
}
function label(k){
  return ({date:"Data", services:"Usługi", method:"Metoda", hairDensity:"Gęstość włosów", hairKind:"Rodzaj włosów", grams:"Gramatura", length:"Długość", color:"Kolor", price:"Cena", deposit:"Zadatek", address:"Adres", orderedHair:"Domówione włosy", orderedNote:"Uwagi do włosów", specialHair:"Ombre / falowane +100 zł", afterPhoto:"Zdjęcie po", connectionPhoto:"Zdjęcie łączeń", privateNote:"Prywatna notatka", note:"Notatka", signedDate:"Data podpisania", contractPhoto:"Zdjęcie umowy", category:"Kategoria", photo:"Zdjęcie", root:"Odrost", oxidant:"Oxydant", toner:"Tonowanie", pigments:"Pigmenty", processingTime:"Czas działania", result:"Efekt końcowy", wantsColor:"Koloryzacja podczas wizyty", colorService:"Rodzaj koloryzacji"})[k] || k;
}
function renderGlobalLists(){
  const consultationItems = state.clients.flatMap(c => (c.consultations || [])
    .map((i, index) => ({_source:"client", _clientId:c.id, _consultationIndex:index, client:c.name, phone:c.phone, ...i}))
    .filter(i => i.type !== "Ankieta korekty"));
  const onlineConsultationItems = onlineBookings
    .filter(item => String(item.service || "").toLowerCase().includes("konsultacja"))
    .map(item => ({
      _source:"online",
      _bookingId:item.id,
      źródło:"formularz ze strony",
      client:item.client_name,
      phone:item.phone,
      status:bookingStatusText(item.status),
      date:item.visit_date || "",
      time:item.visit_time ? String(item.visit_time).slice(0,5) : "",
      note:item.message || item.slot_note || ""
    }));
  renderConsultationList("consultationList", [...onlineConsultationItems, ...consultationItems]);
  if(hbsDb && !onlineBookingsLoaded){
    loadOnlineBookings().then(() => renderGlobalLists());
  }
  const allVisits = state.clients
    .flatMap(c => (c.visits || []).map(i => ({clientId:c.id, client:c.name,...i})))
    .sort((a, b) => `${b.date || ""} ${b.time || ""}`.localeCompare(`${a.date || ""} ${a.time || ""}`));
  const todayVisits = allVisits.filter(i => i.date === today());
  renderVisitList("visitList", todayVisits, {dailySummary:true, emptyText:"Brak wizyt na dzisiaj."});
  renderPastRevenueList();
  bindPastRevenueForm();
  renderList("colorList", state.clients.flatMap(c => (c.colors||[]).map(i => ({client:c.name,...i}))));
  renderList("photoList", state.clients.flatMap(c => (c.photos||[]).map(i => ({client:c.name,...i}))));
  renderList("contractList", state.clients.flatMap(c => (c.contracts||[]).map(i => ({client:c.name,...i}))));
  const t = $("#trainingList");
  if(t) t.innerHTML = state.training.map(x => `<div class="record"><h3>${esc(x.name)}</h3>${esc(x.phone)} · ${esc(x.email)}<br>${esc(x.course)}<br>${esc(x.message)}<br><b>Status:</b> ${esc(x.status)}</div>`).join("") || `<div class="empty">Brak zgłoszeń.</div>`;
}
async function loadOnlineBookings(){
  if(!hbsDb) return { ok:false, message:"Brak połączenia z Supabase." };
  renderDashboardInquiries();
  const generation=authGeneration;
  const { data, error } = await hbsDb.rpc("list_online_bookings");
  if(generation!==authGeneration||!isAdmin())return;
  if(error){
    renderDashboardInquiries(error.message || "Spróbuj odświeżyć zgłoszenia.");
    return { ok:false, message:error.message };
  }
  onlineBookings = data || [];
  onlineBookingsLoaded = true;
  renderDashboardInquiries();
  return { ok:true };
}
async function loadAvailabilitySlots(){
  if(!hbsDb) return { ok:false, message:"Brak połączenia z Supabase." };
  const { data, error } = await hbsDb
    .from("availability_slots")
    .select("*")
    .gte("visit_date", today())
    .order("visit_date", { ascending:true })
    .order("visit_time", { ascending:true });
  if(error) return { ok:false, message:error.message };
  availabilitySlots = data || [];
  availabilitySlotsLoaded = true;
  return { ok:true };
}
function slotStatusText(status){
  return ({free:"wolny",pending:"oczekuje na potwierdzenie",booked:"zarezerwowany",blocked:"zablokowany"})[status] || status;
}
function slotDurationText(minutes){
  const value = Number(minutes || 180);
  if(value >= 60 && value % 60 === 0) return `${value / 60}h`;
  return `${value} min`;
}
function slotCalendarDateKey(date){
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function slotsForDate(dateKey){
  return availabilitySlots.filter(slot => slot.visit_date === dateKey);
}
function slotDateLabel(dateKey){
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString("pl-PL", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
}
function timeToMinutes(value){
  const [hours, minutes] = String(value || "00:00").split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}
function minutesToTime(value){
  const hours = String(Math.floor(value / 60)).padStart(2, "0");
  const minutes = String(value % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}
function currentLocalMinutes(){
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
function nextStepMinutes(value, step=30){
  return Math.ceil(value / step) * step;
}
function addDaysKey(startKey, days){
  const date = new Date(`${startKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return slotCalendarDateKey(date);
}
function isClosedHoliday(dateKey){
  return closedHolidayKeys.includes(dateKey.slice(5));
}
function workWindowForDate(dateKey){
  const date = new Date(`${dateKey}T12:00:00`);
  if(isClosedHoliday(dateKey)) return null;
  return workRules[date.getDay()] || null;
}
function nextWorkingDateKey(startKey=today()){
  for(let offset = 0; offset < 21; offset++){
    const dateKey = addDaysKey(startKey, offset);
    if(workWindowForDate(dateKey)) return dateKey;
  }
  return startKey;
}
function currentDashboardDateKey(){
  if(!dashboardDateKey || !workWindowForDate(dashboardDateKey)) dashboardDateKey = nextWorkingDateKey(today());
  return dashboardDateKey;
}
function moveDashboardWorkDate(direction){
  const startKey = currentDashboardDateKey();
  for(let offset = 1; offset < 45; offset++){
    const dateKey = addDaysKey(startKey, direction * offset);
    if(workWindowForDate(dateKey)) return dateKey;
  }
  return startKey;
}
function visitDurationMinutes(visit){
  if(visit.time && visit.endTime){
    const start = timeToMinutes(visit.time);
    const end = timeToMinutes(visit.endTime);
    if(end > start) return Math.max(15, end - start);
  }
  if(visit.durationMinutes) return Number(visit.durationMinutes);
  if(visit.duration) return Number(visit.duration);
  const services = Array.isArray(visit.services) ? visit.services : [];
  if(services.includes("Ściąganie włosów")) return 60;
  if(services.includes("Koloryzacja") && (services.includes("Korekta") || services.includes("Nowe założenie"))) return 300;
  return 180;
}
function intervalsForDate(dateKey, options={}){
  const publishedSlots = options.includePublished === false ? [] : availabilitySlots
    .filter(slot => slot.visit_date === dateKey)
    .map(slot => {
      const start = timeToMinutes(String(slot.visit_time || "00:00").slice(0,5));
      return { start, end:start + Number(slot.duration_minutes || 180) };
    });
  const salonVisits = state.clients
    .flatMap(client => client.visits || [])
    .filter(visit => visit.date === dateKey && visit.time)
    .map(visit => {
      const start = timeToMinutes(visit.time);
      return { start, end:start + visitDurationMinutes(visit) };
    });
  return [...publishedSlots, ...salonVisits];
}
function hasIntervalConflict(start, end, intervals){
  return intervals.some(interval => start < interval.end && end > interval.start);
}
function appendFreeWindowSlots(result, dateKey, start, end, duration, limit){
  for(let slotStart = start; slotStart + duration <= end && result.length < limit; slotStart += duration){
    const slotEnd = slotStart + duration;
    result.push({
      date:dateKey,
      time:minutesToTime(slotStart),
      end:minutesToTime(slotEnd),
      duration
    });
  }
}
function suggestedFreeSlots(options={}){
  const duration = Number(options.duration || 180);
  const limit = Number(options.limit || 12);
  const result = [];
  const todayKey = today();
  for(let offset = 0; offset < 42 && result.length < limit; offset++){
    const dateKey = addDaysKey(todayKey, offset);
    const window = workWindowForDate(dateKey);
    if(!window) continue;
    let startLimit = timeToMinutes(window.start);
    const endLimit = timeToMinutes(window.end);
    if(dateKey === todayKey){
      startLimit = Math.max(startLimit, nextStepMinutes(currentLocalMinutes() + 30, 15));
    }
    const intervals = intervalsForDate(dateKey, { includePublished:options.includePublished !== false })
      .map(interval => ({
        start:Math.max(startLimit, interval.start),
        end:Math.min(endLimit, interval.end)
      }))
      .filter(interval => interval.end > startLimit && interval.start < endLimit)
      .sort((a,b) => a.start - b.start);
    let cursor = startLimit;
    intervals.forEach(interval => {
      if(result.length >= limit) return;
      if(interval.start > cursor){
        appendFreeWindowSlots(result, dateKey, cursor, interval.start, duration, limit);
      }
      cursor = Math.max(cursor, interval.end);
    });
    if(result.length < limit && cursor < endLimit){
      appendFreeWindowSlots(result, dateKey, cursor, endLimit, duration, limit);
    }
  }
  return result;
}
function renderSuggestedSlotRows(targetId, slots, options={}){
  const node = $("#" + targetId);
  if(!node) return;
  const note = options.note || $("#suggestedNote")?.value || "wolny termin";
  if(!availabilitySlotsLoaded){
    node.innerHTML = `<div class="empty">Ładuję grafik i sprawdzam wolne okienka...</div>`;
    return;
  }
  if(options.compact){
    node.innerHTML = slots.map(slot => `
      <div class="slot-row generated">
        <b>${formatOnlineDate(slot.date)}</b>
        <span class="slot-time">${esc(slot.time)}-${esc(slot.end)}</span>
        <span class="slot-length">${slotDurationText(slot.duration)}</span>
        <button class="btn secondary" data-publish-suggested="${esc(`${slot.date}|${slot.time}|${slot.duration}|${note}`)}">Wrzuć</button>
      </div>
    `).join("") || `<div class="empty">Brak wolnych okienek dla wybranego czasu wizyty.</div>`;
    $all("[data-publish-suggested]", node).forEach(button => {
      button.addEventListener("click", () => publishSuggestedSlot(button.dataset.publishSuggested));
    });
    return;
  }
  node.innerHTML = slots.map(slot => `
    <div class="slot-row generated">
      <div>
        <b>${formatOnlineDate(slot.date)}</b>
        <div class="meta"><span class="slot-time">${esc(slot.time)}-${esc(slot.end)}</span> ${slotDurationText(slot.duration)}${options.compact ? "" : ` · ${esc(note)}`}</div>
      </div>
      <button class="btn secondary" data-publish-suggested="${esc(`${slot.date}|${slot.time}|${slot.duration}|${note}`)}">Wrzuć na stronę</button>
    </div>
  `).join("") || `<div class="empty">Brak wolnych okienek dla wybranego czasu wizyty.</div>`;
  $all("[data-publish-suggested]", node).forEach(button => {
    button.addEventListener("click", () => publishSuggestedSlot(button.dataset.publishSuggested));
  });
}
function renderSuggestedSlots(){
  const duration = Number($("#suggestedDuration")?.value || 180);
  const note = $("#suggestedNote")?.value || "wolny termin";
  renderSuggestedSlotRows("suggestedSlotList", suggestedFreeSlots({ duration, limit:10 }), { note });
}
async function publishSuggestedSlot(encoded){
  if(!hbsDb){
    alert("Najpierw podłącz panel z Supabase.");
    return;
  }
  const [date, time, durationText, ...noteParts] = String(encoded || "").split("|");
  const note = noteParts.join("|") || "wolny termin";
  const payload = {
    visit_date:date,
    visit_time:time,
    duration_minutes:Number(durationText || 180),
    note,
    status:"free"
  };
  const { error } = await hbsDb.from("availability_slots").insert(payload);
  if(error){
    alert(error.message || "Nie udało się wrzucić terminu na stronę.");
    return;
  }
  selectedSlotDate = date;
  const dateInput = $('#slotForm input[name="date"]');
  if(dateInput) dateInput.value = date;
  availabilitySlotsLoaded = false;
  await loadAvailabilitySlots();
  renderSlotCalendar();
  renderAvailabilitySlots();
  renderSuggestedSlots();
  renderDashboard();
}
async function clearPublishedSlotsForVisit(visit){
  if(!hbsDb || !visit.date || !visit.time) return;
  if(!availabilitySlotsLoaded) await loadAvailabilitySlots();
  const start = timeToMinutes(visit.time);
  const end = start + visitDurationMinutes(visit);
  const conflicts = availabilitySlots.filter(slot => {
    if(slot.visit_date !== visit.date || slot.status !== "free") return false;
    const slotStart = timeToMinutes(String(slot.visit_time || "00:00").slice(0,5));
    const slotEnd = slotStart + Number(slot.duration_minutes || 180);
    return start < slotEnd && end > slotStart;
  });
  for(const slot of conflicts){
    await hbsDb.from("availability_slots").delete().eq("id", slot.id);
  }
  if(conflicts.length){
    availabilitySlotsLoaded = false;
    await loadAvailabilitySlots();
  }
}
function findOrCreateClient(name){
  const cleanName = String(name || "").trim();
  if(!cleanName) return null;
  const existing = state.clients.find(client => String(client.name || "").trim().toLowerCase() === cleanName.toLowerCase());
  if(existing) return existing;
  const client = {
    id:"c" + Date.now(),
    name:cleanName,
    phone:"",
    email:"",
    address:"",
    consultations:[],
    visits:[],
    color:[],
    photos:[],
    contracts:[]
  };
  state.clients.unshift(client);
  return client;
}
function serviceToList(value){
  const service = String(value || "Wizyta");
  if(service === "Korekta + koloryzacja") return ["Korekta", "Koloryzacja"];
  if(service === "Nowe założenie + koloryzacja") return ["Nowe założenie", "Koloryzacja"];
  return [service];
}
async function addQuickBusyVisit(event){
  event.preventDefault();
  const form = event.currentTarget;
  const note = $("#quickBusyNote");
  const data = new FormData(form);
  const client = findOrCreateClient(data.get("client"));
  const date = data.get("date");
  const start = data.get("start");
  const end = data.get("end");
  if(!client || !date || !start || !end){
    if(note) note.textContent = "Uzupełnij klientkę, datę oraz godziny.";
    return;
  }
  if(timeToMinutes(end) <= timeToMinutes(start)){
    if(note) note.textContent = "Godzina zakończenia musi być później niż rozpoczęcia.";
    return;
  }
  const serviceName = data.get("service") || "Wizyta";
  const visit = {
    id:"v" + Date.now(),
    client:client.name,
    date,
    time:start,
    endTime:end,
    durationMinutes:timeToMinutes(end) - timeToMinutes(start),
    services:serviceToList(serviceName),
    type:"Wizyta",
    note:data.get("note") || "Szybki wpis z panelu"
  };
  client.visits = client.visits || [];
  client.visits.unshift(visit);
  save();
  await clearPublishedSlotsForVisit(visit);
  availabilitySlotsLoaded = false;
  await loadAvailabilitySlots();
  renderGlobalLists();
  renderSuggestedSlots();
  renderSlotCalendar();
  renderAvailabilitySlots();
  renderDashboard();
  form.reset();
  const dateInput = form.querySelector('input[name="date"]');
  if(dateInput) dateInput.value = today();
  if(note) note.textContent = "Termin wpisany i zdjęty z wolnych okienek.";
}
function renderSlotCalendar(){
  const grid = $("#slotCalendarGrid");
  const label = $("#slotMonthLabel");
  const dateInput = $('#slotForm input[name="date"]');
  if(!grid || !label || !dateInput) return;

  if(!dateInput.value) dateInput.value = selectedSlotDate;
  label.textContent = slotCalendarMonth.toLocaleDateString("pl-PL", { month:"long", year:"numeric" });
  const firstDay = new Date(slotCalendarMonth);
  const daysInMonth = new Date(slotCalendarMonth.getFullYear(), slotCalendarMonth.getMonth() + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const todayKey = today();
  const selected = selectedSlotDate || dateInput.value;
  const cells = [];

  for(let i = 0; i < startOffset; i++) cells.push('<button class="slot-calendar-day empty" type="button"></button>');
  for(let day = 1; day <= daysInMonth; day++){
    const current = new Date(slotCalendarMonth.getFullYear(), slotCalendarMonth.getMonth(), day);
    const key = slotCalendarDateKey(current);
    const daySlots = slotsForDate(key);
    const past = key < todayKey ? "past" : "";
    const active = key === selected ? "selected" : "";
    const hasSlots = daySlots.length ? "has-slots" : "";
    const count = daySlots.length ? `<span class="slot-day-count">${daySlots.length} termin${daySlots.length === 1 ? "" : "y"}</span>` : "";
    cells.push(`<button class="slot-calendar-day ${past} ${active} ${hasSlots}" type="button" data-slot-date="${key}"><span>${day}</span>${count}</button>`);
  }

  grid.innerHTML = cells.join("");
  $all("[data-slot-date]", grid).forEach(button => {
    button.addEventListener("click", () => {
      selectedSlotDate = button.dataset.slotDate;
      dateInput.value = button.dataset.slotDate;
      renderSlotCalendar();
      renderAvailabilitySlots();
      renderSuggestedSlots();
    });
  });
  renderSelectedSlotSummary();
}
function renderSelectedSlotSummary(){
  const title = $("#slotSelectedDayTitle");
  const meta = $("#slotSelectedDayMeta");
  if(!title || !meta) return;
  const slots = slotsForDate(selectedSlotDate);
  title.textContent = slotDateLabel(selectedSlotDate);
  if(!availabilitySlotsLoaded){
    meta.textContent = "Ładuję terminy...";
    return;
  }
  meta.textContent = slots.length
    ? `${slots.length} dostępne bloki w tym dniu.`
    : "Brak dodanych wolnych terminów w tym dniu.";
}
function renderAvailabilitySlots(){
  const node = $("#slotList");
  if(!node) return;
  if(!hbsDb){
    node.innerHTML = `<div class="empty">Terminy online pojawią się tutaj po połączeniu panelu z Supabase.</div>`;
    return;
  }
  if(!availabilitySlotsLoaded){
    node.innerHTML = `<div class="empty">Ładuję dostępne terminy...</div>`;
    loadAvailabilitySlots().then(result => {
      if(!result.ok){
        node.innerHTML = `<div class="empty">Nie udało się pobrać terminów. Sprawdź, czy w Supabase jest dodana kolumna duration_minutes.<br>${esc(result.message)}</div>`;
        return;
      }
      renderSlotCalendar();
      renderAvailabilitySlots();
      renderSuggestedSlots();
      renderDashboard();
    });
    return;
  }
  renderSelectedSlotSummary();
  const selectedSlots = slotsForDate(selectedSlotDate);
  const upcomingSlots = availabilitySlots.filter(slot => slot.visit_date !== selectedSlotDate).slice(0, 8);
  if(!availabilitySlots.length){
    node.innerHTML = `<div class="empty">Nie masz jeszcze dodanych terminów.</div>`;
    return;
  }
  const selectedHtml = selectedSlots.map(slot => `
    <div class="slot-row current-day">
      <div>
        <span class="slot-time">${esc(String(slot.visit_time || "").slice(0,5))}</span>
        <div class="meta">${esc(slot.note || "wolny termin")} · ${slotDurationText(slot.duration_minutes)} · ${esc(slotStatusText(slot.status))}</div>
      </div>
      <button class="btn secondary mini" data-delete-slot="${esc(slot.id)}">Usuń</button>
    </div>
  `).join("") || `<div class="empty">Ten dzień jest pusty. Dodaj termin formularzem powyżej.</div>`;
  const upcomingHtml = upcomingSlots.map(slot => `
    <div class="slot-row">
      <div>
        <b>${formatOnlineDate(slot.visit_date)} · ${esc(String(slot.visit_time || "").slice(0,5))}</b>
        <div class="meta">${esc(slot.note || "wolny termin")} · ${slotDurationText(slot.duration_minutes)} · ${esc(slotStatusText(slot.status))}</div>
      </div>
      <button class="btn secondary mini" data-delete-slot="${esc(slot.id)}">Usuń</button>
    </div>
  `).join("");
  node.innerHTML = `
    <h3 style="margin:14px 0 4px">Terminy z wybranego dnia</h3>
    ${selectedHtml}
    ${upcomingHtml ? `<h3 style="margin:18px 0 4px">Najbliższe kolejne terminy</h3>${upcomingHtml}` : ""}
  `;
  $all("[data-delete-slot]", node).forEach(button => {
    button.addEventListener("click", () => deleteAvailabilitySlot(button.dataset.deleteSlot));
  });
  renderSuggestedSlots();
}
async function addAvailabilitySlot(event){
  event.preventDefault();
  if(!hbsDb){
    alert("Najpierw podłącz panel z Supabase.");
    return;
  }
  const form = new FormData(event.target);
  const payload = {
    visit_date: form.get("date"),
    visit_time: form.get("time"),
    duration_minutes: Number(form.get("duration") || 180),
    note: form.get("note") || "",
    status: "free"
  };
  const { error } = await hbsDb.from("availability_slots").insert(payload);
  if(error){
    alert(error.message || "Nie udało się dodać terminu.");
    return;
  }
  selectedSlotDate = payload.visit_date;
  event.target.reset();
  event.target.elements.date.value = selectedSlotDate;
  renderSlotCalendar();
  availabilitySlotsLoaded = false;
  await loadAvailabilitySlots();
  renderSlotCalendar();
  renderAvailabilitySlots();
  renderSuggestedSlots();
  renderDashboard();
}
async function deleteAvailabilitySlot(id){
  if(!hbsDb) return;
  if(!confirm("Usunąć ten termin?")) return;
  const { error } = await hbsDb.from("availability_slots").delete().eq("id", id);
  if(error){
    alert(error.message || "Nie udało się usunąć terminu.");
    return;
  }
  availabilitySlotsLoaded = false;
  onlineBookingsLoaded = false;
  await loadAvailabilitySlots();
  renderSlotCalendar();
  renderAvailabilitySlots();
  renderSuggestedSlots();
  renderDashboard();
  renderOnlineBookings();
}
function bookingStatusText(status){
  return ({pending:"oczekuje",accepted:"zaakceptowana",rejected:"odrzucona",cancelled:"anulowana"})[status] || status;
}
function renderOnlineBookings(){
  const node = $("#onlineBookingList");
  if(!node) return;
  if(!hbsDb){
    node.innerHTML = `<div class="empty">Panel nie ma jeszcze połączenia z Supabase.</div>`;
    return;
  }
  if(!onlineBookingsLoaded){
    node.innerHTML = `<div class="empty">Ładuję rezerwacje...</div>`;
    loadOnlineBookings().then(result => {
      if(!result.ok){
        node.innerHTML = `<div class="empty">Nie udało się pobrać rezerwacji. Uruchom dodatkowy plik SQL dla panelu w Supabase.<br>${esc(result.message)}</div>`;
        return;
      }
      renderOnlineBookings();
    });
    return;
  }
  if(!onlineBookings.length){
    node.innerHTML = `<div class="empty">Nie ma jeszcze rezerwacji online.</div>`;
    return;
  }
  node.innerHTML = onlineBookings.map(item => `
    <div class="record booking-card">
      <div>
        <h3>${esc(item.client_name)}</h3>
        <div class="meta">${esc(item.phone)} · ${esc(item.service)}</div>
        <div class="booking-date"><b>${formatOnlineDate(item.visit_date)}</b> · ${esc(String(item.visit_time || "").slice(0,5))}<br>${esc(item.slot_note || "termin ze strony")}</div>
        ${item.message ? `<p>${esc(consultationMessage(item.message).text)}</p>` : ""}
        ${consultationPhotos(item.message)}
        <div class="meta">Wysłano: ${formatOnlineDateTime(item.created_at)}</div>
      </div>
      <div>
        <span class="status-pill ${esc(item.status)}">${esc(bookingStatusText(item.status))}</span>
        <div class="booking-actions">
          <button class="btn" data-online-status="accepted" data-booking-id="${esc(item.id)}" ${item.status==="accepted" ? "disabled" : ""}>Akceptuj</button>
          <button class="btn secondary" data-online-status="rejected" data-booking-id="${esc(item.id)}" ${item.status==="rejected" ? "disabled" : ""}>Odrzuć</button>
          <button class="btn secondary" data-delete-booking="${esc(item.id)}">Usuń</button>
        </div>
      </div>
    </div>
  `).join("");
  loadConsultationPhotos(node);
  $all("[data-online-status]", node).forEach(button => {
    button.addEventListener("click", () => updateOnlineBooking(button.dataset.bookingId, button.dataset.onlineStatus));
  });
  $all("[data-delete-booking]", node).forEach(button => {
    button.addEventListener("click", () => deleteOnlineBooking(button.dataset.deleteBooking));
  });
}
function formatOnlineDate(date){
  if(!date) return "";
  return new Date(date + "T12:00:00").toLocaleDateString("pl-PL", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
}
function formatOnlineDateTime(value){
  if(!value) return "";
  return new Date(value).toLocaleString("pl-PL", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}
async function updateOnlineBooking(id, status){
  if(!hbsDb) return;
  const { error } = await hbsDb.rpc("set_booking_status", { p_request_id:id, p_status:status });
  if(error){
    alert(error.message || "Nie udało się zmienić statusu.");
    return;
  }
  onlineBookingsLoaded = false;
  renderOnlineBookings();
}
async function deleteOnlineBooking(id){
  if(!hbsDb) return;
  if(!confirm("Usunąć to zgłoszenie z panelu?")) return;
  const { error } = await hbsDb.rpc("delete_booking_request", { p_request_id:id });
  if(error){
    alert(error.message || "Nie udało się usunąć zgłoszenia. Uruchom plik SQL do usuwania zgłoszeń w Supabase.");
    return;
  }
  onlineBookingsLoaded = false;
  availabilitySlotsLoaded = false;
  await loadOnlineBookings();
  await loadAvailabilitySlots();
  renderOnlineBookings();
  renderGlobalLists();
  renderAvailabilitySlots();
  renderSuggestedSlots();
  renderDashboard();
}
function deleteConsultation(source, id){
  if(source === "online"){
    deleteOnlineBooking(id);
    return;
  }
  const [clientId, indexText] = String(id || "").split("|");
  const client = state.clients.find(c => c.id === clientId);
  const index = Number(indexText);
  if(!client || !Number.isInteger(index)) return;
  if(!confirm("Usunąć tę konsultację z panelu?")) return;
  client.consultations.splice(index, 1);
  save();
  renderGlobalLists();
  if(activeClientId === clientId) renderClientCard();
}
$("#refreshOnlineBookings")?.addEventListener("click", async () => {
  onlineBookingsLoaded = false;
  availabilitySlotsLoaded = false;
  await loadAvailabilitySlots();
  await loadOnlineBookings();
  renderSlotCalendar();
  renderAvailabilitySlots();
  renderSuggestedSlots();
  renderDashboard();
  renderOnlineBookings();
});
$("#slotForm")?.addEventListener("submit", addAvailabilitySlot);
$("#quickBusyForm")?.addEventListener("submit", addQuickBusyVisit);
$("#suggestedDuration")?.addEventListener("change", renderSuggestedSlots);
$("#suggestedNote")?.addEventListener("input", renderSuggestedSlots);
$("#dashboardPrevDay")?.addEventListener("click", () => {
  dashboardDateKey = moveDashboardWorkDate(-1);
  renderDashboard();
});
$("#dashboardNextDay")?.addEventListener("click", () => {
  dashboardDateKey = moveDashboardWorkDate(1);
  renderDashboard();
});
$('#slotForm input[name="date"]')?.addEventListener("change", event => {
  selectedSlotDate = event.target.value || today();
  const date = new Date(`${selectedSlotDate}T12:00:00`);
  slotCalendarMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  renderSlotCalendar();
  renderAvailabilitySlots();
  renderSuggestedSlots();
});
$all("[data-slot-preset]").forEach(button => {
  button.addEventListener("click", () => {
    const form = $("#slotForm");
    if(!form) return;
    const presets = {
      consultation:{ duration:"15", note:"konsultacja" },
      install:{ duration:"180", note:"założenie / korekta" },
      color:{ duration:"300", note:"usługa + koloryzacja" },
      remove:{ duration:"60", note:"ściąganie włosów" }
    };
    const preset = presets[button.dataset.slotPreset];
    form.elements.duration.value = preset.duration;
    form.elements.note.value = preset.note;
    if(!form.elements.date.value) form.elements.date.value = selectedSlotDate;
  });
});
$("#slotPrevMonth")?.addEventListener("click", () => {
  slotCalendarMonth = new Date(slotCalendarMonth.getFullYear(), slotCalendarMonth.getMonth() - 1, 1);
  renderSlotCalendar();
});
$("#slotNextMonth")?.addEventListener("click", () => {
  slotCalendarMonth = new Date(slotCalendarMonth.getFullYear(), slotCalendarMonth.getMonth() + 1, 1);
  renderSlotCalendar();
});
function renderList(id, items){
  const node = $("#" + id);
  if(!node) return;
  node.innerHTML = items.map(i => `<div class="record">${formatRecord(i)}</div>`).join("") || `<div class="empty">Brak wpisów.</div>`;
}
function renderConsultationList(id, items){
  const node = $("#" + id);
  if(!node) return;
  node.innerHTML = items.map(i => `
    <div class="record">
      ${formatRecord(i._source === "online" ? {...i, note:consultationMessage(i.note).text} : i)}
      ${i._source === "online" ? consultationPhotos(i.note) : ""}
      <div class="actions" style="margin-top:14px">
        <button class="btn secondary mini" data-delete-consultation-source="${esc(i._source)}" data-delete-consultation-id="${esc(i._source === "online" ? i._bookingId : `${i._clientId}|${i._consultationIndex}`)}">Usuń</button>
      </div>
    </div>
  `).join("") || `<div class="empty">Brak wpisów.</div>`;
  loadConsultationPhotos(node);
  $all("[data-delete-consultation-source]", node).forEach(button => {
    button.addEventListener("click", () => deleteConsultation(button.dataset.deleteConsultationSource, button.dataset.deleteConsultationId));
  });
}
function renderVisitList(id, items, options={}){
  const node = $("#" + id);
  if(!node) return;
  const total = items.reduce((sum, item) => sum + moneyNumber(item.price), 0);
  const visitsHtml = items.map(i => `<div class="record">${formatVisitRecord(i.clientId, i)}</div>`).join("");
  const emptyText = options.emptyText || "Brak wizyt.";
  const summary = options.dailySummary ? `
    <div class="record visit-card">
      <div class="visit-head">
        <div>
          <h3>Podsumowanie dnia</h3>
          <div class="meta">${esc(today())} · ${items.length} ${items.length === 1 ? "wizyta" : "wizyt"}</div>
        </div>
        <div class="visit-price">${total ? `${Math.round(total)} zł` : "0 zł"}</div>
      </div>
    </div>` : "";
  node.innerHTML = visitsHtml ? visitsHtml + summary : `<div class="empty">${esc(emptyText)}</div>${summary}`;
  bindActions(node);
}
function bindPastRevenueForm(){
  const form = $("#pastRevenueForm");
  if(!form) return;
  const dateInput = form.elements.date;
  const clientSelect = form.elements.clientId;
  if(dateInput && !dateInput.value) dateInput.value = today();
  if(clientSelect){
    const selected = clientSelect.value;
    clientSelect.innerHTML = `<option value="">Bez klientki</option>` + clientOptions(selected);
    clientSelect.value = selected || "";
  }
  form.onsubmit = e => {
    e.preventDefault();
    const f = new FormData(form);
    const amountRaw = String(f.get("amount") || "").trim();
    const amount = moneyNumber(amountRaw);
    if(!amount){
      alert("Wpisz kwotę.");
      return;
    }
    const clientId = String(f.get("clientId") || "");
    const client = state.clients.find(c => c.id === clientId);
    state.pastRevenues ||= [];
    state.pastRevenues.unshift({
      id:"pr" + Date.now(),
      date:String(f.get("date") || today()),
      amount:`${Math.round(amount)} zł`,
      clientId,
      clientName:client?.name || ""
    });
    save();
    form.reset();
    if(dateInput) dateInput.value = today();
    renderAll();
  };
}
function renderPastRevenueList(){
  const node = $("#pastRevenueList");
  if(!node) return;
  const items = [...(state.pastRevenues || [])].sort((a,b) => String(b.date || "").localeCompare(String(a.date || "")));
  const total = items.reduce((sum, item) => sum + moneyNumber(item.amount), 0);
  node.innerHTML = items.map(item => `
    <div class="record visit-card">
      <div class="visit-head">
        <div>
          <h3>${esc(item.date || "Bez daty")}</h3>
          <div class="meta">${esc(item.clientName || "Bez klientki")}</div>
        </div>
        <div class="visit-price">${esc(item.amount || "0 zł")}</div>
      </div>
      <div class="actions" style="margin-top:14px">
        <button class="btn secondary mini" data-delete-past-revenue="${esc(item.id)}">Usuń</button>
      </div>
    </div>
  `).join("") || `<div class="empty">Brak dopisanych starych przychodów.</div>`;
  if(items.length){
    node.innerHTML += `<div class="record"><b>Razem dopisane:</b> ${Math.round(total)} zł</div>`;
  }
  $all("[data-delete-past-revenue]", node).forEach(button => {
    button.addEventListener("click", () => deletePastRevenue(button.dataset.deletePastRevenue));
  });
}
function deletePastRevenue(id){
  if(!confirm("Usunąć ten dopisany przychód?")) return;
  state.pastRevenues = (state.pastRevenues || []).filter(item => item.id !== id);
  save();
  renderAll();
}
function modal(html){
  $("#modalCard").classList.remove("tablet-card");
  $("#modalCard").innerHTML = html;
  $("#modal").classList.add("show");
  setupPhoneFields($("#modalCard"));
  bindActions($("#modalCard"));
}
function closeModal(){
  $("#modal").classList.remove("show");
  $("#modalCard").classList.remove("tablet-card");
  $("#modalCard").innerHTML = "";
}
$("#modal").addEventListener("click", e => { if(e.target.id === "modal") closeModal(); });

function clientOptions(selected=""){
  return state.clients.map(c => `<option value="${c.id}" ${c.id===selected?"selected":""}>${esc(c.name)}</option>`).join("");
}
function fileNames(input){
  return Array.from(input?.files || []).map(file => file.name).join(", ");
}
function openClientForm(){
  modal(`<div class="modal-head"><h2>Nowa klientka</h2><button class="btn secondary" data-close-modal>Zamknij</button></div>
  <form id="clientForm">
    <div class="form-row"><div><label>Imię i nazwisko</label><input name="name" required></div><div><label>Telefon</label><div class="phone-row"><select data-phone-country="client"><option value="PL" data-prefix="+48" data-digits="9">+48 PL</option><option value="GB" data-prefix="+44" data-digits="10">+44 UK</option><option value="DE" data-prefix="+49" data-digits="11">+49 DE</option></select><input name="phone" data-phone-input="client" required inputmode="numeric"></div></div></div>
    <label>Adres</label><input name="address" placeholder="Ulica, numer, kod pocztowy, miasto">
    <div class="form-row"><div><label>Instagram</label><input name="instagram"></div><div><label>Data pierwszej wizyty</label><input type="date" name="firstVisit"></div></div>
    <div class="form-row"><div><label>Aktualna metoda</label><select name="method"><option>Brak</option><option>Nano</option><option>Mini</option><option>Micro</option><option>Standard</option></select></div><div><label>Gramatura</label><select name="grams"><option>Brak</option><option>50g</option><option>100g</option><option>150g</option><option>200g</option></select></div></div>
    <div class="form-row"><div><label>Długość</label><select name="length"><option>40cm</option><option>50cm</option><option>60cm</option><option>70cm</option></select></div><div><label>Kolor</label><input name="color"></div></div>
    <label>Zdjęcia startowe: przód, tył, łączenia</label><input type="file" name="photos" accept="image/*" multiple>
    <label>Umowa: zdjęcie podpisanej umowy</label><input type="file" name="contractPhoto" accept="image/*,.pdf">
    <label>Notatki techniczne</label><textarea name="techNotes"></textarea>
    <label>Notatki prywatne</label><textarea name="privateNotes"></textarea>
    <button class="btn">Zapisz klientkę</button>
  </form>`);
  $("#clientForm").addEventListener("submit", async e => {
    e.preventDefault();
    if(!phoneValid(e.target, "client")){
      alert("Sprawdź numer telefonu - liczba cyfr musi pasować do wybranego kraju.");
      return;
    }
    const f = new FormData(e.target);
    const uploaded=await preparePanelAttachments(e.target);if(!uploaded)return;
    const photos = fileNames(e.target.elements.photos);
    const contractPhoto = fileNames(e.target.elements.contractPhoto);
    state.clients.push({id:"c"+Date.now(), name:f.get("name"), address:f.get("address"), phone:phoneValue(e.target, "client"), instagram:f.get("instagram"), firstVisit:f.get("firstVisit"), method:f.get("method"), grams:f.get("grams"), length:f.get("length"), color:f.get("color"), lastVisit:"", lastPrice:"", techNotes:f.get("techNotes"), privateNotes:f.get("privateNotes"), consultations:[], visits:[], colors:[], photos:photos?[{id:"p"+Date.now(), category:"Startowe", photo:photos, _attachments:uploaded.photos, date:today()}]:[], contracts:contractPhoto?[{id:"u"+Date.now(), signedDate:f.get("firstVisit"), contractPhoto, _attachments:uploaded.contractPhoto, note:"Umowa startowa"}]:[]});
    save(); closeModal(); showView("clients");
  });
}
function checkedValues(form, name){
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value);
}
function openFreeConsultation(){
  modal(`<div class="modal-head"><h2>Konsultacja przedłużania włosów</h2><button class="btn secondary" data-close-modal>Zamknij</button></div>
  <form id="freeConsultForm">
    <div class="form-row"><div><label>Imię i nazwisko</label><input name="name" required placeholder="Wpisz dane klientki"></div><div><label>Telefon</label><div class="phone-row"><select data-phone-country="consult"><option value="PL" data-prefix="+48" data-digits="9">+48 PL</option><option value="GB" data-prefix="+44" data-digits="10">+44 UK</option><option value="DE" data-prefix="+49" data-digits="11">+49 DE</option></select><input name="phone" data-phone-input="consult" required inputmode="numeric"></div></div></div>
    <label>Adres e-mail opcjonalnie</label><input name="email">

    <h3>Cel wizyty</h3>
    <div class="checks">${["Zagęszczenie","Przedłużenie","Zagęszczenie i przedłużenie"].map(v=>`<label><input type="checkbox" name="goal" value="${v}">${v}</label>`).join("")}</div>
    <label>Docelowa długość włosów</label><select name="targetLength"><option>40 cm</option><option>50 cm</option><option>60 cm</option><option>70 cm</option><option>Inna</option></select>
    <label>Inna długość</label><input name="otherLength">
    <label>Czy zależy Ci na możliwości noszenia wysokiego kucyka?</label><select name="highPonytail"><option>Tak</option><option>Nie</option></select>

    <h3>Informacje o włosach</h3>
    <div class="form-row"><div><label>Jak określiłabyś swoje włosy?</label><select name="hairType"><option>Bardzo cienkie</option><option>Cienkie</option><option>Średnie</option><option>Grube</option></select></div><div><label>Gęstość włosów</label><select name="density"><option>Mała</option><option>Średnia</option><option>Duża</option></select></div></div>
    <div class="form-row"><div><label>Czy włosy nadmiernie wypadają?</label><select name="hairLoss"><option>Tak</option><option>Nie</option></select></div><div><label>Czy skóra głowy jest wrażliwa?</label><select name="sensitiveScalp"><option>Tak</option><option>Nie</option></select></div></div>

    <h3>Informacje zdrowotne</h3>
    <label>Czy w ciągu ostatnich 6 miesięcy miałaś:</label>
    <div class="checks">${["Operację","Znieczulenie ogólne / narkozę","Poważną chorobę","Nic z powyższych"].map(v=>`<label><input type="checkbox" name="recentHealth" value="${v}">${v}</label>`).join("")}</div>
    <label>Czy przyjmujesz leki mogące wpływać na kondycję włosów?</label><select name="meds"><option>Tak</option><option>Nie</option></select>
    <label>Jeżeli tak, jakie?</label><input name="medsNote">
    <label>Czy występują u Ciebie:</label>
    <div class="checks">${["Choroby tarczycy","Anemia","Problemy hormonalne","Łuszczyca skóry głowy","Łojotokowe zapalenie skóry","Łysienie","Brak"].map(v=>`<label><input type="checkbox" name="conditions" value="${v}">${v}</label>`).join("")}</div>

    <h3>Ustalenia</h3>
    <div class="form-row"><div><label>Rodzaj włosów</label><input name="hairKind"></div><div><label>Długość</label><input name="finalLength"></div></div>
    <div class="form-row"><div><label>Gramatura / zagęszczenie</label><input name="finalGrams"></div><div><label>Metoda</label><select name="finalMethod"><option>Keratyna</option><option>Tape On</option><option>Bio taśmy</option><option>Koralikowa</option></select></div></div>
    <div data-keratin-connection>
      <label>Rodzaj łączeń przy metodzie keratynowej</label>
      <select name="connection"><option>Nano</option><option>Micro</option><option>Mini</option><option>Standard</option></select>
    </div>
    <div class="form-row"><div><label>Kolor</label><input name="finalColor"></div><div><label>Cena</label><input name="finalPrice"></div></div>
    <label>Termin założenia</label><input type="date" name="installDate">
    <label>Uwagi stylistki</label><textarea name="stylistNotes"></textarea>
    <button class="btn">Zapisz konsultację</button>
  </form>`);
  const freeConsultForm = $("#freeConsultForm");
  const syncKeratinConnection = () => {
    const isKeratin = freeConsultForm.elements.finalMethod.value === "Keratyna";
    freeConsultForm.querySelector("[data-keratin-connection]").classList.toggle("hidden", !isKeratin);
  };
  freeConsultForm.elements.finalMethod.addEventListener("change", syncKeratinConnection);
  syncKeratinConnection();
  freeConsultForm.addEventListener("submit", e => {
    e.preventDefault();
    if(e.target.elements.phone.value && !phoneValid(e.target, "consult")){
      alert("Sprawdź numer telefonu - liczba cyfr musi pasować do wybranego kraju.");
      return;
    }
    const f = new FormData(e.target);
    const finalMethod = f.get("finalMethod");
    const finalConnection = finalMethod === "Keratyna" ? f.get("connection") : "";
    const methodSummary = finalConnection ? `${finalMethod} - ${finalConnection}` : finalMethod;
    const consultation = {
      id:"co"+Date.now(),
      date:today(),
      type:"Konsultacja przedłużania",
      email:f.get("email"),
      goal:checkedValues(e.target,"goal").join(", "),
      targetLength:f.get("targetLength") === "Inna" ? f.get("otherLength") : f.get("targetLength"),
      highPonytail:f.get("highPonytail"),
      hairType:f.get("hairType"),
      density:f.get("density"),
      hairLoss:f.get("hairLoss"),
      sensitiveScalp:f.get("sensitiveScalp"),
      recentHealth:checkedValues(e.target,"recentHealth").join(", "),
      meds:`${f.get("meds")} ${f.get("medsNote") || ""}`.trim(),
      conditions:checkedValues(e.target,"conditions").join(", "),
      method:finalMethod,
      connection:finalConnection,
      ustalenia:`${f.get("hairKind")} / ${f.get("finalLength")} / ${f.get("finalGrams")} / ${methodSummary} / ${f.get("finalColor")}`,
      price:f.get("finalPrice"),
      installDate:f.get("installDate"),
      note:f.get("stylistNotes")
    };
    const c = {
      id:"c"+Date.now(),
      name:f.get("name"),
      address:"",
      phone:phoneValue(e.target, "consult"),
      email:f.get("email"),
      instagram:"",
      firstVisit:"",
      method:"",
      grams:"",
      length:"",
      color:"",
      lastVisit:"",
      lastPrice:"",
      techNotes:"Klientka po konsultacji wstępnej. Nie zdecydowała jeszcze o przedłużaniu ani korekcie.",
      privateNotes:"",
      consultations:[consultation],
      visits:[],
      colors:[],
      photos:[],
      contracts:[]
    };
    state.clients.unshift(c);
    save(); closeModal(); activeClientId=c.id; showView("consultations");
  });
}
function openVisitForm(clientId, presetInstall=false, visitId=""){
  const selectedClient = state.clients.find(c => c.id === clientId) || {};
  const editedVisit = selectedClient.visits?.find(v => v.id === visitId) || null;
  const isEdit = Boolean(editedVisit);
  const isInstall = presetInstall || Boolean(editedVisit?.services?.includes("Nowe założenie"));
  const isNewInstallClient = isInstall && !clientId && !visitId;
  const colorDetails = editedVisit?.colorDetails || {};
  const serviceOptions = isInstall ? ["Korekta","Nowe założenie","Koloryzacja","Tonowanie","Pielęgnacja","Botoks","Ściąganie włosów","Szkolenie"] : ["Korekta","Koloryzacja","Tonowanie","Pielęgnacja","Botoks","Ściąganie włosów","Szkolenie"];
  const checkedService = service => (editedVisit?.services || []).includes(service) || (!isEdit && isInstall && service === "Nowe założenie") ? "checked" : "";
  const selected = (value, current) => value === current ? "selected" : "";
  modal(`<div class="modal-head"><h2>${isEdit ? "Edytuj wizytę" : isInstall ? "Nowe założenie" : "Dodaj wizytę"}</h2><button class="btn secondary" data-close-modal>Zamknij</button></div>
  <form id="visitForm">
    ${isNewInstallClient ? `
      <div class="form-row">
        <div><label>Imię i nazwisko klientki</label><input name="newClientName" required placeholder="Wpisz dane klientki"></div>
        <div><label>Telefon</label><div class="phone-row"><select data-phone-country="install"><option value="PL" data-prefix="+48" data-digits="9">+48 PL</option><option value="GB" data-prefix="+44" data-digits="10">+44 UK</option><option value="DE" data-prefix="+49" data-digits="11">+49 DE</option></select><input name="newClientPhone" data-phone-input="install" required inputmode="numeric"></div></div>
      </div>
    ` : `<label>Klientka</label><select name="clientId">${clientOptions(clientId)}</select>`}
    ${isInstall ? `<label>Adres klientki do umowy</label><input name="clientAddress" value="${esc(selectedClient.address || "")}" placeholder="Ulica, numer, kod pocztowy, miasto">` : ""}
    <div class="form-row cols-3">
      <div><label>Data</label><input type="date" name="date" value="${esc(editedVisit?.date || today())}"></div>
      <div><label>Godzina</label><input type="time" name="time" value="${esc(editedVisit?.time || "")}"></div>
      <div><label>Czas wizyty</label><select name="durationMinutes">
        ${[
          ["60","1h - ściąganie"],
          ["180","3h - wizyta"],
          ["300","5h - z koloryzacją"]
        ].map(([value, label]) => `<option value="${value}" ${selected(value, String(editedVisit?.durationMinutes || "180"))}>${label}</option>`).join("")}
      </select></div>
    </div>
    <label>Usługi</label><div class="checks">${serviceOptions.map(s=>`<label><input type="checkbox" name="services" value="${s}" ${checkedService(s)}>${s}</label>`).join("")}</div>
    ${isInstall ? `
    <div class="calc-box">
      <div class="form-row">
        <div><label>Metoda</label><select name="method">
          ${["Keratyna Nano","Keratyna Micro","Keratyna Mini","Keratyna Standard","Tape On","Bio Tape KLASIC","Bio Tape MAGIC"].map(value => `<option ${selected(value, editedVisit?.method || "Keratyna Nano")}>${value}</option>`).join("")}
        </select></div>
        <div><label>Rodzaj włosów</label><select name="hairKind">
          ${["Rosyjskie","Słowiańskie Lux","Słowiańskie Premium","Dziewicze polskie"].map(value => `<option ${selected(value, editedVisit?.hairKind || "Rosyjskie")}>${value}</option>`).join("")}
        </select></div>
      </div>
      <div class="form-row">
        <div><label>Ilość gram</label><input name="grams" inputmode="decimal" placeholder="np. 70" value="${esc(editedVisit?.grams || "")}"></div>
        <div><label>Długość włosów</label><select name="length">${["40cm","45cm","50cm","55cm","60cm","65cm","70cm"].map(value => `<option ${selected(value, editedVisit?.length || "40cm")}>${value}</option>`).join("")}</select></div>
      </div>
      <label><input type="checkbox" name="specialHair" ${editedVisit?.specialHair ? "checked" : ""}> Ombre albo włosy falowane +100 zł</label>
      <div class="calc-total">
        <div><small>Włosy</small><b data-hair-cost>-</b></div>
        <div><small>Założenie</small><b data-work-cost>-</b></div>
        <div><small>Dopłata</small><b data-extra-cost>-</b></div>
        <div><small>Zadatek 60%</small><b data-deposit>-</b></div>
      </div>
    </div>
    ` : `
    <div class="form-row"><div><label>Metoda</label><select name="method">${["Nano","Mini","Micro","Standard"].map(value => `<option ${selected(value, editedVisit?.method || "Nano")}>${value}</option>`).join("")}</select></div><div><label>Gramatura</label><select name="grams">${["50g","100g","150g","200g"].map(value => `<option ${selected(value, editedVisit?.grams || "50g")}>${value}</option>`).join("")}</select></div></div>
    <div class="form-row"><div><label>Długość</label><select name="length">${["40cm","50cm","60cm","70cm"].map(value => `<option ${selected(value, editedVisit?.length || "40cm")}>${value}</option>`).join("")}</select></div><div></div></div>
    `}
    <div class="form-row"><div><label>Kolor</label><input name="color" value="${esc(editedVisit?.color || "")}"></div><div><label>Cena końcowa</label><input name="price" value="${esc(editedVisit?.price || "")}" ${isInstall ? "readonly" : ""}></div></div>
    <div class="form-row"><div><label>Domówione włosy</label><select name="orderedHair"><option ${selected("Nie", editedVisit?.orderedHair || "Nie")}>Nie</option><option ${selected("Tak", editedVisit?.orderedHair || "Nie")}>Tak</option></select></div>${isInstall ? `<div><label>Kwota zadatku</label><input name="deposit" value="${esc(editedVisit?.deposit || "")}" readonly placeholder="Automatycznie 60%"></div>` : `<div></div>`}</div>
    <label>Uwagi do domówionych włosów</label><input name="orderedNote" value="${esc(editedVisit?.orderedNote || "")}" placeholder="kolor, długość, gramatura, uwagi">
    <div class="visit-color-section ${checkedService("Koloryzacja") ? "" : "hidden"}" data-color-section>
      <h3>Koloryzacja podczas wizyty</h3>
      <div class="form-row"><div><label>Odrost: farba</label><input name="colorRoot" value="${esc(colorDetails.colorRoot || "")}"></div><div><label>Ilość w gramach</label><input name="colorRootAmount" value="${esc(colorDetails.colorRootAmount || "")}"></div></div>
      <label>Oxydant: procent</label><input name="colorOxidant" value="${esc(colorDetails.oxidant || "")}">
      <div class="form-row"><div><label>Tonowanie: produkt</label><input name="colorToner" value="${esc(colorDetails.colorToner || "")}"></div><div><label>Ilość w gramach</label><input name="colorTonerAmount" value="${esc(colorDetails.colorTonerAmount || "")}"></div></div>
      <div class="form-row"><div><label>Pigmenty</label><input name="colorPigments" value="${esc(colorDetails.pigments || "")}"></div><div><label>Czas działania</label><input name="colorProcessingTime" value="${esc(colorDetails.processingTime || "")}"></div></div>
      <label>Efekt końcowy</label><input name="colorResult" value="${esc(colorDetails.result || "")}">
      <label>Notatka do koloryzacji</label><textarea name="colorNote">${esc(colorDetails.note || "")}</textarea>
    </div>
    <div class="form-row">
      <div><label>Zdjęcie po</label><input type="file" name="afterPhoto" accept="image/*">${editedVisit?.afterPhoto ? `<p class="meta">Obecnie: ${esc(editedVisit.afterPhoto)}</p>` : ""}</div>
      <div><label>Zdjęcie łączeń</label><input type="file" name="connectionPhoto" accept="image/*">${editedVisit?.connectionPhoto ? `<p class="meta">Obecnie: ${esc(editedVisit.connectionPhoto)}</p>` : ""}</div>
    </div>
    <label>Notatka po wizycie</label><textarea name="note">${esc(editedVisit?.note || "")}</textarea>
    <label>Prywatna notatka</label><textarea name="privateNote" placeholder="Informacje tylko dla salonu">${esc(editedVisit?.privateNote || "")}</textarea>
    <button class="btn">${isEdit ? "Zapisz zmiany" : "Zapisz wizytę"}</button>
  </form>`);
  const form = $("#visitForm");
  if(isInstall){
    const sync = () => {
      calculateInstallPrice(form);
      formField(form, "deposit").value = depositAmount(formField(form, "price").value);
    };
    ["method","hairKind","grams","length","specialHair"].forEach(name => {
      const control = formField(form, name);
      control.addEventListener("input", sync);
      control.addEventListener("change", sync);
    });
    if(formField(form, "clientId")){
      formField(form, "clientId").addEventListener("change", () => {
        const next = state.clients.find(c => c.id === formField(form, "clientId").value);
        formField(form, "clientAddress").value = next?.address || "";
      });
    }
    sync();
  }
  const syncColorSection = () => {
    const selectedServices = [...form.querySelectorAll('input[name="services"]:checked')].map(input => input.value);
    const hasColor = selectedServices.includes("Koloryzacja");
    const hasRemoval = selectedServices.includes("Ściąganie włosów");
    const hasExtension = selectedServices.includes("Korekta") || selectedServices.includes("Nowe założenie");
    form.querySelector("[data-color-section]")?.classList.toggle("hidden", !hasColor);
    if(hasRemoval && !formField(form, "price").value) formField(form, "price").value = "150 zł";
    const durationField = formField(form, "durationMinutes");
    if(durationField && !isEdit){
      durationField.value = hasRemoval ? "60" : hasColor && hasExtension ? "300" : "180";
    }
  };
  $all('input[name="services"]', form).forEach(input => input.addEventListener("change", syncColorSection));
  syncColorSection();
  $("#visitForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    if(isNewInstallClient && !phoneValid(e.target, "install")){
      alert("Sprawdź numer telefonu - liczba cyfr musi pasować do wybranego kraju.");
      return;
    }
    const uploaded=await preparePanelAttachments(e.target);if(!uploaded)return;
    let c = isNewInstallClient ? null : state.clients.find(x => x.id === f.get("clientId"));
    if(isNewInstallClient){
      c = {
        id:"c"+Date.now(),
        name:f.get("newClientName"),
        address:f.get("clientAddress"),
        phone:phoneValue(e.target, "install"),
        instagram:"",
        firstVisit:f.get("date"),
        method:"",
        grams:"",
        length:"",
        color:"",
        lastVisit:"",
        lastPrice:"",
        techNotes:"",
        privateNotes:"",
        consultations:[],
        visits:[],
        colors:[],
        photos:[],
        contracts:[]
      };
      state.clients.unshift(c);
    }
    if(!c){
      alert("Wybierz klientkę albo wpisz dane nowej klientki.");
      return;
    }
    c.visits ||= [];
    if(isInstall) c.address = f.get("clientAddress");
    const newAfterPhoto = fileNames(e.target.elements.afterPhoto);
    const newConnectionPhoto = fileNames(e.target.elements.connectionPhoto);
    const services = f.getAll("services");
    const hasColor = services.includes("Koloryzacja");
    const nextVisitId = editedVisit?.id || "v"+Date.now();
    const nextColorDetails = hasColor ? {
      colorRoot:f.get("colorRoot"),
      colorRootAmount:f.get("colorRootAmount"),
      root:`${f.get("colorRoot")} ${f.get("colorRootAmount")}`.trim(),
      oxidant:f.get("colorOxidant"),
      colorToner:f.get("colorToner"),
      colorTonerAmount:f.get("colorTonerAmount"),
      toner:`${f.get("colorToner")} ${f.get("colorTonerAmount")}`.trim(),
      pigments:f.get("colorPigments"),
      processingTime:f.get("colorProcessingTime"),
      result:f.get("colorResult"),
      note:f.get("colorNote")
    } : {};
    let colorRecordId = editedVisit?.colorRecordId || "";
    const visit = {
      id: nextVisitId,
      date:f.get("date"),
      time:f.get("time"),
      durationMinutes:Number(f.get("durationMinutes") || 180),
      services,
      method:f.get("method"),
      hairKind:f.get("hairKind") || "",
      grams:f.get("grams"),
      length:f.get("length"),
      color:f.get("color"),
      price:f.get("price"),
      deposit:isInstall ? (f.get("deposit") || depositAmount(f.get("price"))) : "",
      orderedHair:f.get("orderedHair"),
      orderedNote:f.get("orderedNote"),
      specialHair:Boolean(f.get("specialHair")),
      afterPhoto:newAfterPhoto || editedVisit?.afterPhoto || "",
      connectionPhoto:newConnectionPhoto || editedVisit?.connectionPhoto || "",
      _attachments:[...(editedVisit?._attachments||[]),...(uploaded.afterPhoto||[]),...(uploaded.connectionPhoto||[])],
      colorDetails:nextColorDetails,
      colorRecordId,
      note:f.get("note"),
      privateNote:f.get("privateNote")
    };
    if(hasColor){
      c.colors ||= [];
      const colorRecord = {
        id:colorRecordId || "k"+Date.now(),
        visitId:visit.id,
        source:"Wizyta",
        date:visit.date,
        root:nextColorDetails.root,
        oxidant:nextColorDetails.oxidant,
        toner:nextColorDetails.toner,
        pigments:nextColorDetails.pigments,
        processingTime:nextColorDetails.processingTime,
        result:nextColorDetails.result,
        note:nextColorDetails.note || visit.note
      };
      colorRecordId = colorRecord.id;
      visit.colorRecordId = colorRecordId;
      const colorIndex = c.colors.findIndex(item => item.id === colorRecord.id || item.visitId === visit.id);
      if(colorIndex >= 0) c.colors[colorIndex] = colorRecord;
      else c.colors.unshift(colorRecord);
    } else if(editedVisit?.colorRecordId){
      c.colors = (c.colors || []).filter(item => item.id !== editedVisit.colorRecordId && item.visitId !== visit.id);
    }
    if(isEdit){
      c.visits = c.visits.map(item => item.id === visit.id ? visit : item);
    } else {
      c.visits.unshift(visit);
    }
    c.method=f.get("method"); c.grams=f.get("grams"); c.length=f.get("length"); c.color=f.get("color"); c.lastVisit=f.get("date"); c.lastPrice=f.get("price");
    save(); activeClientId=c.id;
    await clearPublishedSlotsForVisit(visit);
    renderSuggestedSlots();
    renderDashboard();
    if(!isEdit && visit.services.includes("Nowe założenie")){
      openGeneratedContract(c.id, visit.id);
    } else {
      closeModal(); activeClientTab="visits"; showView("clientCard");
    }
  });
}
function openColorForm(clientId){
  modal(`<div class="modal-head"><h2>Dodaj koloryzację</h2><button class="btn secondary" data-close-modal>Zamknij</button></div>
  <form id="colorForm">
    <label>Klientka</label><select name="clientId">${clientOptions(clientId)}</select>
    <label>Data</label><input type="date" name="date" value="${today()}">
    <div class="form-row"><div><label>Odrost: farba</label><input name="root"></div><div><label>Ilość w gramach</label><input name="rootAmount"></div></div>
    <label>Oxydant: procent</label><input name="oxidant">
    <div class="form-row"><div><label>Tonowanie: produkt</label><input name="toner"></div><div><label>Ilość w gramach</label><input name="tonerAmount"></div></div>
    <div class="form-row"><div><label>Pigmenty</label><input name="pigments"></div><div><label>Czas działania</label><input name="processingTime"></div></div>
    <label>Efekt końcowy</label><input name="result">
    <label>Notatka</label><textarea name="note"></textarea>
    <button class="btn">Zapisz koloryzację</button>
  </form>`);
  $("#colorForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target), c = state.clients.find(x => x.id === f.get("clientId"));
    c.colors ||= [];
    c.colors.unshift({id:"k"+Date.now(), date:f.get("date"), root:`${f.get("root")} ${f.get("rootAmount")}`, oxidant:f.get("oxidant"), toner:`${f.get("toner")} ${f.get("tonerAmount")}`, pigments:f.get("pigments"), processingTime:f.get("processingTime"), result:f.get("result"), note:f.get("note")});
    save(); closeModal(); activeClientId=c.id; activeClientTab="colors"; showView("clientCard");
  });
}
function openPhotoForm(clientId){
  modal(`<div class="modal-head"><h2>Dodaj zdjęcia</h2><button class="btn secondary" data-close-modal>Zamknij</button></div>
  <form id="photoForm"><label>Klientka</label><select name="clientId">${clientOptions(clientId)}</select><label>Kategoria</label><select name="category"><option>Przed</option><option>Po</option><option>Łączenia</option><option>Inne</option></select><label>Wgraj zdjęcia</label><input type="file" name="photo" accept="image/*" multiple><label>Przypisz do wizyty / notatka</label><input name="note"><button class="btn">Zapisz zdjęcie</button></form>`);
  $("#photoForm").addEventListener("submit", async e => { e.preventDefault(); const uploaded=await preparePanelAttachments(e.target);if(!uploaded||!uploaded.photo?.length)return; const f=new FormData(e.target), c=state.clients.find(x=>x.id===f.get("clientId")); c.photos ||= []; c.photos.unshift({id:"p"+Date.now(), date:today(), category:f.get("category"), photo:fileNames(e.target.elements.photo), _attachments:uploaded.photo, note:f.get("note")}); save(); closeModal(); activeClientId=c.id; activeClientTab="photos"; showView("clientCard"); });
}
function openContractForm(clientId){
  modal(`<div class="modal-head"><h2>Dodaj umowę</h2><button class="btn secondary" data-close-modal>Zamknij</button></div>
  <form id="contractForm"><label>Klientka</label><select name="clientId">${clientOptions(clientId)}</select><label>Data podpisania</label><input type="date" name="signedDate" value="${today()}"><label>Wgraj zdjęcie umowy</label><input type="file" name="contractPhoto" accept="image/*,.pdf"><label>Notatka</label><textarea name="note"></textarea><button class="btn">Zapisz umowę</button></form>`);
  $("#contractForm").addEventListener("submit", async e => { e.preventDefault(); const uploaded=await preparePanelAttachments(e.target);if(!uploaded||!uploaded.contractPhoto?.length)return; const f=new FormData(e.target), c=state.clients.find(x=>x.id===f.get("clientId")); c.contracts ||= []; c.contracts.unshift({id:"u"+Date.now(), signedDate:f.get("signedDate"), contractPhoto:fileNames(e.target.elements.contractPhoto), _attachments:uploaded.contractPhoto, note:f.get("note")}); save(); closeModal(); activeClientId=c.id; activeClientTab="contracts"; showView("clientCard"); });
}
function regulationText(){
  return `REGULAMIN ŚWIADCZENIA USŁUG FRYZJERSKICH W SALONACH HELLO BEAUTY STUDIO PROWADZONYCH PRZEZ SANDRĘ KUK

§ 1 Postanowienia ogólne

Regulamin określa prawa i obowiązki osób korzystających z usług fryzjerskich, w tym usług przedłużania i zagęszczania włosów świadczonych w sieci Salonów Hello Beauty Studio prowadzonych przez Sandrę Kuk, prowadzącą działalność gospodarczą pod firmą "Hello Beauty Studio Sandra Kuk, NIP: 6252477673, REGON: 388819015

Użyte w Regulaminie terminy oznaczają odpowiednio:

Umowa – umowa wraz z załącznikami, na podstawie której Usługodawca świadczy na rzecz Klientów usługi fryzjerskie, w tym usługi z zakresu przedłużania i zagęszczania włosów. Regulamin stanowi integralną część Umowy,

Usługodawca – Sandra Kuk, prowadząca działalność gospodarczą pod firmą "Hello Beauty Studio Sandra Kuk",

Klient – osoba fizyczna, która ukończyła 18 lat i posiada pełną zdolność do czynności prawnych, lub osoba niepełnoletnia, która ukończyła 13 lat i nie jest całkowicie ubezwłasnowolniona, korzystająca z usług świadczonych w Salonach Hello Beauty Studio za pisemną zgodą przedstawiciela ustawowego,

Salon Hello Beauty Studio – oznacza salon fryzjerski Hello Beauty Studio prowadzony przez Usługodawcę w ramach sieci salonów Hello Beauty Studio, których adresy dostępne są na Stronie internetowej,

W celu realizacji uprawnień określonych w Regulaminie Klient może skontaktować się z Usługodawcą za pośrednictwem poczty tradycyjnej na adres: ul. Jana III Ul.Pułaskiego 1E , 42-580 Wojkowice, za pośrednictwem poczty elektronicznej na adres e-mail: hellobeautystudioo@gmail.com, bądź telefonicznie pod numerem telefonu: 573312722

W Salonie Hello Beauty Studio świadczone są usługi fryzjerskie, obejmujące w szczególności zabiegi przedłużania i zagęszczania włosów, zabiegi pielęgnacyjne włosów, wykonywanie koloryzacji i stylizacji włosów. Szczegółowa oferta usług fryzjerskich świadczonych w salonie Salonach Hello Beauty Studio dostępna jest na Stronie internetowej.

Regulamin udostępniany jest Klientom nieodpłatnie za pośrednictwem Strony internetowej w formie umożliwiającej pobranie tego dokumentu, zapisanie go na nośniku i utrwalenie w dowolny sposób, w tym wydrukowanie. Regulamin udostępniany jest również Klientowi w Salonie Hello Beauty Studio przed wykonaniem usługi i zawarciem Umowy.

§ 2 Zasady świadczenia usług

Z usług Salonu Hello Beauty Studio mogą korzystać osoby pełnoletnie, posiadające pełną zdolność do czynności prawnych.

Osoby niepełnoletnie, które ukończyły 13 lat i nie są całkowicie ubezwłasnowolnione, mogą korzystać z usług świadczonych w Salonach Hello Beauty Studio za pisemną zgodą swoich przedstawicieli ustawowych. Wzór oświadczenia dostępny jest w Salonie Hello Beauty Studio oraz dodatkowo stanowi Załącznik nr 1 do niniejszego Regulaminu.

W przypadku braku pisemnej zgody przedstawiciela ustawowego, o której mowa w ust. 2 powyżej, Usługodawca uprawniony jest do odmowy zawarcia Umowy i wykonania usługi.

Wykonanie usługi w Salonie Hello Beauty Studio poprzedzone jest konsultacją obejmującą:

przedstawienie Klientowi Umowy wraz z załącznikami celem zapoznania się z jej treścią i warunkami wykonania usługi,

omówienie oczekiwań Klienta i możliwych do osiągnięcia rezultatów usługi,

wyjaśnienie techniki i sposobu wykonania usługi oraz czasu utrzymywania się osiągniętego rezultatu, a w przypadku usług przedłużania włosów – konieczności podciągania i uzupełniania przedłużonych pasm włosów,

omówienie przeciwwskazań do wykonania usługi, a w przypadku usługi przedłużania włosów – okoliczności uniemożliwiających wykonanie zabiegu przedłużania włosów oraz możliwych skutków ubocznych przedłużenia włosów, które mogą, lecz nie muszą wystąpić,

omówienie zasad postępowania po wykonaniu usługi, w tym zasad pielęgnacji i stylizacji (w szczególności włosów przedłużanych) niezbędnych dla uzyskania oczekiwanych efektów usługi.

Przed Przed przystąpieniem do wykonania usługi w Salonie Hello Beauty Studio, Klient dokonuje wyboru pasm włosów zamawianych indywidualnie na jego rzecz przez Usługodawcę, zgodnie z ustalonymi preferencjami co do koloru, długości, struktury, gramatury i rodzaju włosów.

Włosy nie są dostępne na stałe w Salonie, lecz zamawiane na podstawie wcześniejszych ustaleń z Klientem. Klient ma możliwość obejrzenia dostarczonych pasm przed ich technicznym przygotowaniem (przerabianiem). Po zatwierdzeniu pasm przez Klienta, a przed wykonaniem jakichkolwiek czynności technicznych, następuje ostateczna akceptacja wybranych włosów oraz zgoda na ich nieodwracalną modyfikację.

Po rozpoczęciu przerabiania włosów (cięcie, łączenia, koloryzacja itp.) zwrot pasm nie jest możliwy, a koszt ich zakupu staje się wiążącym elementem rozliczenia usługi. W związku z powyższym, Klient zobowiązany jest do ostatecznego potwierdzenia wyboru pasm przed ich technicznym przygotowaniem.

Szczegółowe informacje na temat przeciwwskazań do wykonania usługi, możliwych skutków ubocznych przedłużenia włosów (które mogą, lecz nie muszą wystąpić) oraz zasad postępowania po wykonaniu usługi – w tym zasad pielęgnacji i stylizacji włosów przedłużanych – stanowią załącznik do Umowy o wykonanie usługi przedłużania włosów i dostępne są na Stronie internetowej (niezależnie od przekazania Klientowi tych informacji przed wykonaniem usługi w Salonie Hello Beauty Studio).

Usługodawca, w ramach świadczonych usług przedłużania i zagęszczania włosów, oferuje możliwość skorzystania przez nowych Klientów z bezpłatnej konsultacji przed wykonaniem usługi przedłużania włosów oraz możliwość skorzystania przez Klienta Salonu Hello Beauty Studio z wizyty kontrolnej w Salonie Hello Beauty Studio.

Usługa bezpłatnej konsultacji dedykowana jest nowym Klientom korzystającym po raz pierwszy z usług Salonu Hello Beauty Studio i obejmuje przeprowadzenie nieodpłatnej konsultacji w celu wyjaśnienia techniki i sposobu wykonania usługi przedłużania i zagęszczania włosów, poinformowania o okresie utrzymywania się osiągniętego rezultatu, konieczności podciągania i uzupełniania przedłużonych pasm włosów, przekazania informacji o przeciwwskazaniach, skutkach ubocznych oraz zasadach pielęgnacji i stylizacji włosów. Do bezpłatnej konsultacji odpowiednie zastosowanie znajduje ust. 4 powyżej. Klient Salonu Hello Beauty Studio może skorzystać z usługi bezpłatnej konsultacji jeden raz. Do rezerwacji tej usługi odpowiednio stosuje się zasady opisane w § 3 poniżej.

W ramach wizyty kontrolnej Usługodawca oferuje Klientom, którzy uprzednio skorzystali z usług przedłużania lub zagęszczania włosów w Salonie Hello Beauty Studio, jednorazowe wsparcie i pomoc w przypadku pojawienia się wątpliwości co do zasad użytkowania pasm włosów, ich pielęgnacji i stylizacji, założenie pasm włosów, które spadły mimo stosowania się przez Klienta do zaleceń pielęgnacyjnych, oraz przełożenie pasm włosów, które powodują dyskomfort.

Z bezpłatnej wizyty kontrolnej można skorzystać w terminie do 14 dni kalendarzowych od dnia wykonania usługi. Po upływie tego terminu korekty i uzupełnienia pasm wykonywane są odpłatnie zgodnie z obowiązującym cennikiem. Do rezerwacji wizyt kontrolnych odpowiednio stosuje się zasady opisane w § 3 powyżej.

Klient korzystający z usług Salonu Hello Beauty Studio zobowiązany jest do:

zapoznania się z treścią Regulaminu i stosowania się do jego postanowień oraz do instrukcji Usługodawcy i pracowników Salonu Hello Beauty Studio,

rezerwacji wizyt w Salonie Hello Beauty Studio zgodnie z zasadami opisanymi w § 3 Regulaminu,

poinformowania Usługodawcy o istnieniu przeciwwskazań do wykonania usługi oraz innych okolicznościach związanych ze stanem zdrowia Klienta, kondycją włosów naturalnych i stanem skóry głowy, które uniemożliwiają wykonanie usługi lub mogą mieć wpływ na jej rezultat,

przestrzegania przyjętych zasad współżycia społecznego, norm dobrego zachowania i okazywania szacunku w stosunku do innych osób przebywających na terenie Salonu Hello Beauty Studio, w szczególności poprzez niezakłócanie innym osobom możliwości korzystania z usług Salonu Hello Beauty Studio.

Na terenie Salonu Hello Beauty Studio obowiązuje bezwzględny zakaz:

palenia tytoniu lub używania e-papierosów,

posiadania i spożywania alkoholu oraz środków odurzających i narkotyków

przychodzenia na wizyty w stanie nietrzeźwości, w stanie odurzenia lub pod wpływem narkotyków,

rejestrowania obrazu i dźwięku bez uprzedniej zgody Usługodawcy.

Klient zobowiązany jest do terminowego przybycia na zarezerwowaną wizytę. W przypadku spóźnienia powyżej 45 minut Usługodawca uprawniony jest do odmowy wykonania usługi. Takie spóźnienie traktowane będzie jak nieodwołanie wizyty w terminie, o którym mowa w § 3 ust. 8, z konsekwencjami wskazanymi w § 3 ust. 11.

Usługodawca po uzyskaniu uprzedniej zgody Klienta może utrwalać – za pomocą urządzeń rejestrujących obraz i dźwięk – proces wykonywania usługi oraz stan włosów Klientki przed wykonaniem usługi i po jej wykonaniu, na zasadach ustalonych przez Strony w odrębnym dokumencie.

§ 3 Rezerwacje wizyt

W Salonach Hello Beauty Studio obowiązuje rezerwacja wizyt. Klient może dokonać rezerwacji wizyty w Salonie Hello Beauty Studio w następujący sposób:

osobiście w wybranym Salonie Hello Beauty Studio,

telefonicznie pod numerem telefonu: 573312722

drogą elektroniczną na adres e-mail: hellobeautystudioo@gmail.com

drogą elektroniczną poprzez formularz kontaktowy dostępny na Stronie internetowej,

drogą elektroniczną poprzez wysłanie wiadomości prywatnej za pośrednictwem profilu Usługodawcy na portalu społecznościowym Facebook lub Instagram pod nazwą "Hello Beauty Studio".

Klient dokonując rezerwacji wizyty zobowiązany jest podać swoje imię i nazwisko oraz aktualny numer telefonu. Podanie niekompletnych lub nieprawdziwych danych może skutkować anulowaniem wizyty. W przypadku rezerwacji wizyt drogą elektroniczną Usługodawca, w odpowiedzi na przesłaną wiadomość, poinformuje Klienta o dostępnych terminach wizyt.

Usługodawca, od Klientów korzystających po raz pierwszy z usług Salonu Hello Beauty Studio lub w innych uzasadnionych przypadkach (np. przy rezerwacji usług wymagających dłuższego czasu realizacji), może pobierać zadatek na poczet wykonania usługi.

Wysokość zadatku wynosi odpowiednio:

150 zł – w przypadku rezerwacji wizyty na korektę przedłużania włosów,

60% całkowitej wartości usługi – w przypadku nowego założenia pasm (pierwszorazowa aplikacja włosów).

Informacja o konieczności wpłaty zadatku oraz jego wysokości jest przekazywana Klientowi przed dokonaniem rezerwacji. Zadatek jest zaliczany na poczet wynagrodzenia za usługę i podlega warunkom określonym w dalszych punktach Regulaminu (w szczególności dotyczących odwołania lub niepojawienia się na wizycie).

Zadatek może być wpłacony w formie gotówkowej lub bezgotówkowej w Salonie Hello Beauty Studio, w którym usługa ma zostać wykonana. W przypadku wyboru płatności w formie bezgotówkowej, płatność realizowana jest w formie przelewu natychmiastowego lub z wykorzystaniem systemu płatności mobilnych pod znakiem usługowym „BLIK”.

W przypadku rezerwacji dokonywanych telefonicznie lub drogą elektroniczną płatności z tytułu zadatku dokonywane są w formie przelewu na rachunek bankowy Usługodawcy.

Usługodawca poinformuje Klienta o właściwym do uiszczenia zadatku numerze rachunku bankowego drogą elektroniczną na adres e-mail wskazany przez Klienta lub poprzez wiadomość SMS wysłaną na numer telefonu wskazany przez Klienta – w zależności od ustaleń Stron. W takim przypadku zadatek powinien być wpłacony w terminie do 2 dni roboczych od dokonania rezerwacji. Przy dokonywaniu płatności przelewem, w szczegółach przelewu Klient zobowiązany jest umieścić: imię i nazwisko, termin planowanej wizyty oraz dopisek "zadatek". W przypadku skorzystania z formularza dostępnego na Stronie internetowej umożliwiającego zapłatę zadatku, odpowiednie zastosowanie znajdują postanowienia Regulaminu sklepu internetowego Hello Beauty Studio dostępnego na Stronie internetowej.

W przypadku braku wpłaty zadatku zgodnie z postanowieniami niniejszego paragrafu Usługodawca uprawniony jest do anulowania zarezerwowanej przez Klienta wizyty.

Klient może dokonać zmiany terminu lub bezpłatnie odwołać zarezerwowaną wizytę nie później niż na 48 godzin przed planowanym terminem wizyty.

W przypadku odwołania wizyty w tym terminie, Usługodawca dokona zwrotu uiszczonego zadatku przy użyciu takiego samego sposobu zapłaty, jakiego użył Klient, chyba że Klient wyraźnie zgodzi się na inny sposób zwrotu, który nie wiąże się dla niego z dodatkowymi kosztami.

Odwołanie wizyty w czasie krótszym niż 48 godzin lub niepojawienie się na wizycie bez uprzedzenia skutkuje utratą zadatku, który przechodzi na rzecz Usługodawcy jako rekompensata za zablokowany czas pracy.

Usługodawca zastrzega możliwość potwierdzenia zarezerwowanej wizyty poprzez kontakt telefoniczny bądź poprzez wiadomość SMS wysłaną na numer wskazany przez Klienta podczas rezerwacji, w dniu poprzedzającym termin wizyty. W przypadku braku potwierdzenia obecności na umówionej wizycie Usługodawca uprawniony jest do anulowania zarezerwowanej wizyty.

W przypadku wykonania Umowy zadatek, o którym mowa w ust. 3, zostanie zaliczony na poczet należnego Usługodawcy wynagrodzenia za wykonanie usługi zgodnie z zawartą Umową.

Usługodawca uprawniony jest do zatrzymania zadatku, o którym mowa w ust. 3, w przypadku:

niepojawienia się Klienta na zaplanowanej wizycie bez uprzedniego poinformowania Usługodawcy w terminie nie późniejszym niż 24 godziny przed zarezerwowaną wizytą w Salonie Hello Beauty Studio,

odwołania zaplanowanej wizyty na krócej niż 24 godziny przed jej ustalonym terminem,

niewykonania usługi z przyczyn obciążających Klienta (np. spóźnienia na zaplanowaną wizytę powyżej 45 min).

§ 4 Cennik. Płatności

Wysokość opłat za korzystanie z usług świadczonych w Salonach Hello Beauty Studio określa cennik, który stanowi Załącznik nr 2 do niniejszego Regulaminu. Cennik dostępny jest w każdym z Salonów Hello Beauty Studio oraz na Stronie internetowej.

Usługodawca może wprowadzać okresowe promocje, bony podarunkowe, a także udzielać Klientom rabatów. Promocje i rabaty nie łączą się. Informacje o zasadach oraz okresach obowiązywania tych akcji promocyjnych zostaną uregulowane w odrębnym regulaminie.

W Salonie Hello Beauty Studio możliwe są następujące sposoby regulowania płatności za usługi:

w formie gotówkowej w Salonie Hello Beauty Studio,

w formie bezgotówkowej,

w formie bezgotówkowej z wykorzystaniem systemu ratalnego " Mediraty -LM PAY ".

W przypadku wyboru płatności w formie bezgotówkowej, płatność realizowana jest w formie przelewu natychmiastowego lub z wykorzystaniem systemu płatności mobilnych pod znakiem usługowym „BLIK”. Przy dokonywaniu płatności przelewem Klient zobowiązany jest umieścić w tytule przelewu: imię i nazwisko oraz datę wykonania usługi.

W przypadku płatności z wykorzystaniem systemu ratalnego "raty PayU", Usługodawca przystąpi do realizacji usługi po uznaniu rachunku bankowego Usługodawcy środkami pieniężnymi pochodzącymi z udzielonego Klientowi kredytu w wysokości odpowiadającej kwocie opłat za wybraną usługę. W przypadku skorzystania z płatności za pomocą systemu "raty PayU", odpowiednie zastosowanie znajdują postanowienia Regulaminu usługi "raty PayU" dostępnego na Stronie internetowej. Usługodawca informuje, iż zgodnie z ww. Regulaminem usługi "raty PayU", w przypadku odstąpienia od umowy kredytu ratalnego Klient zobowiązany jest do uiszczenia opłaty za prowizję w wysokości 5% kwoty przyznanego kredytu ratalnego.

§ 5 Reklamacje

(Z uwagi na charakter usług świadczonych przez Wykonawcę, Klient powinien zgłosić reklamację niezwłocznie po stwierdzeniu nieprawidłowości uzasadniających jej złożenie.)

Wykonawca odpowiada za niewykonywanie lub nienależyte wykonywanie usług świadczonych w Salonach Hello Beauty Studio zgodnie z powszechnie obowiązującymi przepisami prawa.

Wszelkie reklamacje odnośnie usług świadczonych w Salonach Hello Beauty Studio mogą być zgłaszane przez Klienta:\

w formie pisemnej – poprzez pozostawienie pisma w Salonie Hello Beauty Studio, w którym usługa została zrealizowana,

listownie (przesyłką poleconą) – na adres Salonu Hello Beauty Studio, w którym usługa została zrealizowana,

listownie (przesyłką poleconą) – na następujący adres: ul. Jana III Ul.Pułaskiego 1E , 42-580,

za pośrednictwem poczty elektronicznej – na adres e-mail: XXXXXX.

Zgłoszenie reklamacyjne Klienta powinno zawierać imię i nazwisko, opis sprawy (wraz ze zdjęciami obrazującymi stan włosów), ewentualne żądania Klienta oraz dane kontaktowe Klienta, na które Usługodawca powinien wysłać odpowiedź.

Usługodawca zastrzega, iż w celu rzetelnego odniesienia się do zgłoszenia reklamacyjnego Klient może zostać poproszony o przybycie do Salonu Hello Beauty Studio celem przeprowadzenia oględzin stanu pasm włosów Klienta i zweryfikowania przyczyn zgłaszanych nieprawidłowości.

Odpowiedź na zgłoszenie reklamacyjne zostanie udzielona w formie pisemnej na wskazany adres do korespondencji lub drogą elektroniczną na wskazany adres e-mail w terminie 14 dni od dnia otrzymania reklamacji.

Po zakończeniu procedury reklamacyjnej Klient może skorzystać z następujących pozasądowych sposobów rozpatrywania reklamacji i dochodzenia roszczeń:

zwrócić się do wojewódzkiego inspektora Inspekcji Handlowej z wnioskiem o wszczęcie postępowania w sprawie pozasądowego rozwiązania sporu,

skierować sprawę do stałego sądu polubownego przy właściwym miejscowo wojewódzkim inspektorze Inspekcji Handlowej,

zwrócić się do miejskiego lub powiatowego rzecznika konsumentów lub organizacji społecznej, do której zadań statutowych należy ochrona konsumentów (m.in. Federacji Konsumentów).

Dodatkowe informacje dotyczące możliwości skorzystania przez Klienta będącego Konsumentem z pozasądowych sposobów rozpatrywania reklamacji i dochodzenia roszczeń dostępne są na stronie internetowej Urzędu Ochrony Konkurencji i Konsumentów pod adresem: https://www.polubowne.uokik.gov.pl/. Ponadto pod adresem: http://ec.europa.eu/consumers/odr dostępna jest platforma internetowego systemu rozstrzygania sporów między konsumentami i przedsiębiorcami na szczeblu unijnym (platforma ODR). Platforma ODR jest interaktywną stroną internetową, za pośrednictwem której konsument może złożyć swoją skargę dotyczącą zobowiązań umownych wynikających z internetowej umowy sprzedaży lub umowy o świadczenie usług zawieranych między konsumentami mieszkającymi w Unii a przedsiębiorcami mającymi siedzibę w Unii.

Skorzystanie z powyższych sposobów rozpatrywania reklamacji i dochodzenia roszczeń jest dobrowolne, co oznacza, że obie strony muszą wyrazić zgodę na taki tryb postępowania.

§ 6 Dane osobowe

Administratorem danych osobowych Klientów jest Sandra Kuk, prowadząca działalność gospodarczą pod firmą "Hello Beauty Studio Sandra Kuk" pod adresem: ul. Jana III Sobieskiego 66, 42-580 Wojkowice, NIP: 6252477673, REGON: 388819015. (dalej jako: "Administrator")

Dane osobowe będą przetwarzane przez Administratora w następujących celach:

zawarcia i wykonania Umowy – podstawa prawna: art. 6 ust. 1 lit. b rozporządzenia Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. w sprawie ochrony osób fizycznych w związku z przetwarzaniem danych osobowych i w sprawie swobodnego przepływu takich danych oraz uchylenia dyrektywy 95/46/WE ("RODO"). Przetwarzanie jest niezbędne do wykonania Umowy lub podjęcia działań na wniosek osoby, której dane dotyczą, przed zawarciem Umowy. Okres przetwarzania: dane osobowe będą przetwarzane przez okres niezbędny do zawarcia i zrealizowania Umowy;

prowadzenia komunikacji z Klientem w sprawach związanych z realizacją Umowy oraz w sprawach związanych z dokonaniem przez Klienta rezerwacji wizyty w Salonie Hello Beauty Studio, potwierdzeniem zarezerwowanej przez Klienta wizyty w Salonie Hello Beauty Studio, rozpatrywaniem reklamacji – podstawa prawna: art. 6 ust. 1 lit. f RODO. Przetwarzanie jest niezbędne do celów wynikających z prawnie uzasadnionych interesów realizowanych przez Administratora dotyczących dążenia do zapewnienia najwyższej jakości usług, prowadzenia rezerwacji wizyt oraz potwierdzania zaplanowanych wizyt w Salonach Hello Beauty Studio, prowadzenia komunikacji i rozwiązywania spraw, których dotyczy kierowana do Administratora korespondencja, oraz rozpatrywania kierowanych do Administratora reklamacji. Okres przetwarzania: dane osobowe będą przetwarzane przez okres do zakończenia obsługi takich spraw, chyba że w określonym przypadku niezbędne będzie ich przechowywanie przez okres do przedawnienia roszczeń;

zapewnienia bezpieczeństwa osób i mienia, a także zachowania porządku na terenie Salonu Hello Beauty Studio – podstawa prawna: art. 6 ust. 1 lit. f RODO. Przetwarzanie jest niezbędne do celów wynikających z prawnie uzasadnionych interesów realizowanych przez Administratora dotyczących konieczności zapewnienia porządku i bezpieczeństwa osób i mienia oraz ewentualnie w celu obrony przed roszczeniami kierowanymi wobec Administratora lub ustalenia i dochodzenia roszczeń przez Administratora. Okres przetwarzania: dane przetwarzane są przez okres niezbędny dla realizacji takiego celu; przy czym dane przetwarzane w związku z monitoringiem wizyjnym, jeżeli jest stosowany, będą przetwarzane przez okres 3 miesięcy od dnia utrwalenia, a następnie zostaną trwale usunięte; z zastrzeżeniem, iż w przypadku gdy nagrania obrazu stanowią dowód w postępowaniu lub Administrator powziął wiadomość, że mogą one stanowić dowód w postępowaniu – wówczas termin ulega przedłużeniu do czasu prawomocnego zakończenia tego postępowania lub przedawnienia roszczeń;

spełnienia obowiązków prawnych spoczywających na Administratorze, w tym dokumentowania realizacji usług dla celów podatkowych, wykonywania obowiązków statystycznych, prowadzenia dokumentacji księgowo-podatkowej – podstawa prawna: art. 6 ust. 1 lit. c RODO. Przetwarzanie jest niezbędne do wypełnienia obowiązków prawnych ciążących na Administratorze. Okres przetwarzania: dane osobowe będą przetwarzane przez okres wymagany przepisami prawa;

dochodzenia roszczeń i obrony przed roszczeniami – podstawa prawna: art. 6 ust. 1 lit. f RODO. Przetwarzanie jest niezbędne do celów wynikających z prawnie uzasadnionych interesów realizowanych przez Administratora dotyczących dążenia do ochrony prawnej. Okres przetwarzania: okres przedawnienia roszczeń.

Podanie danych identyfikujących Klienta jest konieczne do zawarcia i wykonania Umowy. W razie odmowy podania tych danych Umowa nie będzie mogła zostać zawarta ani realizowana.

Do danych osobowych Klienta mają bezpośredni dostęp jedynie uprawnieni pracownicy Administratora oraz podmioty współpracujące z Administratorem, z którymi zawarto odpowiednie umowy. Dotyczy to firm świadczących usługi dla Administratora, np. firm zapewniających wsparcie IT oraz dostarczających oprogramowanie lub usługi informatyczne, firm świadczących obsługę księgową lub prawną, firm świadczących usługi pocztowe i kurierskie.

Administrator nie przekazuje danych Klienta poza Europejski Obszar Gospodarczy (obejmujący Unię Europejską, Norwegię, Liechtenstein i Islandię).

Klientowi przysługują następujące uprawnienia związane z przetwarzaniem danych:

prawo dostępu do swoich danych,

prawo do sprostowania swoich danych,

prawo żądania usunięcia danych,

prawo żądania ograniczenia przetwarzania danych,

prawo do przenoszenia danych.

Klient ma prawo wnieść skargę do organu nadzorczego – Prezesa Urzędu Ochrony Danych Osobowych (adres: ul. Stawki 2, 00-193 Warszawa).

Dane osobowe Klienta nie podlegają profilowaniu ani podejmowaniu decyzji w sposób zautomatyzowany (tj. bez udziału człowieka).

§ 7 Postanowienia końcowe

Usługodawca informuje, że na terenie Salonu Hello Beauty Studio może być zainstalowany monitoring wizyjny, przy czym strefy objęte monitoringiem są odpowiednio oznakowane. Dane pochodzące z monitoringu są przetwarzane w celach i na zasadach opisanych w § 6 powyżej.

Pozostawienie przez Klienta rzeczy w Salonie Hello Beauty Studio nie powoduje zawarcia umowy przechowania ani żadnej innej umowy zobowiązującej Usługodawcę do sprawowania pieczy nad tymi rzeczami.

Usługodawca zastrzega sobie prawo do dokonywania zmian w niniejszym Regulaminie, z zastrzeżeniem, że do Klientów, którzy dokonali rezerwacji wizyty w Salonie Hello Beauty Studio lub zawarli Umowę przed dniem wprowadzenia takich zmian, zastosowanie znajduje Regulamin w brzmieniu obowiązującym w dacie dokonania rezerwacji wizyty lub zawarcia Umowy.

O zmianie Regulaminu Usługodawca poinformuje Klientów poprzez zamieszczenie zmienionej treści Regulaminu na Stronie internetowej oraz poprzez udostępnienie Regulaminu w Salonie Hello Beauty Studio.

Zmiany postanowień Regulaminu mogą zostać wprowadzone wyłącznie z ważnych przyczyn, tj. w sytuacji:

zmiany danych Usługodawcy (np. danych adresowych, adresu Strony internetowej, adresu poczty elektronicznej, numeru telefonu),

zmiany zasad korzystania z usług świadczonych w Salonach Hello Beauty Studio, w tym zmiany cennika,

zmiany systemów informatycznych lub rozwiązań technicznych lub technologicznych wykorzystywanych przez Usługodawcę, w szczególności dotyczących mechanizmów płatności, do których mają zastosowanie postanowienia Regulaminu,

zmiany powszechnie obowiązujących przepisów prawa lub gdy potrzeba zmiany wynika z prawomocnej decyzji administracyjnej, prawomocnego wyroku sądu, a także z wytycznych, nakazów, zaleceń, interpretacji bądź rekomendacji uprawnionych organów (w tym Urzędu Ochrony Konkurencji i Konsumentów), konieczności wprowadzenia zmian o charakterze redakcyjnym lub porządkowym.

Jeżeli którekolwiek z postanowień niniejszego Regulaminu okaże się nieważne lub bezskuteczne prawnie, nie wpływa to na ważność i skuteczność pozostałych postanowień Regulaminu.

Regulamin wchodzi w życie z dniem _____`;
}
function contractText(client, visit){
  return `UMOWA NA WYKONANIE USLUGI PRZEDLUZANIA / ZAGESZCZANIA WLOSOW

Zawarta w dniu ${visit.date || today()} w miejscowości Wojkowice pomiędzy:

Hello Beauty Studio Sandra Kuk, z siedzibą przy ul. ul. Jana III Ul.Pułaskiego 1E , 42-580 Wojkowice, NIP: 6252477673, REGON: 388819015 zwanym dalej "Wykonawcą"

a Panem/Panią ${client.name || "________________________"} zamieszkałym/ą przy ${client.address || "____________________________"}, numer telefonu: ${client.phone || "________________"}, zwanym dalej "Klientem"

§ 1. Przedmiot Umowy

Wykonawca zobowiązuje się do wykonania na rzecz Klienta usługi fryzjerskiej polegającej na przedłużaniu lub zagęszczaniu włosów, przy użyciu metody, rodzaju pasm, ich koloru, długości i gramatury uzgodnionych z Klientem przed rozpoczęciem zabiegu.

W ramach wykonania usługi Wykonawca może również dokonać dodatkowych zabiegów uzupełniających, takich jak strzyżenie końcówek, stylizacja końcowa lub inne czynności niezbędne do zapewnienia estetycznego efektu końcowego.

Klient oświadcza, że przed podpisaniem niniejszej umowy został w sposób zrozumiały i wyczerpujący poinformowany o:

zakresie i charakterze planowanej usługi oraz przewidywanym czasie jej trwania,

spodziewanych efektach zabiegu i ich subiektywnym charakterze,

konieczności przestrzegania zasad pielęgnacji włosów przedłużanych lub zagęszczanych,

ryzykach związanych z wykonaniem zabiegu, w tym możliwych skutkach ubocznych (np. wypadanie włosów, dyskomfort skóry głowy, reakcje alergiczne),

przeciwwskazaniach do wykonania zabiegu, w szczególności związanych ze stanem skóry głowy, ogólnym stanem zdrowia oraz historią zabiegów chemicznych lub koloryzacji.

Klient przyjmuje do wiadomości, że nie ma gwarancji trwałości ani identycznego efektu zabiegu u każdej osoby, a końcowy rezultat zależy od indywidualnych uwarunkowań, takich jak kondycja włosów naturalnych, struktura skóry głowy oraz sposób codziennej pielęgnacji i stylizacji.

§ 2. Oświadczenia Klienta

Klient oświadcza, że nie posiada żadnych przeciwwskazań zdrowotnych do wykonania zabiegu.

Klient został poinformowany o konieczności stosowania się do zaleceń pielęgnacyjnych przekazanych przez Wykonawcę.

Klient akceptuje, że indywidualnie dobrane pasma włosów (długość, gramatura, kolor, rodzaj) nie podlegają zwrotowi ani wymianie, o ile zostały przygotowane zgodnie z wcześniejszymi ustaleniami.

Klient przyjmuje do wiadomości, że efekt końcowy zabiegu jest subiektywny i uzależniony m.in. od kondycji włosów, stylizacji oraz pielęgnacji po zabiegu.

Klientka oświadcza, że po zakończeniu usługi miała możliwość dokładnego sprawdzenia efektu końcowego, w tym koloru włosów, długości, gęstości, wielkości oraz rozmieszczenia łączeń, a także wykonanego strzyżenia i stylizacji. Klientka potwierdza, że nie zgłasza zastrzeżeń do widocznego efektu usługi w dniu jej wykonania.

Reklamacje dotyczące cech możliwych do oceny bezpośrednio po zakończeniu usługi, takich jak kolor, długość, gęstość, wielkość lub rozmieszczenie łączeń, sposób strzyżenia oraz efekt wizualny, nie będą uwzględniane po opuszczeniu salonu, jeżeli nie zostały zgłoszone w dniu wykonania usługi.

§ 3. Cena i Płatności

Cena usługi ustalana jest na podstawie aktualnego cennika dostępnego w salonie lub na stronie internetowej Wykonawcy i obejmuje koszt pasm włosów oraz wykonania usługi.

W przypadku usług dodatkowych (np. strzyżenie, tonowanie, koloryzacja), opłata również ustalana jest na podstawie obowiązującego cennika.

Klient zobowiązuje się do zapłaty zaliczki/zadatku w wysokości ${visit.deposit || depositAmount(visit.price)}. W przypadku rezygnacji z usługi mniej niż 24 godziny przed ustalonym terminem, zadatek nie podlega zwrotowi.

§ 4. Odpowiedzialność i Reklamacje

Wykonawca nie ponosi odpowiedzialności za uszkodzenia lub skutki estetyczne powstałe wskutek niewłaściwej pielęgnacji, samodzielnych modyfikacji lub użycia niewłaściwych kosmetyków przez Klienta.

Reklamacje dotyczące usługi muszą być zgłoszone niezwłocznie, najpóźniej w ciągu 3 dni roboczych od jej wykonania, z dołączoną dokumentacją zdjęciową.

Włosy koloryzowane lub poddane zabiegom chemicznym nie podlegają reklamacji ani zwrotowi.

§ 5. Postanowienia końcowe

Wszelkie zmiany niniejszej umowy wymagają formy pisemnej pod rygorem nieważności.

Sądem właściwym do rozpatrywania sporów wynikających z niniejszej umowy jest sąd właściwy miejscowo dla siedziby Wykonawcy.

Umowa zostaje sporządzona w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze stron.

Integralną część niniejszej umowy stanowi Załącznik nr 1 – Zgoda na wykonanie i publikację zdjęć w celach marketingowych, podpisywany przez Klienta dobrowolnie.

.............................................                                          .............................................

Podpis Klienta                                                     Podpis Wykonawcy

USTALENIA INDYWIDUALNE DO USŁUGI
Metoda: ${visit.method || client.method || "________________"}
Rodzaj włosów: ${visit.hairKind || "________________"}
Długość: ${visit.length || client.length || "________________"}
Gramatura: ${visit.grams || client.grams || "________________"}
Kolor: ${visit.color || client.color || "________________"}
Cena końcowa: ${visit.price || "________________"}
Zadatek 60%: ${visit.deposit || depositAmount(visit.price)}
Uwagi stylistki: ${visit.note || "Brak dodatkowych uwag."}`;
}
function contractCardHtml(client, visit){
  const fields = [
    ["Data zawarcia", visit.date || today()],
    ["Miejscowość", "Wojkowice"],
    ["Klientka", client.name || ""],
    ["Adres", client.address || ""],
    ["Telefon", client.phone || ""],
    ["Wykonawca", "Hello Beauty Studio Sandra Kuk"],
    ["NIP / REGON", "6252477673 / 388819015"],
    ["Metoda", visit.method || client.method || ""],
    ["Rodzaj włosów", visit.hairKind || ""],
    ["Długość", visit.length || client.length || ""],
    ["Gramatura", visit.grams || client.grams || ""],
    ["Kolor", visit.color || client.color || ""],
    ["Cena końcowa", visit.price || ""],
    ["Zadatek 60%", visit.deposit || depositAmount(visit.price)],
    ["Uwagi stylistki", visit.note || "Brak dodatkowych uwag."]
  ];
  return `<div class="online-contract">
    <div class="contract-cover">
      <small>Umowa online do podpisu</small>
      <h3>Przedłużanie / zagęszczanie włosów</h3>
    </div>
    <div class="contract-section">
      <h4>Dane umowy</h4>
      <div class="contract-grid">
        ${fields.map(([labelText,value]) => `<div class="contract-field"><span>${esc(labelText)}</span><b>${esc(value || "Do uzupełnienia")}</b></div>`).join("")}
      </div>
    </div>
    <div class="contract-section">
      <h4>Zakres usługi</h4>
      <div class="contract-clauses">
        <p>Wykonawca zobowiązuje się do wykonania usługi fryzjerskiej polegającej na przedłużaniu lub zagęszczaniu włosów przy użyciu metody, rodzaju pasm, koloru, długości i gramatury uzgodnionych z Klientką przed rozpoczęciem zabiegu.</p>
        <p>W ramach usługi mogą zostać wykonane czynności uzupełniające niezbędne do uzyskania estetycznego efektu końcowego, zgodnie z ustaleniami stylistki i Klientki.</p>
      </div>
    </div>
    <div class="contract-section">
      <h4>Oświadczenia klientki</h4>
      <div class="contract-clauses">
        <p>Klientka oświadcza, że została poinformowana o zakresie i charakterze usługi, przewidywanym czasie jej trwania, spodziewanym efekcie, zasadach pielęgnacji włosów przedłużanych lub zagęszczanych oraz o możliwych skutkach ubocznych.</p>
        <p>Klientka potwierdza, że nie zataja przeciwwskazań zdrowotnych, informacji o stanie skóry głowy, historii zabiegów chemicznych, nadmiernym wypadaniu włosów lub innych okoliczności mogących mieć wpływ na wykonanie usługi.</p>
        <p>Klientka przyjmuje do wiadomości, że efekt końcowy zależy od kondycji włosów naturalnych, sposobu pielęgnacji, stylizacji oraz terminowego wykonywania korekt.</p>
        <p>Klientka akceptuje, że indywidualnie dobrane pasma włosów, przygotowane zgodnie z ustaleniami dotyczącymi długości, gramatury, koloru i rodzaju, nie podlegają zwrotowi ani wymianie po ich przygotowaniu do usługi.</p>
        <p>Klientka oświadcza, że po zakończeniu usługi miała możliwość dokładnego sprawdzenia efektu końcowego, w tym koloru włosów, długości, gęstości, wielkości oraz rozmieszczenia łączeń, a także wykonanego strzyżenia i stylizacji. Klientka potwierdza, że nie zgłasza zastrzeżeń do widocznego efektu usługi w dniu jej wykonania.</p>
        <p>Reklamacje dotyczące cech możliwych do oceny bezpośrednio po zakończeniu usługi, takich jak kolor, długość, gęstość, wielkość lub rozmieszczenie łączeń, sposób strzyżenia oraz efekt wizualny, nie będą uwzględniane po opuszczeniu salonu, jeżeli nie zostały zgłoszone w dniu wykonania usługi.</p>
      </div>
    </div>
    <div class="contract-section">
      <h4>Płatność i reklamacje</h4>
      <div class="contract-clauses">
        <p>Cena usługi obejmuje koszt pasm włosów oraz wykonania usługi zgodnie z ustaleniami zapisanymi powyżej. Usługi dodatkowe rozliczane są według aktualnego cennika lub indywidualnych ustaleń.</p>
        <p>Wykonawca nie ponosi odpowiedzialności za uszkodzenia, pogorszenie efektu lub problemy z trwałością wynikające z niewłaściwej pielęgnacji, samodzielnej ingerencji w łączenia, użycia niewłaściwych kosmetyków lub zbyt późnego zgłoszenia się na korektę.</p>
        <p>Reklamacje powinny zostać zgłoszone niezwłocznie po zauważeniu nieprawidłowości wraz z dokumentacją zdjęciową. Salon może poprosić Klientkę o wizytę kontrolną w celu oceny stanu włosów.</p>
      </div>
    </div>
    <div class="contract-section">
      <h4>Podpisy</h4>
      <div class="contract-sign-row">
        <div class="contract-sign-box">Podpis klientki składany poniżej na tablecie</div>
        <div class="contract-sign-box"><div class="owner-signature">Sandra Kuk</div></div>
      </div>
    </div>
  </div>`;
}
function openTextDocument(title, text){
  const doc = window.open("", "_blank");
  if(!doc){
    alert("Przeglądarka zablokowała nowe okno. Otwórz dokument z poziomu panelu.");
    return;
  }
  doc.document.write(`<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><title>${esc(title)}</title><style>
    body{font-family:Arial,sans-serif;background:var(--panel);color:#2b2724;margin:0;padding:40px}
    main{max-width:900px;margin:auto;background:white;border:1px solid #eadfd7;border-radius:12px;padding:34px}
    h1{font-family:Georgia,serif;font-weight:400;font-size:42px;margin:0 0 24px}
    pre{font-family:Arial,sans-serif;font-size:15px;line-height:1.75;white-space:pre-wrap;margin:0}
    button{margin-bottom:24px;background:#b89278;color:white;border:0;border-radius:4px;padding:12px 18px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;cursor:pointer}
  </style></head><body><main><button onclick="window.print()">Drukuj / zapisz PDF</button><h1>${esc(title)}</h1><pre>${esc(text)}</pre></main></body></html>`);
  doc.document.close();
}
function openGeneratedContract(clientId, visitId){
  const c = state.clients.find(x => x.id === clientId);
  const visit = (c.visits || []).find(v => v.id === visitId) || {};
  const fullRegulation = regulationText();
  const fullContract = contractText(c, visit);
  modal(`<div class="modal-head"><h2>Regulamin i umowa</h2><button class="btn secondary" data-close-modal>Zamknij</button></div>
  <div class="legal-preview">
    <b>Regulamin do wglądu</b>
    <pre>${esc(fullRegulation)}</pre>
  </div>
  <button class="btn secondary" id="openFullRegulation">Otwórz pełny regulamin w nowym oknie</button>
  <label class="checks"><span><input type="checkbox" id="rulesAccepted"> Klientka przeczytała i akceptuje regulamin świadczenia usług</span></label>
  <div class="contract-preview">
    ${contractCardHtml(c, visit)}
  </div>
  <button class="btn secondary" id="openFullContract">Otwórz pełną umowę w nowym oknie</button>
  <label class="checks"><span><input type="checkbox" id="contractAccepted"> Klientka przeczytała umowę i potwierdza poprawność danych</span></label>
  <label>Podpis klientki na tablecie</label>
  <canvas class="signature-pad" id="signatureCanvas"></canvas>
  <div class="signature-actions">
    <button class="btn secondary" id="clearSignature">Wyczyść podpis</button>
    <button class="btn" id="saveGeneratedContract">Zapisz umowę</button>
  </div>`);
  setupSignaturePad();
  $("#openFullRegulation").onclick = () => openTextDocument("Regulamin Hello Beauty Studio", fullRegulation);
  $("#openFullContract").onclick = () => openTextDocument("Umowa przedłużania / zagęszczania włosów", fullContract);
  $("#clearSignature").onclick = () => clearSignature();
  $("#saveGeneratedContract").onclick = () => {
    if(!$("#rulesAccepted").checked){
      alert("Klientka musi zaakceptować regulamin.");
      return;
    }
    if(!$("#contractAccepted").checked){
      alert("Klientka musi zaakceptować umowę.");
      return;
    }
    const canvas = $("#signatureCanvas");
    c.contracts ||= [];
    c.contracts.unshift({
      id:"u"+Date.now(),
      signedDate:visit.date || today(),
      type:"Umowa nowe założenie",
      rulesAccepted:"Tak",
      client:c.name,
      address:c.address || "",
      phone:c.phone,
      method:visit.method || c.method,
      hairKind:visit.hairKind || "",
      grams:visit.grams || c.grams,
      length:visit.length || c.length,
      color:visit.color || c.color,
      price:visit.price || "",
      deposit:visit.deposit || depositAmount(visit.price),
      regulationText:fullRegulation,
      contractText:fullContract,
      signature:canvas.toDataURL("image/png"),
      note:"Umowa automatycznie wypełniona i podpisana na tablecie."
    });
    save(); closeModal(); activeClientId=c.id; activeClientTab="contracts"; showView("clientCard");
  };
}
let signatureCtx = null;
function setupSignaturePad(){
  const canvas = $("#signatureCanvas");
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  signatureCtx = canvas.getContext("2d");
  signatureCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  signatureCtx.lineWidth = 2;
  signatureCtx.lineCap = "round";
  signatureCtx.strokeStyle = "#2b2724";
  let drawing = false;
  const point = e => {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return {x:t.clientX-r.left, y:t.clientY-r.top};
  };
  const start = e => { drawing = true; const p = point(e); signatureCtx.beginPath(); signatureCtx.moveTo(p.x,p.y); e.preventDefault(); };
  const move = e => { if(!drawing) return; const p = point(e); signatureCtx.lineTo(p.x,p.y); signatureCtx.stroke(); e.preventDefault(); };
  const end = () => drawing = false;
  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, {passive:false});
  canvas.addEventListener("touchmove", move, {passive:false});
  canvas.addEventListener("touchend", end);
}
function clearSignature(){
  const canvas = $("#signatureCanvas");
  signatureCtx.clearRect(0,0,canvas.width,canvas.height);
}
function deleteClient(id){
  if(!canDelete()) return alert("Pracownica nie może usuwać klientek.");
  if(confirm("Usunąć klientkę?")){
    state.clients = state.clients.filter(c => c.id !== id);
    save(); showView("clients");
  }
}

function openTabletConsult(clientId){
  consult = { step:0, clientId:clientId || "", answers:{}, notes:[], clientInfo:[], addons:[] };
  if(consult.clientId) renderConsultStep();
  else renderConsultClientPicker();
  $("#modal").classList.add("show");
}
function renderConsultClientPicker(){
  $("#modalCard").classList.remove("tablet-card");
  $("#modalCard").innerHTML = `<div class="modal-head"><h2>Ankieta korekty</h2><button class="btn secondary" data-close-modal>Anuluj</button></div>
    <div class="card" style="box-shadow:none">
      <h3>Wybierz klientkę</h3>
      <p class="meta">Najpierw wybierz, do której karty ma zapisać się wynik ankiety.</p>
      <label>Szukaj po nazwisku lub telefonie</label>
      <input id="consultClientSearch" placeholder="Wpisz nazwisko albo numer telefonu">
      <label>Klientka</label>
      <select id="consultClientSelect" required>
        <option value="">Wybierz klientkę</option>
      </select>
      <div class="actions" style="margin-top:18px">
        <button class="btn" id="startCorrectionSurvey">Rozpocznij ankietę</button>
        <button class="btn secondary" data-action="new-client">Dodaj nową klientkę</button>
      </div>
    </div>`;
  bindActions($("#modalCard"));
  const renderClientSelect = () => {
    const term = $("#consultClientSearch").value.toLowerCase().trim();
    const selected = $("#consultClientSelect").value || activeClientId || "";
    const clients = state.clients.filter(client => {
      const haystack = `${client.name || ""} ${client.phone || ""}`.toLowerCase();
      return !term || haystack.includes(term);
    });
    $("#consultClientSelect").innerHTML = `<option value="">Wybierz klientkę</option>` + clients.map(client => `<option value="${client.id}" ${client.id===selected?"selected":""}>${esc(client.name)} · ${esc(client.phone || "")}</option>`).join("");
  };
  $("#consultClientSearch").addEventListener("input", renderClientSelect);
  renderClientSelect();
  $("#startCorrectionSurvey").addEventListener("click", () => {
    const selected = $("#consultClientSelect").value;
    if(!selected){
      alert("Wybierz klientkę.");
      return;
    }
    consult.clientId = selected;
    renderConsultStep();
  });
}
function methodDescription(name){
  return {
    Nano:"Najbardziej subtelne, drobne łączenia. Dobre przy wysokich upięciach i efekcie premium.",
    Mini:"Komfortowa metoda do wielu typów włosów. Często wybierana przy większej gramaturze.",
    Micro:"Dyskretne łączenia premium, dobre przy upięciach i naturalnym efekcie.",
    Standard:"Klasyczne większe łączenia, najczęściej przy większej ilości włosów."
  }[name] || "";
}
function methodClass(name){
  return name.toLowerCase();
}
function renderOptions(current){
  if(current.key === "method"){
    return `<div class="options method-options">${current.options.map(o => `
      <button class="option method-option ${consult.answers[current.key]===o?"selected":""}" data-answer="${esc(o)}">
        <div class="method-image ${methodClass(o)}"><span>${esc(o)}</span></div>
        <div class="method-copy"><b>${esc(o)}</b><small>${methodDescription(o)}</small></div>
      </button>
    `).join("")}</div>`;
  }
  return `<div class="options">${current.options.map(o => `<button class="option ${consult.answers[current.key]===o?"selected":""}" data-answer="${esc(o)}">${o}</button>`).join("")}</div>`;
}
function q(){
  return [
    {key:"method", title:"Które łączenia chciałabyś mieć założone?", options:["Micro","Nano","Mini","Standard"]},
    {key:"hairDensity", title:"Jaką masz gęstość włosów?", options:["Rzadkie","Średnie","Gęste"]},
    {key:"wear", title:"Jak najczęściej nosisz włosy?", options:["Wysoki kucyk","Niski kucyk","Nie spinam włosów"]},
    {key:"correction", title:"Czy coś działo się przy poprzedniej korekcie?", options:["Włosy ciągnęły","Włosy się wyczesywały","Spadały łączenia","Nic się nie działo"]},
    {key:"prevMethod", title:"Jakie miałaś poprzednio łączenia?", options:["Micro","Nano","Mini","Standard"], show:() => consult.answers.correction === "Włosy ciągnęły"},
    {key:"shampoo", title:"Jakiego szamponu używasz?", options:["Hyntegra","Hair Glow","Neboa","OnlyBio","Inny"], show:() => consult.answers.correction === "Włosy się wyczesywały" || true},
    {key:"scalp", title:"Czy masz problem ze skórą głowy?", options:["Przetłuszcza się","Swędzi / łupież","Słabo rosną włosy","Nic się nie dzieje"]},
    {key:"grams", title:"Ile gram włosów masz założonych?", options:["Do 50 g","Do 100 g","Do 150 g","Do 200 g"]},
    {key:"dry", title:"Czy Twoje włosy są suche / puszą się?", options:["Tak","Nie"]},
    {key:"wantsColor", title:"Czy podczas tej wizyty robimy też koloryzację?", options:["Tak","Nie"]},
    {key:"colorService", title:"Jaką koloryzację wykonujemy?", options:["Tonowanie","Koloryzacja odrostu","Refleksy / sombre / ombre","Dekoloryzacja","Air Touch","Inna"], show:() => consult.answers.wantsColor === "Tak"},
    {key:"invisible", title:"Jak ważna jest dla Ciebie niewidoczność łączeń?", options:["Bardzo ważna","Ważna","Nie ma większego znaczenia"]},
    {key:"priority", title:"Co jest dla Ciebie najważniejsze?", options:["Jak najmniej widoczne łączenia","Możliwość noszenia wysokich upięć","Jak najniższa cena korekty","Maksymalna trwałość"]}
  ].filter(item => !item.show || item.show());
}
function renderConsultStep(){
  const questions = q();
  const current = questions[consult.step] || null;
  if(!current){ renderClientRecommendation(); return; }
  const selectedClient = state.clients.find(c => c.id === consult.clientId);
  $("#modalCard").classList.add("tablet-card");
  $("#modalCard").innerHTML = `<div class="tablet question active">
    <div class="modal-head"><h2>Ankieta korekty</h2><button class="btn secondary" data-close-modal>Anuluj</button></div>
    <div class="tablet-note">Ten ekran możesz podać klientce. Widzi tylko pytania ankiety, bez historii wizyt, notatek i panelu salonu.</div>
    <div class="tablet-note"><b>Klientka:</b> ${esc(selectedClient?.name || "Nie wybrano")} <button class="btn secondary mini" id="changeConsultClient" type="button" style="margin-left:10px">Zmień</button></div>
    <p class="meta">Pytanie ${consult.step+1} z ${questions.length}</p>
    <h2>${current.title}</h2>
    ${renderOptions(current)}
    ${current.key==="dry" && consult.answers.dry==="Tak" ? `<div class="checks" style="margin-top:14px">${["Pielęgnacja naturalnych włosów +120 zł","Botoks +250 zł","Pielęgnacja włosów przedłużanych +80 zł"].map(a=>`<label><input type="checkbox" data-addon="${a}">${a}</label>`).join("")}</div>` : ""}
    <div class="actions" style="margin-top:20px">
      <button class="btn secondary" id="prevQ">Wstecz</button>
      <button class="btn" id="nextQ">Dalej</button>
    </div>
  </div>`;
  $all("[data-answer]").forEach(btn => btn.addEventListener("click", () => {
    consult.answers[current.key] = btn.dataset.answer;
    renderConsultStep();
  }));
  $("#changeConsultClient").onclick = () => renderConsultClientPicker();
  $("#prevQ").onclick = () => { consult.step = Math.max(0, consult.step-1); renderConsultStep(); };
  $("#nextQ").onclick = () => {
    if(current.key === "dry"){
      consult.addons = $all("[data-addon]:checked").map(x => x.dataset.addon);
    }
    consult.step += 1;
    renderConsultStep();
  };
}
function recommendationReason(result){
  const a = consult.answers;
  const reasons = [];
  if(a.wear === "Wysoki kucyk") reasons.push("zależy Ci na możliwości noszenia wysokich upięć");
  if(a.invisible === "Bardzo ważna") reasons.push("ważna jest dla Ciebie niewidoczność łączeń");
  if(a.priority) reasons.push(`najważniejsze dla Ciebie: ${a.priority.toLowerCase()}`);
  if(a.correction && a.correction !== "Nic się nie działo") reasons.push(`przy poprzedniej korekcie: ${a.correction.toLowerCase()}`);
  if(!reasons.length) reasons.push("ta metoda pasuje do Twoich odpowiedzi i wybranej gramatury");
  return reasons.join(", ") + ".";
}
function connectionSize(method){
  if(method.includes("Micro")) return "0,2-0,3 g";
  if(method.includes("Nano")) return "0,4-0,5 g";
  if(method.includes("Mini")) return "0,6-0,7 g";
  if(method.includes("Standard")) return "0,8-1 g";
  return "dobierana indywidualnie";
}
function renderClientRecommendation(){
  const result = analyzeConsult();
  const a = consult.answers;
  const hairTreatments = result.hairTreatments.length ? result.hairTreatments : ["Brak dodatkowej pielęgnacji włosów."];
  const scalpTreatments = result.scalpTreatments.length ? result.scalpTreatments : ["Brak zaleceń dla skóry głowy."];
  $("#modalCard").classList.add("tablet-card");
  $("#modalCard").innerHTML = `<div class="tablet">
    <div class="modal-head"><h2>Rekomendacja korekty</h2><button class="btn secondary" data-close-modal>Anuluj</button></div>
    <div class="client-result">
      <h3>Proponujemy: ${esc(result.method)}</h3>
      <div class="recommendation-layout">
        <div class="recommendation-box">
          <h4>Twój wybór</h4>
          <b>${esc(a.method || "Nie wybrano")}</b>
          <div class="recommendation-list">
            <span>Gramatura: ${esc(result.grams || "brak")}</span>
            <span>Gęstość włosów: ${esc(a.hairDensity || "brak")}</span>
            <span>Wielkość łączeń: ${esc(connectionSize(a.method || ""))}</span>
            <span>Cena wybranej opcji: ${result.selectedPrice} zł</span>
          </div>
        </div>
        <div class="recommendation-box">
          <h4>Nasza propozycja cenowa</h4>
          <b>${esc(result.method)}</b>
          <div class="recommendation-list">
            <span>Wielkość łączeń: ${esc(connectionSize(result.method))}</span>
            <span>Cena korekty: ${result.price} zł</span>
            <span>Łącznie z dodatkami: ${result.total} zł</span>
          </div>
          <p>Wybrałabym tę opcję, ponieważ ${esc(recommendationReason(result))}</p>
        </div>
      </div>
      <div class="treatment-box">
        <h4>Propozycje zabiegów</h4>
        <div class="treatment-grid">
          <div class="treatment-card">
            <h5>Pielęgnacja włosów</h5>
            <div class="treatment-list">${hairTreatments.map(item => `<div>${esc(item)}</div>`).join("")}</div>
          </div>
          <div class="treatment-card">
            <h5>Skóra głowy / zdrowie</h5>
            <div class="treatment-list">${scalpTreatments.map(item => `<div>${esc(item)}</div>`).join("")}</div>
          </div>
        </div>
      </div>
      ${result.clientInfo.length ? `<p><b>Warto wiedzieć:</b><br>${result.clientInfo.map(x=>esc(x)).join("<br>")}</p>` : ""}
      <p class="meta">Cena jest konkretna, bez „od” i bez „około”. Ostatecznie Sandra zatwierdzi konsultację przed zapisaniem jej do karty.</p>
      <div class="legal-preview">
        <b>Regulamin do wglądu</b>
        <pre>${esc(regulationText())}</pre>
      </div>
      <div class="checks">
        <label><input type="checkbox" id="acceptRules"> Akceptuję regulamin świadczenia usług Hello Beauty Studio</label>
        <label><input type="checkbox" id="acceptMethod"> Akceptuję zaproponowaną metodę</label>
        <label><input type="checkbox" id="acceptPrice"> Akceptuję cenę</label>
      </div>
    </div>
    <div class="actions" style="margin-top:20px">
      <button class="btn secondary" id="backToAnswers">Wróć do pytań</button>
      <button class="btn" id="showSandraSummary">Pokaż Sandrze podsumowanie</button>
    </div>
  </div>`;
  $("#backToAnswers").onclick = () => { consult.step = Math.max(0, q().length - 2); renderConsultStep(); };
  $("#showSandraSummary").onclick = () => {
    if(!$("#acceptRules").checked){
      alert("Klientka musi zaakceptować regulamin.");
      return;
    }
    consult.answers.acceptRules = "Tak";
    consult.answers.acceptMethod = $("#acceptMethod").checked ? "Tak" : "Nie";
    consult.answers.acceptPrice = $("#acceptPrice").checked ? "Tak" : "Nie";
    renderConsultSummary();
  };
}
function analyzeConsult(){
  const a = consult.answers;
  const notes = [];
  const clientInfo = [];
  const scalpTreatments = [];
  const hairTreatments = [];
  const treatments = [];
  let method = a.method || "Nano";
  const selectedMethod = method;
  if(a.hairDensity === "Rzadkie" && ["Mini","Standard"].includes(method)){
    method = "Nano";
    clientInfo.push("Przy rzadkich włosach nie rekomendujemy Mini ani Standard. Lepsze będą drobniejsze łączenia Nano lub Micro.");
    notes.push("Gęstość: rzadkie. Nie proponować Mini ani Standard.");
  }
  if(a.hairDensity === "Gęste" && method === "Micro"){
    method = "Mini";
    clientInfo.push("Przy gęstych włosach nie rekomendujemy Micro. Lepsze będą mocniejsze łączenia dobrane do większej ilości włosów.");
    notes.push("Gęstość: gęste. Nie proponować Micro.");
  }
  if(a.wear === "Wysoki kucyk" && ["Mini","Standard"].includes(method)){
    method = "Nano";
    clientInfo.push("Przy wysokich upięciach lepiej sprawdzają się Nano lub Micro.");
  }
  if(a.correction === "Włosy ciągnęły"){
    notes.push("Rozważyć zmianę rozmiaru łączeń. Powód: klientka zaznaczyła, że włosy ciągnęły.");
    if(a.prevMethod === "Micro") notes.push("Jeśli poprzednio Micro: spróbować włożyć więcej naturalnych włosów do łączenia.");
    if(a.prevMethod === "Mini") notes.push("Jeśli poprzednio Mini: zaproponować Nano.");
    if(a.prevMethod === "Nano") notes.push("Jeśli poprzednio Nano: zaproponować Micro.");
    if(a.prevMethod === "Standard") notes.push("Jeśli poprzednio Standard: zaproponować Mini.");
  }
  if(a.correction === "Włosy się wyczesywały") notes.push("Dopytać o szampon. Powód: klientka zaznaczyła wyczesywanie.");
  if(a.correction === "Spadały łączenia") notes.push("Wykonać karbowanie i dopytać o maskę/odżywkę na łączenia.");
  if(a.correction === "Włosy się wyczesywały" && !["Hyntegra","Hair Glow"].includes(a.shampoo)){
    clientInfo.push("Przy problemie z wyczesywaniem musisz używać szamponu Hyntegra. To dedykowany szampon do włosów przedłużanych. Jeśli klientka używa innego szamponu, salon nie odpowiada za wyczesywanie włosów.");
    notes.push("Klientka zaznaczyła wyczesywanie i szampon inny niż Hyntegra/Hair Glow. Obowiązkowo zalecić Hyntegra i zaznaczyć brak odpowiedzialności salonu przy używaniu innych szamponów.");
  } else if(["Neboa","OnlyBio"].includes(a.shampoo)){
    clientInfo.push("Ten szampon nie jest rekomendowany do włosów przedłużanych. Zalecamy Hyntegra.");
    notes.push("Zalecić Hyntegra.");
  }
  if(a.shampoo === "Inny" && a.correction !== "Włosy się wyczesywały") clientInfo.push("Upewnij się, że szampon jest odpowiedni do włosów przedłużanych. Zalecamy Hyntegra.");
  if(a.shampoo === "Hair Glow") notes.push("Szampon odpowiedni. Jeśli włosy się wyczesują, sprawdzić keratynę i pielęgnację.");
  if(a.shampoo === "Hyntegra") notes.push("Szampon rekomendowany. Jeśli włosy się wyczesują, sprawdzić keratynę i inne przyczyny.");
  const scalpAddons = {"Przetłuszcza się":"Peeling skóry głowy +50 zł","Swędzi / łupież":"Peeling + szampon mentolowy +80 zł","Słabo rosną włosy":"Peeling + wcierka +120 zł"};
  if(scalpAddons[a.scalp]) clientInfo.push(`Propozycja dodatkowa: ${scalpAddons[a.scalp]}.`);
  if(a.scalp === "Słabo rosną włosy") scalpTreatments.push("Kuracja na porost włosów +120 zł");
  if(a.scalp === "Przetłuszcza się") scalpTreatments.push("Peeling skóry głowy +50 zł");
  if(a.scalp === "Swędzi / łupież") scalpTreatments.push("Peeling + szampon mentolowy +80 zł");
  if(a.dry === "Tak"){
    clientInfo.push("Suche i puszące się włosy mogą wymagać dodatkowej pielęgnacji.");
    hairTreatments.push("Nawilżanie włosów +120 zł");
  }
  if(a.invisible === "Bardzo ważna" && !["Nano","Micro"].includes(method)){
    method = "Nano";
    clientInfo.push("Sugestia stylistki: lepiej dopasowana metoda premium do niewidocznych łączeń.");
  }
  if(a.grams === "Do 200 g" && method === "Nano"){
    clientInfo.push("Przy 200 g pełne Nano odpada. Rekomendacja: 3 rzędy Nano + reszta Mini.");
  }
  if(a.wear === "Wysoki kucyk" && a.grams === "Do 150 g"){
    method = "Mieszanka: 3 rzędy Micro + reszta Mini";
  }
  if(a.wear === "Wysoki kucyk" && a.grams === "Do 200 g"){
    method = "Mieszanka: 3 rzędy Nano + reszta Mini";
  }
  if(a.hairDensity === "Rzadkie" && (method.includes("Mini") || method.includes("Standard"))){
    method = "Nano";
    clientInfo.push("Po uwzględnieniu rzadkiej gęstości włosów zmieniam propozycję na Nano.");
  }
  if(a.hairDensity === "Gęste" && method.includes("Micro")){
    method = method.includes("Mieszanka") ? "Mieszanka: 3 rzędy Nano + reszta Mini" : "Mini";
    clientInfo.push("Po uwzględnieniu gęstych włosów usuwam Micro z propozycji.");
  }
  const baseMethod = method.includes("Mieszanka") ? (a.grams === "Do 150 g" ? "Nano" : "Nano") : method;
  let price = prices[a.grams || "Do 100 g"]?.[baseMethod] || 0;
  if(method.includes("Micro + reszta Mini")) price = 800;
  if(method.includes("Nano + reszta Mini")) price = 900;
  const selectedPrice = prices[a.grams || "Do 100 g"]?.[selectedMethod] || price;
  const addonPrice = consult.addons.reduce((sum, item) => sum + (parseInt(item.match(/\+(\d+)/)?.[1] || "0",10)), 0);
  treatments.push(...hairTreatments, ...scalpTreatments);
  return { method, grams:a.grams, price, selectedPrice, addonPrice, total:price+addonPrice, notes, clientInfo, treatments, hairTreatments, scalpTreatments };
}
function renderConsultSummary(){
  const result = analyzeConsult();
  const answers = Object.entries(consult.answers).map(([k,v]) => `<div><b>${label(k)}:</b> ${esc(v)}</div>`).join("");
  $("#modalCard").classList.remove("tablet-card");
  $("#modalCard").innerHTML = `<div class="modal-head"><h2>Podsumowanie ankiety korekty</h2><button class="btn secondary" data-close-modal>Anuluj</button></div>
  <div class="report">
    <h3>Wynik</h3>
    <b>Metoda:</b> ${esc(result.method)}<br>
    <b>Gramatura:</b> ${esc(result.grams || "")}<br>
    <b>Cena korekty:</b> ${result.price} zł<br>
    <b>Dodatki:</b> ${consult.addons.join(", ") || "brak"} (${result.addonPrice} zł)<br>
    <b>Łączna kwota:</b> ${result.total} zł<br>
    <b>Akceptacja regulaminu:</b> ${esc(consult.answers.acceptRules || "Nie zaznaczono")}<br>
    <b>Akceptacja metody:</b> ${esc(consult.answers.acceptMethod || "Nie zaznaczono")}<br>
    <b>Akceptacja ceny:</b> ${esc(consult.answers.acceptPrice || "Nie zaznaczono")}
    <h3>Odpowiedzi klientki</h3>${answers}
    <h3>Informacje dla klientki</h3>${result.clientInfo.map(x=>`<div>${esc(x)}</div>`).join("") || "Brak"}
    <h3>Raport dla stylistki</h3>${result.notes.map(x=>`<div>${esc(x)}</div>`).join("") || "Brak dodatkowych notatek"}
  </div>
  <div class="actions" style="margin-top:18px">
    <button class="btn secondary" id="editConsult">Edytuj</button>
    <button class="btn" id="saveConsult">Zapisz jako wizytę</button>
    <button class="btn dark" id="pdfConsult">Generuj PDF</button>
  </div>`;
  $("#editConsult").onclick = () => { consult.step = 0; renderConsultStep(); };
  $("#saveConsult").onclick = () => {
    const c = state.clients.find(x => x.id === consult.clientId);
    if(!c){
      alert("Wybierz klientkę przed zapisaniem ankiety.");
      renderConsultClientPicker();
      return;
    }
    const visitId = "v" + Date.now();
    const services = ["Korekta"];
    if(consult.answers.wantsColor === "Tak") services.push("Koloryzacja");
    const visit = {
      id: visitId,
      date: today(),
      services,
      method: result.method,
      grams: result.grams,
      length: c.length || "",
      color: c.color || "",
      price: `${result.total} zł`,
      deposit: "",
      orderedHair: "Nie",
      orderedNote: "",
      afterPhoto: "",
      connectionPhoto: "",
      colorDetails: {},
      colorRecordId: "",
      note: `${result.notes.join(" | ")} ${result.clientInfo.join(" | ")}`.trim(),
      privateNote: `Ankieta korekty. Koloryzacja: ${consult.answers.colorService || "nie"}.`
    };
    if(consult.answers.wantsColor === "Tak"){
      const colorRecord = {
        id: "k" + Date.now(),
        visitId,
        source: "Ankieta korekty",
        date: today(),
        root: "",
        oxidant: "",
        toner: "",
        pigments: "",
        processingTime: "",
        result: consult.answers.colorService || "",
        note: "Koloryzacja zaznaczona w ankiecie korekty."
      };
      visit.colorDetails = colorRecord;
      visit.colorRecordId = colorRecord.id;
      c.colors ||= [];
      c.colors.unshift(colorRecord);
    }
    c.visits ||= [];
    c.visits.unshift(visit);
    c.method = result.method;
    c.grams = result.grams;
    c.lastVisit = today();
    c.lastPrice = `${result.total} zł`;
    save(); closeModal(); activeClientId=c.id; activeClientTab="visits"; showView("clientCard");
  };
  $("#pdfConsult").onclick = () => window.print();
}

document.addEventListener("click",e=>{if(e.target.closest("[data-close-modal]"))closeModal();});


function attachmentMarkup(files=[]){
 return files.map(f=>`<div data-panel-file="${esc(f.path)}" data-panel-file-name="${esc(f.name)}" data-panel-file-type="${esc(f.type)}">Ładowanie załącznika…</div>`).join('');
}
async function loadPanelFiles(){
 const generation=authGeneration;
 for(const node of document.querySelectorAll('[data-panel-file]:not([data-loading])')){
  node.dataset.loading='1';
  const path=node.dataset.panelFile;
  if(!/^admin\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/.test(path)){node.textContent='Załącznik niedostępny.';continue;}
  try{
   const {data,error}=await hbsDb.storage.from('hbs-panel-files').download(path);
   if(error||!data)throw Error();
   if(generation!==authGeneration||!isAdmin()||!node.isConnected)continue;
   const url=URL.createObjectURL(data);panelFileUrls.add(url);
   const link=document.createElement('a');link.href=url;link.download=node.dataset.panelFileName;link.textContent='Pobierz załącznik';
   node.replaceChildren(link);
   if(node.dataset.panelFileType.startsWith('image/')){const img=document.createElement('img');img.src=url;img.alt='Prywatne zdjęcie z kartoteki';img.style.cssText='display:block;max-width:100%;max-height:360px;object-fit:contain';node.prepend(img);}
  }catch{node.textContent='Nie udało się pobrać załącznika. Otwórz kartę ponownie.';}
 }
}
async function uploadPanelFiles(input){
 const files=Array.from(input?.files||[]), generation=authGeneration;
 if(files.length>10)throw Error('Dodaj maksymalnie 10 plików jednocześnie.');
 // Validate every file before starting uploads. Original names are metadata only.
 const verified=[];
 for(const file of files){
  if(!file.size||file.size>10*1024*1024)throw Error('Każdy plik musi mieć do 10 MB.');
  const b=new Uint8Array(await file.slice(0,12).arrayBuffer());let ext,type;
  if(b[0]===255&&b[1]===216&&b[2]===255){ext='jpg';type='image/jpeg';}
  else if([137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v)){ext='png';type='image/png';}
  else if(String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP'){ext='webp';type='image/webp';}
  else if(String.fromCharCode(...b.slice(0,5))==='%PDF-'&&input.name==='contractPhoto'){ext='pdf';type='application/pdf';}
  else throw Error('Dozwolone są JPG, PNG i WebP, a dla umowy również PDF.');
  verified.push({file,ext,type});
 }
 const result=[];
 for(const {file,ext,type} of verified){
  if(!isAdmin()||saveBlocked||generation!==authGeneration)throw Error('Sesja zakończona. Zaloguj się ponownie.');
  const path=`admin/${crypto.randomUUID()}.${ext}`;
  const {error}=await hbsDb.storage.from('hbs-panel-files').upload(path,file,{contentType:type,upsert:false});
  if(error)throw Error('Nie udało się przesłać pliku. Nie zapisano wpisu.');
  if(generation!==authGeneration||!isAdmin())throw Error('Sesja zakończona. Nie zapisano wpisu.');
  result.push({path,name:file.name,type,size:file.size});
 }
 return result;
}
async function preparePanelAttachments(form){
 const button=form.querySelector('button[type="submit"],button:not([type])');
 if(button)button.disabled=true;
 try{const out={};for(const input of form.querySelectorAll('input[type="file"]'))out[input.name]=await uploadPanelFiles(input);return out;}
 catch(error){alert(error.message);return null;}
 finally{if(button)button.disabled=false;}
}
new MutationObserver(()=>{if(isAdmin())loadPanelFiles();}).observe(document.querySelector('#app'),{subtree:true,childList:true});
