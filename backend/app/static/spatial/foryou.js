/* ==========================================================================
   VISIONCINE — FOR YOU PAGE CONTROLLER  (foryou.js)
   All logic for the personalised recommendation view (#view-for-you).
   Loaded after api.js and app.js.
   ========================================================================== */

'use strict';

/* ─── TMDB genre id → colour accent map ──────────────────────────────────── */
const GENRE_COLORS = {
    28: '#ef4444', 12: '#f97316', 16: '#a78bfa', 35: '#fbbf24',
    80: '#64748b', 99: '#22d3ee', 18: '#6366f1', 10751: '#10b981',
    14: '#8b5cf6', 36: '#d97706', 27: '#dc2626', 878: '#06b6d4',
    53: '#f43f5e', 10749: '#ec4899', 10402: '#a3e635',
};

const GENRE_NAMES = {
    28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',
    99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',
    27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',
    53:'Thriller',10752:'War',37:'Western',
};

/* ─── State ──────────────────────────────────────────────────────────────── */
const FY = {
    recommendations: [],
    trending: [],
    history: [],
    stats: null,
    heroIndex: 0,
    heroTimer: null,
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function fyPosterUrl(path, size = 'w342') {
    return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
function fyBackdropUrl(path) {
    return path ? `https://image.tmdb.org/t/p/original${path}` : null;
}
function fyYear(date) { return (date || '').substring(0, 4) || '—'; }
function fyRating(v) { return v ? parseFloat(v).toFixed(1) : '—'; }

/* ─── Skeleton helpers ────────────────────────────────────────────────────── */
function skeletonCards(n = 6, cls = 'fy-card') {
    return Array.from({ length: n }, () => `<div class="${cls} fy-skeleton"></div>`).join('');
}

/* ─── Render a single recommendation card ────────────────────────────────── */
function renderRecCard(m) {
    const poster = fyPosterUrl(m.poster_path);
    const year   = fyYear(m.release_date);
    const rating = fyRating(m.vote_average);
    const match  = m.match_score || Math.floor(60 + Math.random() * 39);
    const genres = (m.genre_names || m.genre_ids || [])
        .slice(0, 3)
        .map(g => `<span class="fy-genre-chip">${typeof g === 'string' ? g : (GENRE_NAMES[g] || '')}</span>`)
        .join('');
    const matchClass = match >= 85 ? 'match-high' : match >= 70 ? 'match-med' : 'match-low';

    return `
    <div class="fy-card" data-id="${m.id || m.tmdb_id}" data-title="${(m.title||'').replace(/"/g,'&quot;')}">
        <div class="fy-card-poster-wrap">
            ${poster
                ? `<img class="fy-card-poster" src="${poster}" alt="${m.title||''}" loading="lazy">`
                : `<div class="fy-card-poster fy-no-poster"><span>${(m.title||'?')[0]}</span></div>`}
            <div class="fy-match-badge ${matchClass}">${match}% Match</div>
        </div>
        <div class="fy-card-body">
            <h4 class="fy-card-title">${m.title || m.original_title || '—'}</h4>
            <div class="fy-card-meta">
                <span class="fy-year">${year}</span>
                <span class="fy-dot">·</span>
                <span class="fy-imdb">★ ${rating}</span>
            </div>
            <div class="fy-genres">${genres}</div>
            <div class="fy-card-actions">
                <button class="btn-primary fy-action-btn fy-trailer-btn"
                    data-id="${m.id || m.tmdb_id}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    Trailer
                </button>
                <button class="btn-ghost fy-action-btn fy-details-btn"
                    data-id="${m.id || m.tmdb_id}">Details</button>
            </div>
        </div>
    </div>`;
}

/* ─── Render a compact horizontal card ───────────────────────────────────── */
function renderHCard(m) {
    const poster = fyPosterUrl(m.poster_path, 'w185');
    return `
    <div class="fy-hcard" data-id="${m.id || m.tmdb_id}">
        ${poster
            ? `<img class="fy-hcard-img" src="${poster}" alt="${m.title||''}" loading="lazy">`
            : `<div class="fy-hcard-img fy-no-poster"><span>${(m.title||'?')[0]}</span></div>`}
        <div class="fy-hcard-info">
            <p class="fy-hcard-title">${m.title || m.original_title || '—'}</p>
            <p class="fy-hcard-year">${fyYear(m.release_date)}</p>
        </div>
    </div>`;
}

/* ─── Render continue-watching card with progress bar ────────────────────── */
function renderContinueCard(m, idx) {
    const poster   = fyPosterUrl(m.poster_path, 'w342');
    const progress = 20 + ((idx * 23) % 75); // deterministic fake progress
    return `
    <div class="fy-continue-card" data-id="${m.id || m.tmdb_id}">
        <div class="fy-continue-thumb">
            ${poster
                ? `<img src="${poster}" alt="${m.title||''}" loading="lazy">`
                : `<div class="fy-no-poster"><span>${(m.title||'?')[0]}</span></div>`}
            <div class="fy-continue-overlay">
                <svg class="fy-play-icon" viewBox="0 0 24 24" fill="currentColor" width="36" height="36"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
        </div>
        <div class="fy-continue-meta">
            <p class="fy-hcard-title">${m.title || m.original_title || '—'}</p>
            <div class="fy-progress-wrap">
                <div class="fy-progress-bar">
                    <div class="fy-progress-fill" style="width:${progress}%"></div>
                </div>
                <span class="fy-progress-pct">${progress}%</span>
            </div>
        </div>
    </div>`;
}

/* ─── Render genre card ────────────────────────────────────────────────────── */
function renderGenreCard(gid, score) {
    const name  = GENRE_NAMES[gid] || 'Genre';
    const color = GENRE_COLORS[gid] || '#6366f1';
    const emojis = { 28:'🔥',12:'🗺️',16:'✨',35:'😂',80:'🔫',18:'🎭',878:'🚀',53:'😱',10749:'❤️',27:'👻',14:'🧙',10402:'🎵' };
    const icon  = emojis[gid] || '🎬';
    return `
    <div class="fy-genre-card" style="--gc:${color}" data-genre-id="${gid}">
        <span class="fy-genre-icon">${icon}</span>
        <span class="fy-genre-name">${name}</span>
    </div>`;
}

/* ─── Render stat card ────────────────────────────────────────────────────── */
function renderStatCard(icon, label, value, accent = '#ffffff') {
    return `
    <div class="fy-stat-card">
        <div class="fy-stat-icon" style="color:${accent}">${icon}</div>
        <div class="fy-stat-value">${value}</div>
        <div class="fy-stat-label">${label}</div>
    </div>`;
}

/* ─── Hero carousel ─────────────────────────────────────────────────────────── */
function renderFyHero(movies) {
    if (!movies || movies.length === 0) return;
    FY.heroIndex = 0;
    clearInterval(FY.heroTimer);
    setFyHeroSlide(movies, 0);
    FY.heroTimer = setInterval(() => {
        FY.heroIndex = (FY.heroIndex + 1) % Math.min(movies.length, 5);
        setFyHeroSlide(movies, FY.heroIndex);
    }, 7000);
}

function setFyHeroSlide(movies, idx) {
    const m   = movies[idx];
    const bg  = fyBackdropUrl(m.backdrop_path || m.backdropPath);
    const el  = document.getElementById('fy-hero-bg');
    const ttl = document.getElementById('fy-hero-title');
    const sub = document.getElementById('fy-hero-sub');
    const match = m.match_score || Math.floor(75 + Math.random() * 24);

    if (el)  el.style.backgroundImage = bg ? `url(${bg})` : '';
    if (ttl) ttl.textContent = m.title || m.original_title || '';
    if (sub) sub.textContent = m.overview
        ? (m.overview.length > 160 ? m.overview.substring(0, 160) + '…' : m.overview)
        : '';

    const badge = document.getElementById('fy-hero-match');
    if (badge) badge.textContent = `${match}% Match`;

    const dots = document.querySelectorAll('.fy-hero-dot');
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));

    const heroTrailer = document.getElementById('fy-hero-trailer-btn');
    if (heroTrailer) {
        heroTrailer.dataset.tmdbId = m.id || m.tmdb_id;
        heroTrailer.dataset.title  = m.title || '';
    }
    const heroDetails = document.getElementById('fy-hero-details-btn');
    if (heroDetails) {
        heroDetails.dataset.tmdbId = m.id || m.tmdb_id;
    }
}

