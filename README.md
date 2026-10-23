# FoodShare

FoodShare is a beginner-friendly food sharing website. It has a plain HTML/CSS/JavaScript frontend and a small Node.js API.

## Project files

- index.html — website content and forms
- style.css — green theme and responsive layout
- script.js — connects forms and food cards to the API
- config.js — local API address (Vercel creates a production version during build)
- server.js — demo API that runs on Render
- render.yaml — Render service setup
- vercel.json and build.js — Vercel static-site build settings

## Run locally

1. Install Node.js from https://nodejs.org.
2. In VS Code, open this project folder.
3. Open a terminal in the project folder and run these commands:

   npm install
   npm start

4. Keep the backend terminal open. Visit http://localhost:10000/api/health to see if it is running.
5. Use the VS Code Live Server extension to open index.html.

The local config.js points the frontend at http://localhost:10000.

## Deploy the frontend to Vercel and API to Render

The GitHub repository must contain the project files before either service can deploy them.

### Render backend

1. Sign in at https://render.com.
2. Choose New, then Blueprint.
3. Connect the FoodShare GitHub repository and select the main branch.
4. Render reads render.yaml and creates the free foodshare-api web service.
5. After deployment, open the service URL and add /api/health. The response should show that the API is running.

### Vercel website

1. Sign in at https://vercel.com.
2. Choose Add New, then Project, and import the FoodShare GitHub repository.
3. Leave the root directory at the repository root. The included vercel.json sets the build and output folders.
4. Set this environment variable:
   - Name: FOODSHARE_API_URL
   - Value: your Render service URL, without /api/health
5. Deploy. The website will use the Render API address during the build.

If Vercel was deployed before you added FOODSHARE_API_URL, add it in Project Settings, Environment Variables, then redeploy.

## Demo limitations

This is a learning demo, not a real food donation service. The API stores donations, requests, and contact messages only in server memory. Render's free web services can sleep while idle, and the data is cleared when the service restarts or sleeps. The API does not have user accounts, a database, donor notifications, email delivery, image uploads, or administrative review. Do not enter real personal contact information or rely on listings for food-safety decisions.

For a real community service, connect a persistent database, authentication, authorization, moderation, and reliable donor/recipient notifications before collecting personal information or coordinating pickups. Keep private keys on the backend, never in frontend JavaScript.
