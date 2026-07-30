# Vercel Deployment Guide

This project is configured to deploy directly to **Vercel** with full Server-Side Rendering (SSR) and server functions powered by TanStack Start and Nitro, communicating **directly with official Google Sheets API v4**.

---

## 🔐 Google Sheets Authentication

You can authenticate using either a **Service Account (Recommended)** or an **API Key**.

### Method 1: Google Service Account (Recommended for Private Sheets)

1. Open your Service Account JSON credentials file downloaded from Google Cloud Console.
2. Share your Google Sheet with the `client_email` address (e.g., `your-sa@project.iam.gserviceaccount.com`) as **Editor**.
3. In Vercel Project Settings -> **Environment Variables**, set:
   - `GOOGLE_SHEET_ID`: Your Google Sheet ID
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: `client_email` from JSON
   - `GOOGLE_PRIVATE_KEY`: `private_key` from JSON (include `-----BEGIN PRIVATE KEY-----...`)
   - `ADMIN_CODE`: Admin passcode (e.g. `2727`)

---

### Method 2: Google Sheets API Key

1. Share your Google Sheet as **"Anyone with link can edit"**.
2. In Vercel Project Settings -> **Environment Variables**, set:
   - `GOOGLE_SHEET_ID`: Your Google Sheet ID
   - `GOOGLE_SHEETS_API_KEY`: Your API Key (starts with `AIzaSy...`)
   - `ADMIN_CODE`: Admin passcode (e.g. `2727`)

---

## 🚀 Deployment Steps

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Add Google Service Account authentication"
   git push origin main
   ```
2. Import project into [Vercel Dashboard](https://vercel.com/new).
3. Set your environment variables in **Settings -> Environment Variables**.
4. Click **Deploy**.