/* ─── Section renderers ────────────────────────────────────────────────────── */
function renderSection(gridId, cards) {
    const el = document.getElementById(gridId);
    if (!el) return;
    el.innerHTML = cards;
    // attach click handlers for fy-card and fy-hcard
    el.querySelectorAll('[data-id]').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.fy-trailer-btn')) return; // handled separately
            if (e.target.closest('.fy-action-btn')) return;
            const id = parseInt(card.dataset.id, 10);
            if (id) openDetailsOverlay(id);
        });
    });
    el.querySelectorAll('.fy-details-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id, 10);
            if (id) openDetailsOverlay(id);
        });
    });
    el.querySelectorAll('.fy-trailer-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id, 10);
            if (!id) return;
            try {
                const data = await API.fetchTMDB(`/movie/${id}/videos`);
                const t = (data.results || []).find(v => v.site === 'YouTube' && v.type === 'Trailer');
                const title = btn.closest('[data-title]')?.dataset.title || '';
                openTrailerOverlay(t ? t.key : null, title);
            } catch (_) { openTrailerOverlay(null, ''); }
        });
    });
}

/* ─── Main load function — called when switching to for-you view ─────────── */
async function loadForYouPage() {
    const username = STATE.user || API.getCurrentUser() || 'Cinephile';
    const greeting = document.getElementById('fy-greeting');
    if (greeting) greeting.textContent = `Welcome Back, ${username}`;

    // Show skeletons immediately
    const grids = ['fy-rec-grid','fy-because-grid','fy-continue-grid',
                   'fy-trending-grid','fy-picks-grid','fy-gems-grid',
                   'fy-similar-grid','fy-history-grid'];
    grids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = skeletonCards(6);
    });

    // Parallel data fetch
    const [recData, trendData, histData, statsData] = await Promise.allSettled([
        API.getRecommendations(),
        API.getTrending(),
        API.getHistory(),
        API.getStats(),
    ]);

    // ── Recommendations
    const recs = recData.status === 'fulfilled' ? (recData.value.results || []) : [];
    FY.recommendations = recs;

    const hasRatings = recData.status === 'fulfilled' ? recData.value.has_ratings : false;
    const noRatingsMsg = document.getElementById('fy-no-ratings-msg');
    if (noRatingsMsg) noRatingsMsg.classList.toggle('hidden', hasRatings || recs.length === 0);

    if (recs.length > 0) {
        renderFyHero(recs);
        renderSection('fy-rec-grid', recs.slice(0, 12).map(renderRecCard).join(''));
    } else {
        renderSection('fy-rec-grid', '<p class="fy-empty-msg">No recommendations yet. Rate some movies to get started!</p>');
    }

    // ── Trending
    const trending = trendData.status === 'fulfilled' ? (trendData.value.results || []) : [];
    FY.trending = trending;
    renderSection('fy-trending-grid', trending.slice(0, 12).map(renderRecCard).join(''));

    // ── History / Recently Viewed
    const history = histData.status === 'fulfilled' ? (histData.value.results || []) : [];
    FY.history = history;

    if (history.length > 0) {
        renderSection('fy-history-grid', history.slice(0, 8).map(renderHCard).join(''));
        renderSection('fy-continue-grid', history.slice(0, 6).map((m, i) => renderContinueCard(m, i)).join(''));
    } else {
        renderSection('fy-history-grid', '<p class="fy-empty-msg">No viewing history yet. Start watching!</p>');
        renderSection('fy-continue-grid', '<p class="fy-empty-msg">Nothing to continue yet.</p>');
    }

    // ── Because You Watched — picks from history[0] recommendations
    if (history.length > 0) {
        const baseId = history[0].tmdb_id || history[0].id;
        const baseTitle = history[0].title || '';
        const becauseLabel = document.getElementById('fy-because-label');
        if (becauseLabel) becauseLabel.textContent = `"${baseTitle}"`;
        try {
            const byw = await API.fetchTMDB(`/movie/${baseId}/recommendations`);
            const bywResults = (byw.results || []).slice(0, 12).map(m => ({
                ...m,
                match_score: Math.floor(65 + Math.random() * 30),
                genre_names: (m.genre_ids || []).map(g => GENRE_NAMES[g]).filter(Boolean),
            }));
            renderSection('fy-because-grid', bywResults.map(renderRecCard).join(''));
        } catch (_) {
            renderSection('fy-because-grid', trending.slice(6, 12).map(renderRecCard).join(''));
        }
    } else if (recs.length > 0) {
        const becauseLabel = document.getElementById('fy-because-label');
        if (becauseLabel) becauseLabel.textContent = 'Your Top Pick';
        renderSection('fy-because-grid', recs.slice(4, 10).map(renderRecCard).join(''));
    } else {
        renderSection('fy-because-grid', trending.slice(4, 10).map(renderRecCard).join(''));
    }

    // ── Top Picks — second half of recs or trending fallback
    const picks = recs.length >= 12 ? recs.slice(12, 20) : trending.slice(0, 8);
    renderSection('fy-picks-grid', picks.map(renderRecCard).join(''));

    // ── Hidden Gems — from top_rated, filter high vote_average
    try {
        const gemData = await API.fetchTMDB('/movie/top_rated');
        const gems = (gemData.results || [])
            .filter(m => m.vote_average >= 7.8 && m.popularity < 50)
            .slice(0, 12)
            .map(m => ({
                ...m,
                match_score: Math.floor(70 + Math.random() * 29),
                genre_names: (m.genre_ids || []).map(g => GENRE_NAMES[g]).filter(Boolean),
            }));
        renderSection('fy-gems-grid', gems.length > 0
            ? gems.map(renderRecCard).join('')
            : trending.slice(8, 14).map(renderRecCard).join(''));
    } catch (_) {
        renderSection('fy-gems-grid', trending.slice(8, 14).map(renderRecCard).join(''));
    }

    // ── Similar Users Loved — use /movie/popular as proxy for collaborative
    try {
        const popData = await API.fetchTMDB('/movie/popular?page=2');
        const similar = (popData.results || []).slice(0, 12).map(m => ({
            ...m,
            match_score: Math.floor(55 + Math.random() * 40),
            genre_names: (m.genre_ids || []).map(g => GENRE_NAMES[g]).filter(Boolean),
        }));
        renderSection('fy-similar-grid', similar.map(renderRecCard).join(''));
    } catch (_) {
        renderSection('fy-similar-grid', recs.slice(8, 14).map(renderRecCard).join(''));
    }

    // ── Stats
    const stats = statsData.status === 'fulfilled' ? statsData.value : null;
    FY.stats = stats;
    renderStats(stats);

    // ── Favourite Genres
    renderGenres(stats);
}

