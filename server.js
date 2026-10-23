const PORT = Number(process.env.PORT) || 10000;
const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 60 * 1000;
const rateBuckets = new Map();

const allowedOrigins = (process.env.FRONTEND_ORIGINS || [
  "https://foodshare-p3njou6au-sruthipatnaikdabbeeru25-8156.vercel.app",
  "https://sivasruthi25.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
].join(","))
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers
  });
  response.end(JSON.stringify(payload));
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  if (!origin) return {};
  if (!allowedOrigins.includes(origin.replace(/\/$/, ""))) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin"
  };
}

function isRateLimited(request) {
  const forwarded = request.headers["x-forwarded-for"];
  const ip = (request.headers["x-real-ip"] || (typeof forwarded === "string" ? forwarded.split(",")[0] : "") || "unknown").trim();
  const now = Date.now();
  const bucket = rateBuckets.get(ip);

  if (!bucket || now - bucket.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(ip, { startedAt: now, count: 1 });
    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

async function readJson(request) {
  const chunks = [];
  let total = 0;

  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const error = new Error("The submitted form is too large.");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Please submit valid form data.");
    error.status = 400;
    throw error;
  }
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function requireText(value, label, maxLength) {
  const result = cleanText(value, maxLength);
  if (!result) {
    const error = new Error(label + " is required.");
    error.status = 400;
    throw error;
  }
  return result;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    const error = new Error("The database is not configured yet.");
    error.status = 503;
    throw error;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    const error = new Error("The database URL is invalid.");
    error.status = 503;
    throw error;
  }

  if (parsed.protocol !== "https:") {
    const error = new Error("The database URL must use HTTPS.");
    error.status = 503;
    throw error;
  }

  return { url, key };
}

async function supabaseRequest(path, options = {}) {
  const config = getSupabaseConfig();
  const response = await fetch(config.url + "/rest/v1/" + path, {
    method: options.method || "GET",
    headers: {
      "apikey": config.key,
      "Authorization": "Bearer " + config.key,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation"
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    console.error("Supabase request failed with status", response.status);
    const error = new Error("The database could not complete the request.");
    error.status = response.status >= 500 ? 502 : 400;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/donations") {
    const params = new URLSearchParams({
      select: "id,food_name,description,category,quantity,location,vegetarian,expires_at,created_at,status",
      status: "eq.available",
      order: "created_at.desc",
      or: "(expires_at.is.null,expires_at.gte." + new Date().toISOString() + ")"
    });
    const rows = await supabaseRequest("donations?" + params.toString());
    return sendJson(response, 200, { donations: rows });
  }

  if (request.method === "POST" && url.pathname === "/api/donations") {
    const body = await readJson(request);
    const foodName = requireText(body.foodName, "Food name", 100);
    const quantity = requireText(body.quantity, "Quantity", 100);
    const location = requireText(body.location, "Pickup area", 180);
    const contact = requireText(body.contact, "Donor contact details", 180);

    if (body.confirmHandling !== true) {
      const error = new Error("Please confirm that the food was handled appropriately and can be safely collected.");
      error.status = 400;
      throw error;
    }

    let expiresAt = null;
    if (body.expiresAt) {
      const parsedExpiry = Date.parse(body.expiresAt);
      if (Number.isNaN(parsedExpiry) || parsedExpiry <= Date.now()) {
        const error = new Error("Pickup deadline must be a future date and time.");
        error.status = 400;
        throw error;
      }
      expiresAt = new Date(parsedExpiry).toISOString();
    }

    const inserted = await supabaseRequest("donations", {
      method: "POST",
      body: {
        food_name: foodName,
        description: cleanText(body.description, 1000),
        category: cleanText(body.category, 60) || "Other",
        quantity,
        location,
        donor_contact: contact,
        vegetarian: body.vegetarian === true,
        expires_at: expiresAt,
        status: "available"
      }
    });

    const donation = Array.isArray(inserted) ? inserted[0] : null;
    if (!donation) {
      const error = new Error("The donation could not be saved.");
      error.status = 502;
      throw error;
    }
    const { donor_contact, ...publicDonation } = donation;
    return sendJson(response, 201, { donation: publicDonation });
  }

  if (request.method === "POST" && url.pathname === "/api/requests") {
    const body = await readJson(request);
    const donationId = requireText(body.donationId, "Donation", 80);
    const requesterName = requireText(body.requesterName, "Your name", 100);
    const requesterContact = requireText(body.requesterContact, "Your contact details", 180);

    const inserted = await supabaseRequest("food_requests", {
      method: "POST",
      body: {
        donation_id: donationId,
        requester_name: requesterName,
        requester_contact: requesterContact,
        message: cleanText(body.message, 500),
        status: "pending"
      }
    });

    return sendJson(response, 201, { request: Array.isArray(inserted) ? inserted[0] : null });
  }

  if (request.method === "POST" && url.pathname === "/api/contact") {
    const body = await readJson(request);
    const name = requireText(body.name, "Name", 100);
    const email = requireText(body.email, "Email address", 254);
    const message = requireText(body.message, "Message", 2000);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const error = new Error("Please enter a valid email address.");
      error.status = 400;
      throw error;
    }

    await supabaseRequest("contact_messages", {
      method: "POST",
      body: { name, email, message }
    });

    return sendJson(response, 201, { message: "Your message has been received." });
  }

  return sendJson(response, 404, { error: "Endpoint not found." });
}

const { createServer } = await import("node:http");
const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", "http://" + (request.headers.host || "localhost"));
  const headers = corsHeaders(request);

  if (headers === null) {
    return sendJson(response, 403, { error: "This website is not allowed to access the API." });
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, headers || {});
    return response.end();
  }

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    return sendJson(response, 200, {
      status: "ok",
      databaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    }, headers || {});
  }

  if (!requestUrl.pathname.startsWith("/api/")) {
    return sendJson(response, 404, { error: "Endpoint not found." }, headers || {});
  }

  if (request.method === "POST" && isRateLimited(request)) {
    return sendJson(response, 429, { error: "Too many submissions. Please try again in a minute." }, headers || {});
  }

  try {
    await handleApi(request, {
      writeHead(status, values) {
        response.writeHead(status, { ...values, ...(headers || {}) });
      },
      end: (...args) => response.end(...args)
    }, requestUrl);
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    if (status >= 500) console.error("FoodShare API error:", error.message);
    return sendJson(response, status, {
      error: status >= 500 ? "The service could not complete your request right now." : error.message
    }, headers || {});
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("FoodShare API listening on port " + PORT);
});

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) {
    if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(ip);
  }
}, RATE_WINDOW_MS).unref();
