const express = require('express');
const { randomUUID } = require('node:crypto');

const app = express();
const port = Number(process.env.PORT) || 10000;
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(function (origin) { return origin.trim(); });

app.disable('x-powered-by');
app.use(function (request, response, next) {
  const origin = request.headers.origin;
  if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Vary', 'Origin');
  if (request.method === 'OPTIONS') {
    return response.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: '20kb' }));

// Demo offers let the site show something before anyone adds food.
let donations = [
  {
    id: 'sample-meals',
    foodName: 'Garden veggie bowls',
    category: 'Meals',
    description: 'Fresh bowls with rice and seasonal vegetables.',
    quantity: '4 portions',
    location: 'Riverside neighborhood',
    pickupBy: '',
    contact: 'Sample contact, not a real donor',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample-produce',
    foodName: 'Apples and pears',
    category: 'Produce',
    description: 'A small bag of ripe fruit, ready to enjoy.',
    quantity: '1 small bag',
    location: 'Maple Street area',
    pickupBy: '',
    contact: 'Sample contact, not a real donor',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sample-bakery',
    foodName: 'Bread and morning rolls',
    category: 'Bakery',
    description: 'A few extra rolls and loaves from today.',
    quantity: '8 items',
    location: 'Old Town, near the library',
    pickupBy: '',
    contact: 'Sample contact, not a real donor',
    createdAt: new Date().toISOString()
  }
];

const requests = [];
const messages = [];
const categories = new Set(['Meals', 'Produce', 'Bakery', 'Pantry']);

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function publicDonation(donation) {
  return {
    id: donation.id,
    foodName: donation.foodName,
    category: donation.category,
    description: donation.description,
    quantity: donation.quantity,
    location: donation.location,
    pickupBy: donation.pickupBy,
    createdAt: donation.createdAt
  };
}

app.get('/', function (request, response) {
  response.json({ name: 'FoodShare demo API', health: '/api/health' });
});

app.get('/api/health', function (request, response) {
  response.json({ ok: true, service: 'FoodShare API' });
});

app.get('/api/donations', function (request, response) {
  response.json({ donations: donations.map(publicDonation) });
});

app.post('/api/donations', function (request, response) {
  const body = request.body || {};
  const foodName = cleanText(body.foodName, 80);
  const category = cleanText(body.category, 20);
  const quantity = cleanText(body.quantity, 60);
  const location = cleanText(body.location, 120);
  const contact = cleanText(body.contact, 120);

  if (!foodName || !categories.has(category) || !quantity || !location || !contact) {
    return response.status(400).json({
      error: 'Please enter a food name, valid food type, quantity, location, and contact detail.'
    });
  }

  const donation = {
    id: randomUUID(),
    foodName: foodName,
    category: category,
    description: cleanText(body.description, 240),
    quantity: quantity,
    location: location,
    contact: contact,
    pickupBy: cleanText(body.pickupBy, 40),
    createdAt: new Date().toISOString()
  };

  donations.unshift(donation);
  response.status(201).json({ donation: publicDonation(donation) });
});

app.post('/api/requests', function (request, response) {
  const body = request.body || {};
  const donationId = cleanText(body.donationId, 80);
  const name = cleanText(body.name, 80);
  const contact = cleanText(body.contact, 120);

  if (!donationId || !donations.some(function (item) { return item.id === donationId; })) {
    return response.status(404).json({ error: 'That food listing is no longer available.' });
  }
  if (!name || !contact) {
    return response.status(400).json({ error: 'Please enter your name and contact detail.' });
  }

  requests.push({
    id: randomUUID(),
    donationId: donationId,
    name: name,
    contact: contact,
    note: cleanText(body.note, 400),
    createdAt: new Date().toISOString()
  });

  response.status(201).json({ ok: true, message: 'Request saved for the demo.' });
});

app.post('/api/contact', function (request, response) {
  const body = request.body || {};
  const name = cleanText(body.name, 80);
  const email = cleanText(body.email, 120);
  const message = cleanText(body.message, 1000);

  const emailParts = email.split('@'); const validEmail = emailParts.length === 2 && emailParts[0].length > 0 && emailParts[1].includes('.'); if (!name || !validEmail || !message) {
    return response.status(400).json({ error: 'Please enter a valid name, email address, and message.' });
  }

  messages.push({
    id: randomUUID(),
    name: name,
    email: email,
    message: message,
    createdAt: new Date().toISOString()
  });

  response.status(201).json({ ok: true, message: 'Message saved for the demo.' });
});

app.use(function (request, response) {
  response.status(404).json({ error: 'This API route was not found.' });
});

app.use(function (error, request, response, next) {
  console.error(error);
  response.status(500).json({ error: 'Something went wrong on the FoodShare server.' });
});

app.listen(port, '0.0.0.0', function () {
  console.log('FoodShare API is listening on port ' + port);
});
