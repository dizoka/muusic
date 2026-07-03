# Free MusicFlow

Spotify-like web app for free legal music streaming.  
Frontend: React + Vite.  
Backend: Node.js + Express.  
Music source: Jamendo API.

## Features

- Search tracks by name, artist, genre, or mood
- Play / pause / next / previous
- Volume and progress controls
- Favorites saved in browser localStorage
- Personal playlist saved in browser localStorage
- Dark Spotify-like UI
- One-repo deployment to Render

## Important

This project does **not** pirate Spotify music. It uses legal free tracks from Jamendo.  
You need a free Jamendo Client ID.

Get it here:

https://devportal.jamendo.com/

## Project structure

```txt
free-musicflow/
  client/              React + Vite frontend
  server/              Express backend/API proxy
  render.yaml          Render deployment config
  package.json         Root server/build scripts
  .env.example         Example environment variables
```

## Local setup

### 1. Install dependencies

```bash
npm install
npm --prefix client install
```

### 2. Create `.env`

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then add your Jamendo Client ID:

```env
JAMENDO_CLIENT_ID=your_real_client_id_here
PORT=10000
```

### 3. Run in development

```bash
npm run dev
```

Frontend:

```txt
http://localhost:5173
```

Backend:

```txt
http://localhost:10000
```

### 4. Production build locally

```bash
npm run build
npm start
```

Open:

```txt
http://localhost:10000
```

## Upload to GitHub

```bash
git init
git add .
git commit -m "Initial MusicFlow app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/free-musicflow.git
git push -u origin main
```

## Deploy to Render

### Option A: using `render.yaml`

1. Push this repo to GitHub.
2. Open Render Dashboard.
3. Click **New +**.
4. Choose **Blueprint**.
5. Connect your GitHub repo.
6. Render will read `render.yaml`.
7. Add Environment Variable:

```txt
JAMENDO_CLIENT_ID=your_real_client_id_here
```

8. Deploy.

### Option B: manual Web Service

1. Open Render Dashboard.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repo.
4. Use these settings:

```txt
Environment: Node
Build Command: npm install && npm run build
Start Command: npm start
```

5. Add Environment Variable:

```txt
JAMENDO_CLIENT_ID=your_real_client_id_here
```

6. Deploy.

## API endpoints

```txt
GET /api/health
GET /api/featured
GET /api/featured?tag=rock
GET /api/search?q=lofi
GET /api/track/:id
```

## Notes

- Favorites and playlists are saved locally in the user's browser.
- For real accounts/login, add Supabase or MongoDB later.
- For uploading your own music, add file storage later.
