
const priceTabs = document.querySelectorAll("[data-price-tab]");
const priceSections = document.querySelectorAll("[data-price-section]");

priceTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.priceTab;

    priceTabs.forEach((button) => {
      button.classList.toggle("active", button === tab);
    });

    priceSections.forEach((section) => {
      section.hidden = section.dataset.priceSection !== target;
    });

    document.querySelector(".hero").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
