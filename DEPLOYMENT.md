# NeuralTrade Deployment Guide (Free Portfolio Setup)

This guide deploys NeuralTrade globally using free tiers:

- Frontend: Vercel
- Backend API: Render Web Service
- ML Service: Render Web Service
- Database: MongoDB Atlas M0
- OAuth: Google Cloud OAuth 2.0 (Google Sign-In)

---

## 1) Prerequisites

- GitHub repo with this project pushed
- Accounts:
  - Vercel
  - Render
  - MongoDB Atlas
  - Google Cloud Console

---

## 2) MongoDB Atlas (free M0)

1. Create an M0 cluster in Atlas.
2. Create a DB user (username/password).
3. Network Access:
   - For quick setup, allow `0.0.0.0/0` (all IPs).
4. Copy connection string:
   - `mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority`
5. Use DB name `trading` (or your own).

---

## 3) Deploy ML service on Render

1. Render -> New -> Web Service.
2. Connect GitHub repo.
3. Root directory: `ml-service`
4. Runtime: Python
5. Build command:
   - `pip install -r requirements.txt`
6. Start command:
   - `uvicorn main:app --host 0.0.0.0 --port $PORT`
7. Add env vars if needed (optional for ML):
   - `MONGODB_URI` (if ML uses Mongo ping/features)
8. Deploy and copy URL:
   - `https://<ml-service>.onrender.com`

Test:
- `https://<ml-service>.onrender.com/health`

---

## 4) Deploy backend API on Render

1. Render -> New -> Web Service.
2. Connect GitHub repo.
3. Root directory: `backend`
4. Runtime: Node
5. Build command:
   - `npm install`
6. Start command:
   - `npm start`
7. Add env vars:
   - `MONGODB_URI=<atlas connection string>`
   - `JWT_SECRET=<long random secret>`
   - `OPENAI_API_KEY=<optional>`
   - `ML_SERVICE_URL=https://<ml-service>.onrender.com`
   - `PORT=10000` (Render usually provides `PORT`; this is optional fallback)
   - `CORS_ORIGIN=https://<your-frontend-domain>`
   - `GOOGLE_CLIENT_ID=<google oauth client id>`
8. Deploy and copy URL:
   - `https://<backend-service>.onrender.com`

Test:
- `https://<backend-service>.onrender.com/health`

---

## 5) Deploy frontend on Vercel

1. Vercel -> New Project -> import your GitHub repo.
2. Framework: Vite (auto-detected)
3. Root directory: `frontend`
4. Build command:
   - `npm run build`
5. Output directory:
   - `dist`
6. Add env vars:
   - `VITE_API_BASE_URL=https://<backend-service>.onrender.com/api`
   - `VITE_ML_API_URL=https://<ml-service>.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID=<google oauth client id>`
7. Deploy and copy URL:
   - `https://<your-app>.vercel.app`

---

## 6) Google OAuth setup (fixes Gmail sign-in)

In Google Cloud Console:

1. Create/select project.
2. APIs & Services -> OAuth consent screen:
   - External
   - Fill app name/email
   - Add test users (if app in testing mode)
3. Credentials -> Create Credentials -> OAuth client ID.
4. Application type: Web application.
5. Add Authorized JavaScript origins:
   - `http://localhost:5173`
   - `http://localhost:5174`
   - `http://localhost:5175`
   - `https://<your-app>.vercel.app`
6. Add Authorized redirect URIs (safe defaults):
   - `https://<your-app>.vercel.app`
   - `http://localhost:5173`
   - `http://localhost:5174`
   - `http://localhost:5175`

Use the same client ID in:
- Backend: `GOOGLE_CLIENT_ID`
- Frontend: `VITE_GOOGLE_CLIENT_ID`

Then redeploy backend and frontend.

---

## 7) Update CORS after frontend URL is known

Set backend env:
- `CORS_ORIGIN=https://<your-app>.vercel.app`

Redeploy backend.

---

## 8) Verify production

1. Open Vercel URL.
2. Register/login with email/password.
3. Try Google sign-in.
4. Confirm:
   - Dashboard loads data
   - Trade executes
   - Portfolio updates
   - AI/Risk pages load
5. Check browser console for errors.

---

## 9) Free-tier caveats

- Render free services may sleep (cold starts).
- First request after idle can take ~30-60 seconds.
- Use UptimeRobot (free) to ping health endpoints every 5 minutes if desired.

---

## 10) Recommended custom domain (optional)

- Point domain to Vercel for frontend.
- Keep backend/ml on Render subdomains or map API subdomains later.
- Update:
  - `CORS_ORIGIN`
  - Google OAuth origins/redirects
  - Vercel env vars

