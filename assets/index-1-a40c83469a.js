
const supabaseReady = window.supabase && window.HBS_SUPABASE?.url && window.HBS_SUPABASE?.anonKey;
const hbsDb = supabaseReady ? window.supabase.createClient(window.HBS_SUPABASE.url, window.HBS_SUPABASE.anonKey, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}) : null;

document.querySelectorAll(".training-summary").forEach(button => {
  button.addEventListener("click", () => {
    const panel = button.closest(".training-panel");
    const drawer = document.getElementById("trainingDrawer");
    const options = document.querySelector(".training-options");
    const isMobile = window.matchMedia("(max-width: 850px)").matches;
    const isOpen = panel.classList.contains("active");

    document.querySelectorAll(".training-panel").forEach(item => {
      item.classList.remove("active");
      const summary = item.querySelector(".training-summary");
      if(summary) summary.setAttribute("aria-expanded", "false");
    });

    drawer.classList.remove("active");

    if(isOpen){
      window.setTimeout(() => drawer.replaceChildren(), 180);
      return;
    }

    window.setTimeout(() => {
      const grid = panel.querySelector(".training-grid").cloneNode(true);
      if(isMobile){
        panel.insertAdjacentElement("afterend", drawer);
      }else{
        options.insertAdjacentElement("afterend", drawer);
      }
      drawer.replaceChildren(grid);
      panel.classList.add("active");
      button.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => drawer.classList.add("active"));
    }, 160);
  });
});


function setupPhone(countryId, phoneId){
  const country = document.getElementById(countryId);
  const phone = document.getElementById(phoneId);
  if(!country || !phone) return;
  const limit = () => Number(country.selectedOptions[0].dataset.digits);
  const sync = () => {
    phone.value = phone.value.replace(/\D/g, "").slice(0, limit());
    phone.placeholder = country.selectedOptions[0].dataset.prefix + " " + "0".repeat(limit());
  };
  country.addEventListener("change", sync);
  phone.addEventListener("input", sync);
  sync();
}
setupPhone("contactPhoneCountry", "contactPhone");
function fullPhone(countryId, phoneId){
  const country = document.getElementById(countryId);
  return `${country.selectedOptions[0].dataset.prefix} ${document.getElementById(phoneId).value}`;
}
function validPhone(countryId, phoneId){
  const country = document.getElementById(countryId);
  return document.getElementById(phoneId).value.length === Number(country.selectedOptions[0].dataset.digits);
}
document.getElementById("contactForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  if(!validPhone("contactPhoneCountry", "contactPhone")){
    alert("Sprawdź numer telefonu - liczba cyfr musi pasować do wybranego kraju.");
    return;
  }

  if(!hbsDb){
    alert("Formularz nie ma połączenia z panelem. Spróbuj ponownie później.");
    return;
  }

  const submitButton = event.target.querySelector('button[type="submit"]');
  if(submitButton.disabled) return;
  submitButton.disabled = true;
  submitButton.textContent = "Wysyłanie...";

  try {
  const {ticket}=await window.HBSSubmit.start(event.target,'contact');
  await window.HBSSubmit.submit(ticket, {
    p_client_name: document.getElementById("contactName").value.trim(),
    p_phone: fullPhone("contactPhoneCountry", "contactPhone"),
    p_email: "",
    p_message: document.getElementById("contactMessage").value.trim()
  });

  event.target.reset();
  setupPhone("contactPhoneCountry", "contactPhone");
  document.getElementById("contactSuccess").classList.add("show");
  submitButton.disabled = false;
  submitButton.textContent = "Wyślij zgłoszenie";
  } catch(error) { alert("Nie udało się wysłać zgłoszenia. Sprawdź połączenie i spróbuj ponownie."); }
  finally { submitButton.disabled = false; submitButton.textContent = "Wyślij zgłoszenie"; }
});
