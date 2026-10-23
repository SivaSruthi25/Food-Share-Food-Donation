const API_URL = (window.FOODSHARE_API_URL || "").replace(/\/$/, "");
const donationForm = document.querySelector("#donation-form");
const contactForm = document.querySelector("#contact-form");
const foodGrid = document.querySelector("#food-grid");
const listingNote = document.querySelector("#listing-note");

function showStatus(element, message, type) {
  element.textContent = message;
  element.className = "status-message " + type;
}

async function sendRequest(path, data) {
  const response = await fetch(API_URL + path, {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined
  });

  let result = {};
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an unexpected response.");
  }

  if (!response.ok) {
    throw new Error(result.error || "The request could not be completed.");
  }
  return result;
}

function makeFoodCard(donation) {
  const card = document.createElement("article");
  card.className = "food-card";

  const image = document.createElement("img");
  image.src = "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80";
  image.alt = "A fresh meal ready to share";
  image.loading = "lazy";
  card.append(image);

  const info = document.createElement("div");
  info.className = "food-info";

  const category = document.createElement("span");
  category.className = "food-type";
  category.textContent = donation.category || "Food donation";

  const title = document.createElement("h3");
  title.textContent = donation.food_name;

  const description = document.createElement("p");
  description.textContent = donation.description || donation.quantity;

  const quantity = document.createElement("p");
  quantity.textContent = "Quantity: " + donation.quantity;

  const location = document.createElement("p");
  location.className = "food-location";
  location.textContent = "Pickup area: " + donation.location;

  info.append(category, title, description, quantity, location);

  if (donation.expires_at) {
    const deadline = document.createElement("p");
    deadline.textContent = "Pickup by: " + new Date(donation.expires_at).toLocaleString();
    info.append(deadline);
  }

  const requestLink = document.createElement("a");
  requestLink.className = "text-link";
  requestLink.href = "#contact";
  requestLink.textContent = "Ask about this food";
  requestLink.addEventListener("click", () => {
    document.querySelector("#your-message").value =
      "I am interested in the food donation: " + donation.food_name + ". Please contact me with details.";
  });

  info.append(requestLink);
  card.append(info);
  return card;
}

async function loadDonations() {
  if (!API_URL) return;

  try {
    const result = await sendRequest("/api/donations");
    if (!Array.isArray(result.donations)) return;

    foodGrid.replaceChildren();
    if (result.donations.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "empty-list";
      emptyMessage.textContent = "There are no current donations listed. Please check back soon.";
      foodGrid.append(emptyMessage);
      listingNote.textContent = "Listings come from the FoodShare demo database. FoodShare does not independently verify food safety.";
      return;
    }

    result.donations.forEach((donation) => foodGrid.append(makeFoodCard(donation)));
    listingNote.textContent = "Live listings are shared by donors. Please arrange pickup carefully and check food details with the donor.";
  } catch {
    listingNote.textContent = "Live donations are temporarily unavailable. Sample cards below are examples only, not real food offers.";
  }
}

donationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = donationForm.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    await sendRequest("/api/donations", {
      foodName: document.querySelector("#food-name").value,
      quantity: document.querySelector("#quantity").value,
      location: document.querySelector("#pickup-location").value,
      contact: document.querySelector("#donor-contact").value,
      confirmHandling: document.querySelector("#safe-handling").checked
    });
    donationForm.reset();
    showStatus(document.querySelector("#donation-status"), "Thank you. Your donation was added to Available food.", "success");
    await loadDonations();
  } catch (error) {
    showStatus(document.querySelector("#donation-status"), error.message, "error");
  } finally {
    button.disabled = false;
  }
});

contactForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = contactForm.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    await sendRequest("/api/contact", {
      name: document.querySelector("#your-name").value,
      email: document.querySelector("#your-email").value,
      message: document.querySelector("#your-message").value
    });
    contactForm.reset();
    showStatus(document.querySelector("#contact-status"), "Your message was saved. It was not emailed automatically.", "success");
  } catch (error) {
    showStatus(document.querySelector("#contact-status"), error.message, "error");
  } finally {
    button.disabled = false;
  }
});

loadDonations();