function renderStats(stats) {
    const grid = document.getElementById('fy-stats-grid');
    if (!grid) return;
    if (!stats) {
        grid.innerHTML = '<p class="fy-empty-msg">Log in to see your stats.</p>';
        return;
    }
    grid.innerHTML = [
        renderStatCard('🎬', 'Movies Rated',    stats.movies_rated || 0,    '#a78bfa'),
        renderStatCard('📚', 'Movies Saved',    stats.movies_saved || 0,    '#34d399'),
        renderStatCard('⭐', 'Avg Rating',      stats.average_rating || '—', '#fbbf24'),
        renderStatCard('🎭', 'Favourite Genre', stats.favorite_genre || '—', '#f472b6'),
        renderStatCard('⏱️', 'Hours Watched',   stats.hours_watched || 0,   '#60a5fa'),
        renderStatCard('👁️', 'Titles Viewed',   stats.history_count || 0,   '#f97316'),
    ].join('');
}

function renderGenres(stats) {
    const grid = document.getElementById('fy-genre-grid');
    if (!grid) return;
    if (!stats || !stats.top_genres || stats.top_genres.length === 0) {
        // Show popular genre defaults
        const defaults = [28, 878, 18, 53, 80];
        grid.innerHTML = defaults.map(id => renderGenreCard(id, 1)).join('');
        return;
    }
    grid.innerHTML = stats.top_genres.map(g => renderGenreCard(g.id, g.score)).join('');
}

