import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Heart,
  Home,
  ListMusic,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
} from 'lucide-react';

const API = '';
const STORAGE_KEYS = {
  favorites: 'musicflow:favorites',
  playlists: 'musicflow:playlists',
};

function readStorage(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

function uniqueById(tracks) {
  return Array.from(new Map(tracks.map((track) => [track.id, track])).values());
}

function App() {
  const audioRef = useRef(null);
  const [view, setView] = useState('home');
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState([]);
  const [queue, setQueue] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState(() => readStorage(STORAGE_KEYS.favorites, []));
  const [playlists, setPlaylists] = useState(() => readStorage(STORAGE_KEYS.playlists, [{ id: 'main', name: 'Мій плейлист', tracks: [] }]));
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const favoriteIds = useMemo(() => new Set(favorites.map((track) => track.id)), [favorites]);
  const mainPlaylist = playlists.find((playlist) => playlist.id === 'main') || { id: 'main', name: 'Мій плейлист', tracks: [] };

  useEffect(() => {
    writeStorage(STORAGE_KEYS.favorites, favorites);
  }, [favorites]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.playlists, playlists);
  }, [playlists]);

  useEffect(() => {
    loadFeatured();
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  async function loadFeatured(tag = '') {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/featured${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Не вдалося завантажити музику');
      setTracks(data.tracks || []);
      setQueue(data.tracks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function searchTracks(event) {
    event?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return loadFeatured();

    setLoading(true);
    setError('');
    setView('search');
    try {
      const res = await fetch(`${API}/api/search?q=${encodeURIComponent(trimmed)}&limit=30`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Пошук не спрацював');
      setTracks(data.tracks || []);
      setQueue(data.tracks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function playTrack(track, list = tracks) {
    setCurrentTrack(track);
    setQueue(list.length ? list : [track]);
    setIsPlaying(true);
    requestAnimationFrame(() => {
      audioRef.current?.play().catch(() => setIsPlaying(false));
    });
  }

  function togglePlay() {
    if (!currentTrack && tracks[0]) return playTrack(tracks[0], tracks);
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }

  function playNext() {
    if (!queue.length || !currentTrack) return;
    const index = queue.findIndex((track) => track.id === currentTrack.id);
    const next = queue[(index + 1) % queue.length];
    playTrack(next, queue);
  }

  function playPrev() {
    if (!queue.length || !currentTrack) return;
    const index = queue.findIndex((track) => track.id === currentTrack.id);
    const prev = queue[(index - 1 + queue.length) % queue.length];
    playTrack(prev, queue);
  }

  function toggleFavorite(track) {
    setFavorites((current) => {
      const exists = current.some((item) => item.id === track.id);
      return exists ? current.filter((item) => item.id !== track.id) : uniqueById([track, ...current]);
    });
  }

  function addToPlaylist(track) {
    setPlaylists((current) =>
      current.map((playlist) => {
        if (playlist.id !== 'main') return playlist;
        return { ...playlist, tracks: uniqueById([track, ...playlist.tracks]) };
      })
    );
  }

  function removeFromPlaylist(trackId) {
    setPlaylists((current) =>
      current.map((playlist) => {
        if (playlist.id !== 'main') return playlist;
        return { ...playlist, tracks: playlist.tracks.filter((track) => track.id !== trackId) };
      })
    );
  }

  function getVisibleTracks() {
    if (view === 'favorites') return favorites;
    if (view === 'playlist') return mainPlaylist.tracks;
    return tracks;
  }

  const visibleTracks = getVisibleTracks();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" onClick={() => setView('home')}>
          <div className="brand-icon"><Music2 size={22} /></div>
          <div>
            <strong>MusicFlow</strong>
            <span>free legal music</span>
          </div>
        </div>

        <nav className="nav">
          <button className={view === 'home' ? 'active' : ''} onClick={() => { setView('home'); loadFeatured(); }}>
            <Home size={18} /> Головна
          </button>
          <button className={view === 'favorites' ? 'active' : ''} onClick={() => setView('favorites')}>
            <Heart size={18} /> Улюблені
          </button>
          <button className={view === 'playlist' ? 'active' : ''} onClick={() => setView('playlist')}>
            <ListMusic size={18} /> Плейлист
          </button>
        </nav>

        <div className="genres">
          <p>Жанри</p>
          {['rock', 'pop', 'electronic', 'hiphop', 'ambient'].map((tag) => (
            <button key={tag} onClick={() => { setView('home'); loadFeatured(tag); }}>
              #{tag}
            </button>
          ))}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <form className="search" onSubmit={searchTracks}>
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Пошук треку, артиста або жанру..."
            />
          </form>
          <button className="primary-btn" onClick={searchTracks}>Шукати</button>
        </header>

        <section className="hero">
          <div>
            <span className="badge">Безкоштовний музичний сервіс</span>
            <h1>Слухай музику як у Spotify, але на легальних free-треках.</h1>
            <p>Пошук, плейлисти, улюблене, темний дизайн і плеєр знизу. Проєкт готовий для GitHub і Render.</p>
          </div>
          <div className="hero-card">
            <Music2 size={42} />
            <strong>{currentTrack ? currentTrack.title : 'Ready to play'}</strong>
            <span>{currentTrack ? currentTrack.artist : 'Choose any track'}</span>
          </div>
        </section>

        <section className="content-head">
          <div>
            <h2>{view === 'favorites' ? 'Улюблені треки' : view === 'playlist' ? mainPlaylist.name : view === 'search' ? 'Результати пошуку' : 'Популярне зараз'}</h2>
            <p>{visibleTracks.length ? `${visibleTracks.length} треків` : 'Поки немає треків'}</p>
          </div>
        </section>

        {error && (
          <div className="error-box">
            <strong>Помилка:</strong> {error}
            <p>Перевір, чи доданий JAMENDO_CLIENT_ID в Render Environment Variables.</p>
          </div>
        )}

        {loading ? (
          <div className="grid skeleton-grid">
            {Array.from({ length: 8 }).map((_, index) => <div className="skeleton-card" key={index} />)}
          </div>
        ) : visibleTracks.length ? (
          <div className="track-list">
            {visibleTracks.map((track, index) => (
              <div className={`track-row ${currentTrack?.id === track.id ? 'current' : ''}`} key={track.id}>
                <span className="track-index">{index + 1}</span>
                <button className="cover" onClick={() => playTrack(track, visibleTracks)}>
                  {track.image ? <img src={track.image} alt={track.title} /> : <Music2 />}
                  <span><Play size={18} /></span>
                </button>
                <div className="track-info" onClick={() => playTrack(track, visibleTracks)}>
                  <strong>{track.title}</strong>
                  <span>{track.artist}</span>
                </div>
                <div className="album-name">{track.album}</div>
                <div className="duration">{formatDuration(track.duration)}</div>
                <button className={favoriteIds.has(track.id) ? 'icon-btn liked' : 'icon-btn'} onClick={() => toggleFavorite(track)} title="Улюблене">
                  <Heart size={18} />
                </button>
                {view === 'playlist' ? (
                  <button className="icon-btn" onClick={() => removeFromPlaylist(track.id)} title="Видалити з плейлиста">
                    <Trash2 size={18} />
                  </button>
                ) : (
                  <button className="icon-btn" onClick={() => addToPlaylist(track)} title="Додати в плейлист">
                    <Plus size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Music2 size={38} />
            <h3>Тут поки пусто</h3>
            <p>Знайди трек через пошук або додай музику в улюблені.</p>
          </div>
        )}
      </main>

      <footer className="player">
        <div className="now-playing">
          <div className="mini-cover">
            {currentTrack?.image ? <img src={currentTrack.image} alt={currentTrack.title} /> : <Music2 />}
          </div>
          <div>
            <strong>{currentTrack?.title || 'Нічого не грає'}</strong>
            <span>{currentTrack?.artist || 'Вибери трек'}</span>
          </div>
        </div>

        <div className="controls">
          <div className="buttons">
            <button onClick={playPrev}><SkipBack size={18} /></button>
            <button className="play-main" onClick={togglePlay}>{isPlaying ? <Pause size={22} /> : <Play size={22} />}</button>
            <button onClick={playNext}><SkipForward size={18} /></button>
          </div>
          <div className="progress-wrap">
            <span>{formatDuration(progress)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={progress}
              onChange={(event) => {
                const time = Number(event.target.value);
                setProgress(time);
                if (audioRef.current) audioRef.current.currentTime = time;
              }}
            />
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        <div className="volume">
          <Volume2 size={18} />
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
        </div>
      </footer>

      <audio
        ref={audioRef}
        src={currentTrack?.audio || ''}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || currentTrack?.duration || 0)}
        onEnded={playNext}
      />
    </div>
  );
}

export default App;
