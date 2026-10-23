# FoodShare

FoodShare is a beginner-friendly food sharing website. The frontend is plain HTML and CSS; the project includes a small Node.js API for Render.

## Preview the website

1. Open this folder in VS Code.
2. Open index.html.
3. Right-click and choose Open with Live Server, or open index.html in your browser.

The browser forms remain demo-only until the frontend is connected to the deployed API.

## Deploy the backend on Render

1. Create a Supabase project.
2. In Supabase, open SQL Editor, paste and run schema.sql.
3. Push this project to GitHub.
4. In Render, choose New > Blueprint, select this GitHub repository, and approve the render.yaml blueprint.
5. Set the SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY values when Render asks. The service-role key belongs only in Render environment settings. Never put it in index.html, script.js, or a public GitHub file.
6. After Render finishes deploying, open https://YOUR-SERVICE.onrender.com/health. Confirm status is ok and databaseConfigured is true.

The API provides GET /api/donations, POST /api/donations, POST /api/requests, and POST /api/contact. Public donation responses omit donor contact details. Donation submission requires an explicit food-handling confirmation.

## Demo and hosting notes

This is a learning project, not a verified food-safety or production service. The API has basic input checks and rate limiting, but does not yet include user sign-in or donor/recipient dashboards. Render free web services may sleep when idle. Render free Postgres databases expire after 30 days, so FoodShare uses Supabase for the database instead.

