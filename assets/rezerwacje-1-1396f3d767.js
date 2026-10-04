
const supabaseConfig = window.HBS_SUPABASE || {};
const supabaseReady = Boolean(
  window.supabase &&
  supabaseConfig.url &&
  supabaseConfig.anonKey &&
  !supabaseConfig.url.includes("TU_WKLEJ") &&
  !supabaseConfig.anonKey.includes("TU_WKLEJ")
);
const hbsDb = supabaseReady ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}) : null;
const state = {slots:[]};
let availabilityReady = false;
let calendarMonth = monthStart(new Date());
let selectedCalendarDate = "";

function escapeHtml(value){return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function formatDate(date){
  return new Date(date + "T12:00:00").toLocaleDateString("pl-PL", { weekday:"long", day:"2-digit", month:"long" });
}
function dateKey(date){
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function monthStart(date){
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function sameMonth(a, b){
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function monthLabel(date){
  return date.toLocaleDateString("pl-PL", { month:"long", year:"numeric" });
}
function formatTime(time){
  return String(time || "").slice(0, 5);
}
function slotLabel(slot){
  return `${formatDate(slot.date)}, ${formatTime(slot.time)}`;
}
function selectedServices(){
  return [...document.querySelectorAll('input[name="service"]:checked')].map(input => input.value);
}
function isConsultationMode(){
  return selectedServices().includes("Konsultacja");
}
function slotDuration(slot){
  return Number(slot.duration || slot.duration_minutes || 180);
}
function durationText(minutes){
  const value = Number(minutes || 180);
  if(value >= 60 && value % 60 === 0) return `${value / 60}h`;
  return `${value} min`;
}
function selectedSlot(){
  const slotId = document.getElementById("selectedSlot").value;
  if(slotId.startsWith("consult-")){
    return generateConsultationSlots(calendarMonth).find(item => item.id === slotId);
  }
  return state.slots.find(item => item.id === slotId);
}
function serviceMinDuration(){
  const services = selectedServices();
  if(!services.length) return 0;
  if(services.includes("Konsultacja")) return 15;
  const hasColor = services.includes("Koloryzacja");
  const hasExtensionWork = services.includes("Przedłużanie włosów") || services.includes("Korekta włosów");
  if(hasColor && hasExtensionWork) return 300;
  if(hasExtensionWork || hasColor || services.includes("Pielęgnacja / zabieg")) return 180;
  if(services.includes("Ściąganie włosów")) return 60;
  return 0;
}
function slotMatchesService(slot){
  if(isConsultationMode()) return true;
  const min = serviceMinDuration();
  return !min || slotDuration(slot) >= min;
}
function syncServiceChoices(changedInput){
  if(changedInput?.value === "Konsultacja" && changedInput.checked){
    document.querySelectorAll('input[name="service"]').forEach(input => {
      if(input !== changedInput) input.checked = false;
    });
    return;
  }
  if(changedInput?.checked){
    const consultation = document.querySelector('input[name="service"][value="Konsultacja"]');
    if(consultation) consultation.checked = false;
  }
}
function syncAddons(){
  const slot = selectedSlot();
  const hint = document.getElementById("durationHint");
  const services = selectedServices();
  const serviceText = services.map(service => service === "Przedłużanie włosów" ? "Nowe założenie" : service).join(" + ");
  if(!services.length){
    hint.textContent = "Wybierz usługę, aby zobaczyć dostępne terminy.";
    return;
  }
  if(isConsultationMode()){
    hint.textContent = "Konsultacja jest darmowa, trwa 15 minut i jest dostępna od wtorku do piątku o 11:00, 12:00 lub 15:00.";
    return;
  }
  if(!slot){
    hint.textContent = `${serviceText}: wybierz pasujący termin z kalendarza.`;
    return;
  }
  hint.textContent = `${serviceText}: termin wybrany. Uzupełnij dane i wyślij zgłoszenie.`;
}
function selectedServiceText(){
  const services = selectedServices();
  if(services.includes("Konsultacja")) return "Konsultacja";
  return services.map(service => service === "Ściąganie włosów" ? "Ściąganie włosów - 150 zł" : service).join(" + ");
}
function generateConsultationSlots(month){
  const slots = [];
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const todayKey = dateKey(new Date());
  for(let day = 1; day <= daysInMonth; day++){
    const current = new Date(month.getFullYear(), month.getMonth(), day);
    const weekday = current.getDay();
    if(weekday < 2 || weekday > 5) continue;
    const dayKey = dateKey(current);
    if(dayKey < todayKey) continue;
    ["11:00","12:00","15:00"].forEach(time => {
      slots.push({
        id: `consult-${dayKey}-${time}`,
        date: dayKey,
        time,
        duration: 15,
        note: "darmowa konsultacja",
        status: "free",
        generatedConsultation: true
      });
    });
  }
  return slots;
}
function setupPhone(countryId, phoneId){
  const country = document.getElementById(countryId);
  const phone = document.getElementById(phoneId);
  const limit = () => Number(country.selectedOptions[0].dataset.digits);
  const sync = () => {
    phone.value = phone.value.replace(/\D/g, "").slice(0, limit());
    phone.placeholder = country.selectedOptions[0].dataset.prefix + " " + "0".repeat(limit());
  };
  country.addEventListener("change", sync);
  phone.addEventListener("input", sync);
  sync();
}
function fullPhone(countryId, phoneId){
  const country = document.getElementById(countryId);
  return `${country.selectedOptions[0].dataset.prefix} ${document.getElementById(phoneId).value}`;
}
function validPhone(countryId, phoneId){
  const country = document.getElementById(countryId);
  return document.getElementById(phoneId).value.length === Number(country.selectedOptions[0].dataset.digits);
}
setupPhone("clientPhoneCountry", "clientPhone");
async function loadSupabaseSlots(){
  availabilityReady = false;
  state.slots = [];
  if(!hbsDb) return false;
  try {
    const {data,error} = await hbsDb.from("availability_slots")
      .select("id, visit_date, visit_time, status, duration_minutes")
      .eq("status", "free").gte("visit_date", dateKey(new Date()))
      .order("visit_date", {ascending:true}).order("visit_time", {ascending:true});
    if(error) return false;
    state.slots = (data || []).map(slot => ({id:slot.id,date:slot.visit_date,time:formatTime(slot.visit_time),duration:Number(slot.duration_minutes || 180),status:slot.status}));
    availabilityReady = true;
    return true;
  } catch(error) { return false; }
}
function openTab(name){
  document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab.dataset.tab === name));
  document.querySelectorAll(".panel").forEach(panel => panel.classList.toggle("active", panel.id === name));
}
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => openTab(tab.dataset.tab)));

