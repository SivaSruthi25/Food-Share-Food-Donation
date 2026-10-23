/* The Render server address is added by the deployment build. */
const API_URL = (window.FOODSHARE_API_URL || '').replace(/\/+$/, '');
const foodGrid = document.querySelector('#foodGrid');
const requestDialog = document.querySelector('#requestDialog');
const requestForm = document.querySelector('#requestForm');
const requestedDonationIds = new Set();
let toastTimer;

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(function () {
    toast.classList.remove('show');
  }, 3500);
}

function setMessage(elementId, message, isError) {
  const element = document.querySelector(elementId);
  element.textContent = message;
  element.classList.toggle('error-message', Boolean(isError));
}

async function sendToApi(path, data) {
  if (!API_URL) {
    throw new Error('The backend address has not been added to the website yet.');
  }

  const response = await fetch(API_URL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json().catch(function () { return {}; });
  if (!response.ok) {
    throw new Error(result.error || 'The server could not complete this request.');
  }
  return result;
}

function imageForCategory(category) {
  const images = {
    Meals: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    Produce: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=800&q=80',
    Bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    Pantry: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80'
  };
  return images[category] || images.Meals;
}

function makeFoodCard(donation) {
  const card = document.createElement('article');
  card.className = 'food-card';

  const image = document.createElement('img');
  image.src = donation.image || imageForCategory(donation.category);
  image.alt = donation.foodName;
  image.loading = 'lazy';

  const info = document.createElement('div');
  info.className = 'food-info';

  const type = document.createElement('span');
  type.className = 'food-type';
  type.textContent = donation.category || 'Food';

  const name = document.createElement('h3');
  name.textContent = donation.foodName;

  const description = document.createElement('p');
  description.textContent = donation.description || 'A little extra food, ready to be shared.';

  const quantity = document.createElement('p');
  quantity.textContent = 'Quantity: ' + donation.quantity;

  const location = document.createElement('p');
  location.className = 'food-location';
  location.textContent = '⌖ ' + donation.location;

  const pickup = document.createElement('p');
  pickup.textContent = donation.pickupBy ? 'Pickup by ' + new Date(donation.pickupBy).toLocaleString() : 'Pickup time to be agreed';

  const button = document.createElement('button');
  button.className = 'text-link request-food-button';
  button.type = 'button';
  button.dataset.donationId = donation.id;
  button.textContent = requestedDonationIds.has(donation.id) ? 'Request sent' : 'Request this food →';
  button.disabled = requestedDonationIds.has(donation.id);

  info.append(type, name, description, quantity, location, pickup, button);
  card.append(image, info);
  return card;
}

function showDonations(donations) {
  foodGrid.replaceChildren();
  foodGrid.classList.toggle('is-empty', donations.length === 0);
  donations.forEach(function (donation) {
    foodGrid.append(makeFoodCard(donation));
  });
}

async function loadDonations() {
  if (!API_URL) return;

  try {
    const response = await fetch(API_URL + '/api/donations');
    if (!response.ok) throw new Error('Could not load food listings.');
    const result = await response.json();
    showDonations(result.donations || []);
  } catch (error) {
    showToast('Could not reach the food server. Sample listings are still shown.');
  }
}

document.querySelector('#donationForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form).entries());

  setMessage('#donationMessage', 'Sending donation...', false);
  submitButton.disabled = true;
  try {
    await sendToApi('/api/donations', data);
    form.reset();
    setMessage('#donationMessage', 'Thank you! Your food is now listed for this demo.', false);
    await loadDonations();
    document.querySelector('#available').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    setMessage('#donationMessage', error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

foodGrid.addEventListener('click', function (event) {
  const button = event.target.closest('.request-food-button');
  if (!button) return;

  if (!API_URL) {
    showToast('Connect the Render backend to send food requests.');
    return;
  }

  const donation = button.dataset.donationId;
  document.querySelector('#requestDonationId').value = donation;
  const card = button.closest('.food-card');
  document.querySelector('#requestingFood').textContent = card.querySelector('h3').textContent;
  setMessage('#requestMessage', '', false);
  requestDialog.showModal();
});

requestForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form).entries());

  setMessage('#requestMessage', 'Sending request...', false);
  submitButton.disabled = true;
  try {
    await sendToApi('/api/requests', data);
    requestedDonationIds.add(data.donationId);
    requestDialog.close();
    form.reset();
    showToast('Your request was recorded. The donor is not notified in this demo.');
    await loadDonations();
  } catch (error) {
    setMessage('#requestMessage', error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector('#closeRequest').addEventListener('click', function () {
  requestDialog.close();
});

document.querySelector('#cancelRequest').addEventListener('click', function () {
  requestDialog.close();
});

document.querySelector('#contactForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form).entries());

  setMessage('#contactMessage', 'Sending message...', false);
  submitButton.disabled = true;
  try {
    await sendToApi('/api/contact', data);
    form.reset();
    setMessage('#contactMessage', 'Thanks! The demo server recorded your message but did not send email.', false);
  } catch (error) {
    setMessage('#contactMessage', error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

loadDonations();