/* ─── Nav wiring (called from app.js after login) ───────────────────────── */
function initForYouNav() {
    const btn = document.getElementById('nav-foryou-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            showView(document.getElementById('view-for-you'));
            loadForYouPage();
        });
    }

    // Hero buttons
    const heroTrailer = document.getElementById('fy-hero-trailer-btn');
    if (heroTrailer) {
        heroTrailer.addEventListener('click', async () => {
            const id    = heroTrailer.dataset.tmdbId;
            const title = heroTrailer.dataset.title || '';
            if (!id) return;
            try {
                const data = await API.fetchTMDB(`/movie/${id}/videos`);
                const t = (data.results || []).find(v => v.site === 'YouTube' && v.type === 'Trailer');
                openTrailerOverlay(t ? t.key : null, title);
            } catch (_) { openTrailerOverlay(null, title); }
        });
    }

    const heroDetails = document.getElementById('fy-hero-details-btn');
    if (heroDetails) {
        heroDetails.addEventListener('click', () => {
            const id = parseInt(heroDetails.dataset.tmdbId, 10);
            if (id) openDetailsOverlay(id);
        });
    }

    // Hero dots
    document.querySelectorAll('.fy-hero-dot').forEach((dot, i) => {
        dot.addEventListener('click', () => {
            FY.heroIndex = i;
            setFyHeroSlide(FY.recommendations.length > 0 ? FY.recommendations : FY.trending, i);
        });
    });
}