document.getElementById("prevMonth").addEventListener("click", () => {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
  selectedCalendarDate = "";
  renderSlots();
});
document.getElementById("nextMonth").addEventListener("click", () => {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
  selectedCalendarDate = "";
  renderSlots();
});
document.getElementById("calendarToday").addEventListener("click", () => {
  calendarMonth = monthStart(new Date());
  selectedCalendarDate = dateKey(new Date());
  renderSlots();
});

function syncCorrectionMethod(){
  const active = selectedServices().includes("Korekta włosów");
  const field = document.getElementById("correctionMethod");
  document.getElementById("correctionMethodQuestion").classList.toggle("hidden", !active);
  field.disabled = !active;
  field.required = active;
  if(!active) field.value = "";
}
function bookingMessage(){
  const message = document.getElementById("clientMessage").value;
  const method = document.getElementById("correctionMethod").value;
  return selectedServices().includes("Korekta włosów") && method
    ? ["Metoda obecnego założenia: " + method, message].filter(Boolean).join("\n\n")
    : message;
}
function renderSlots(){
  syncCorrectionMethod();
  const services = selectedServices();
  document.getElementById("bookingSteps").classList.toggle("hidden", !services.length);
  const prompt = document.getElementById("servicePrompt");
  const content = document.getElementById("calendarContent");
  if(!services.length){
    prompt?.classList.remove("hidden");
    content?.classList.add("hidden");
    document.getElementById("bookingCalendar").innerHTML = "";
    document.getElementById("availableSlots").innerHTML = "";
    document.getElementById("calendarMonthLabel").textContent = "";
    return;
  }
  prompt?.classList.add("hidden");
  content?.classList.remove("hidden");

  if(!availabilityReady){
    document.getElementById("bookingCalendar").replaceChildren();
    document.getElementById("availableSlots").textContent = "Nie udało się wczytać terminów. Sprawdź połączenie i odśwież stronę.";
    return;
  }
  const free = (isConsultationMode() ? generateConsultationSlots(calendarMonth) : state.slots.filter(slot => slot.status === "free").filter(slotMatchesService))
    .sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));
  const firstFree = free[0];
  if(firstFree && !sameMonth(new Date(firstFree.date + "T12:00:00"), calendarMonth) && !selectedCalendarDate){
    calendarMonth = monthStart(new Date(firstFree.date + "T12:00:00"));
  }
  const byDate = free.reduce((map, slot) => {
    map[slot.date] ||= [];
    map[slot.date].push(slot);
    return map;
  }, {});
  if(!selectedCalendarDate && firstFree) selectedCalendarDate = firstFree.date;
  document.getElementById("calendarMonthLabel").textContent = monthLabel(calendarMonth);

  const calendar = document.getElementById("bookingCalendar");
  const firstDay = new Date(calendarMonth);
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const todayKey = dateKey(new Date());
  const cells = [];
  for(let i = 0; i < startOffset; i++) cells.push('<div class="calendar-day empty"></div>');
  for(let day = 1; day <= daysInMonth; day++){
    const current = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    const key = dateKey(current);
    const count = (byDate[key] || []).length;
    const tone = count > 1 ? "many" : count === 1 ? "one" : "none";
    const selected = selectedCalendarDate === key ? "selected" : "";
    const past = key < todayKey ? "past" : "";
    const label = count ? (isConsultationMode() ? "konsultacje" : "wolne") : "brak";
    cells.push(`
      <button class="calendar-day ${tone} ${selected} ${past}" data-date="${key}" ${past ? "disabled" : ""} type="button">
        <strong>${day}</strong>
        <span>${label}</span>
      </button>
    `);
  }
  calendar.innerHTML = cells.join("");
  calendar.querySelectorAll("[data-date]").forEach(button => {
    button.addEventListener("click", () => {
      selectedCalendarDate = button.dataset.date;
    document.getElementById("selectedSlot").value = "";
    document.getElementById("selectedSlotLabel").value = "";
      syncAddons();
      renderSlots();
    });
  });

  const container = document.getElementById("availableSlots");
  const daySlots = (byDate[selectedCalendarDate] || []).sort((a,b) => a.time.localeCompare(b.time));
  if(!free.length){
    container.innerHTML = '<div class="empty">Brak wolnych terminów. Dodamy nowe terminy w najbliższym czasie.</div>';
    return;
  }
  if(!daySlots.length){
    container.innerHTML = `<h3>${selectedCalendarDate ? formatDate(selectedCalendarDate) : "Wybierz dzień"}</h3><div class="empty">W tym dniu nie ma dostępnych godzin.</div>`;
    return;
  }
  container.innerHTML = `
    <h3>${formatDate(selectedCalendarDate)}</h3>
    <div class="slot-times">
      ${daySlots.map(slot => `
        <button class="slot-time" data-slot="${escapeHtml(slot.id)}" type="button">
          <strong>${formatTime(slot.time)}</strong>
          <span>${escapeHtml(slot.note || "wolny termin")}<br><small>${durationText(slotDuration(slot))}</small></span>
        </button>
      `).join("")}
    </div>
  `;
  container.querySelectorAll(".slot-time").forEach(button => {
    button.addEventListener("click", () => {
      const slot = free.find(item => item.id === button.dataset.slot);
      document.querySelectorAll(".slot-time").forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
      document.getElementById("selectedSlot").value = slot.id;
      document.getElementById("selectedSlotLabel").value = slotLabel(slot);
      syncAddons();
    });
  });
}

