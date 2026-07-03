import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;
const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;
const JAMENDO_BASE_URL = 'https://api.jamendo.com/v3.0';

app.use(express.json());
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

const cache = new Map();
const CACHE_TIME_MS = 1000 * 60 * 10;

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.createdAt > CACHE_TIME_MS) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data) {
  cache.set(key, { data, createdAt: Date.now() });
}

function normalizeTrack(track) {
  return {
    id: String(track.id),
    title: track.name || 'Unknown track',
    artist: track.artist_name || 'Unknown artist',
    album: track.album_name || 'Single',
    duration: Number(track.duration || 0),
    image: track.image || track.album_image || '',
    audio: track.audio || track.audiodownload || '',
    audiodownloadAllowed: Boolean(track.audiodownload_allowed),
    license: track.license_ccurl || '',
    shareUrl: track.shareurl || '',
    releasedate: track.releasedate || '',
  };
}

async function jamendoRequest(endpoint, params = {}) {
  if (!JAMENDO_CLIENT_ID || JAMENDO_CLIENT_ID === 'your_jamendo_client_id_here') {
    const error = new Error('JAMENDO_CLIENT_ID is missing. Add it in Render Environment Variables or .env locally.');
    error.status = 500;
    throw error;
  }

  const url = new URL(`${JAMENDO_BASE_URL}${endpoint}`);
  url.searchParams.set('client_id', JAMENDO_CLIENT_ID);
  url.searchParams.set('format', 'json');

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const cacheKey = url.toString();
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Jamendo API error: ${response.status} ${text}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  setCached(cacheKey, data);
  return data;
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'Free MusicFlow',
    jamendoConfigured: Boolean(JAMENDO_CLIENT_ID && JAMENDO_CLIENT_ID !== 'your_jamendo_client_id_here'),
  });
});

app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const offset = Math.max(Number(req.query.offset || 0), 0);

    const data = await jamendoRequest('/tracks/', {
      search: q || undefined,
      limit,
      offset,
      include: 'musicinfo',
      audioformat: 'mp32',
      imagesize: 300,
      order: q ? 'relevance' : 'popularity_total',
      type: 'single albumtrack',
    });

    const tracks = Array.isArray(data.results) ? data.results.map(normalizeTrack).filter((track) => track.audio) : [];
    res.json({ tracks, total: data.headers?.results_count || tracks.length });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Search failed' });
  }
});

app.get('/api/featured', async (req, res) => {
  try {
    const tag = String(req.query.tag || '').trim();
    const data = await jamendoRequest('/tracks/', {
      limit: 24,
      include: 'musicinfo',
      audioformat: 'mp32',
      imagesize: 300,
      order: 'popularity_total',
      tags: tag || undefined,
      type: 'single albumtrack',
    });

    const tracks = Array.isArray(data.results) ? data.results.map(normalizeTrack).filter((track) => track.audio) : [];
    res.json({ tracks });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Featured tracks failed' });
  }
});

app.get('/api/track/:id', async (req, res) => {
  try {
    const data = await jamendoRequest('/tracks/', {
      id: req.params.id,
      include: 'musicinfo',
      audioformat: 'mp32',
      imagesize: 600,
      type: 'single albumtrack',
    });

    const track = Array.isArray(data.results) && data.results[0] ? normalizeTrack(data.results[0]) : null;
    if (!track) return res.status(404).json({ message: 'Track not found' });
    res.json({ track });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Track failed' });
  }
});

const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Free MusicFlow is running on port ${PORT}`);
});
