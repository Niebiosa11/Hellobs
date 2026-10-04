
const supabaseReady = window.supabase && window.HBS_SUPABASE?.url && window.HBS_SUPABASE?.anonKey;
const hbsDb = supabaseReady ? window.supabase.createClient(window.HBS_SUPABASE.url, window.HBS_SUPABASE.anonKey, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}) : null;

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
setupPhone("phoneCountry", "phone");
document.getElementById("consultationForm").addEventListener("submit", async event => {
  event.preventDefault();
  if(!validPhone("phoneCountry", "phone")){
    alert("Sprawdź numer telefonu - liczba cyfr musi pasować do wybranego kraju.");
    return;
  }

  const photoFiles = Array.from(document.getElementById("hairPhotos").files);
  if(photoFiles.length > 5 || photoFiles.some(file => !["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)){
    alert("Dodaj maksymalnie 5 zdjęć JPG, PNG lub WebP, do 5 MB każde.");
    return;
  }
  const submitButton = event.target.querySelector('button[type="submit"]');
  if(submitButton.disabled) return;
  submitButton.disabled = true;
  submitButton.textContent = "Wysyłanie...";

  const message = [
    `Instagram / Facebook: ${document.getElementById("social").value || "brak"}`,
    `Obecna długość: ${document.getElementById("currentLength").value}`,
    `Docelowa długość: ${document.getElementById("targetLength").value}`,
    `Kolor włosów: ${document.getElementById("hairColor").value || "brak"}`,
    `Budżet: ${document.getElementById("budget").value}`,
    `Oczekiwania: ${document.getElementById("expectations").value || "brak"}`,
    `Zdjęcia dodane w formularzu: ${Array.from(document.getElementById("hairPhotos").files).map(file => file.name).join(", ") || "brak"}`
  ].join("\n");

  if(!hbsDb){
    alert("Formularz nie ma połączenia z panelem. Spróbuj ponownie później.");
    submitButton.disabled = false;
    submitButton.textContent = "Wyślij konsultację";
    return;
  }

  try {
    const {ticket}=await window.HBSSubmit.start(event.target,'contact');
    for(const file of photoFiles){
      await window.HBSSubmit.upload(hbsDb,ticket,file);
    }
    await window.HBSSubmit.submit(ticket, {
      p_client_name: document.getElementById("name").value,
      p_phone: fullPhone("phoneCountry", "phone"),
      p_email: "",
      p_message: message
    });
    event.target.reset();
    document.getElementById("success").classList.add("show");
  } catch(error){
    alert("Nie udało się wysłać konsultacji. Spróbuj ponownie później.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Wyślij konsultację";
  }
});