document.querySelectorAll('input[name="service"]').forEach(input => {
  input.addEventListener("change", () => {
    syncServiceChoices(input);
    document.getElementById("selectedSlot").value = "";
    document.getElementById("selectedSlotLabel").value = "";
    if(isConsultationMode()) selectedCalendarDate = dateKey(new Date());
    syncAddons();
    renderSlots();
  });
});

document.getElementById("requestForm").addEventListener("submit", async event => {
  event.preventDefault();
  if(!selectedServices().length){
    alert("Wybierz usługę.");
    return;
  }
  if(!validPhone("clientPhoneCountry", "clientPhone")){
    alert("Sprawdź numer telefonu - liczba cyfr musi pasować do wybranego kraju.");
    return;
  }
  const slotId = document.getElementById("selectedSlot").value;
  if(!slotId){
    alert("Wybierz termin.");
    return;
  }
  const slot = selectedSlot();
  if(!slot || slot.status !== "free"){
    alert("Ten termin nie jest już dostępny.");
    render();
    return;
  }

  if(!hbsDb || !availabilityReady){
    alert("Nie można teraz potwierdzić dostępności. Sprawdź połączenie i spróbuj ponownie.");
    return;
  }
  const submitButton = event.target.querySelector('button[type="submit"]');
  if(submitButton.disabled) return;
  submitButton.disabled = true;
  submitButton.textContent = "Wysyłanie...";
  try {
    const params = {
      p_client_name: document.getElementById("clientName").value,
      p_phone: fullPhone("clientPhoneCountry", "clientPhone"),
      p_message: bookingMessage()
    };
    const {ticket}=await window.HBSSubmit.start(event.target,slot.generatedConsultation?'consultation_booking':'booking');
    await window.HBSSubmit.submit(ticket,slot.generatedConsultation
      ? {
          p_visit_date: slot.date,
          p_visit_time: slot.time,
          ...params
        }
      : {
          p_slot_id: slotId,
          p_service: selectedServiceText(),
          ...params
        });

    event.target.reset();
    document.getElementById("selectedSlot").value = "";
    document.getElementById("selectedSlotLabel").value = "";
    await render();
    alert("Dziękujemy. Zgłoszenie zostało wysłane, odezwiemy się z potwierdzeniem terminu.");
  } catch(error) {
    alert("Nie udało się wysłać zgłoszenia. Sprawdź połączenie i spróbuj ponownie.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Wyślij zgłoszenie";
  }
});

async function render(){
  document.getElementById("availableSlots").textContent = "Wczytywanie terminów…";
  await loadSupabaseSlots();
  renderSlots();
  syncAddons();
}
render();
