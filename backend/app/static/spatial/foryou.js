/* ==========================================================================
   VISIONCINE — FOR YOU PAGE CONTROLLER (foryou.js)
   All logic for the personalised recommendation view (#view-for-you).
   Includes AI Movie Concierge Questionnaire.
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
    questionnaire: {
        currentStep: 1,
        totalSteps: 8,
        answers: {
            mood: '',
            genres: [],
            theme: '',
            companions: '',
            language: '',
            length: '',
            release: '',
            ending: ''
        }
    }
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function fyPosterUrl(path, size = 'w342') { return path ? `https://image.tmdb.org/t/p/${size}${path}` : null; }
function fyBackdropUrl(path) { return path ? `https://image.tmdb.org/t/p/original${path}` : null; }
function fyYear(date) { return (date || '').substring(0, 4) || '—'; }
function fyRating(v) { return v ? parseFloat(v).toFixed(1) : '—'; }

/* ─── Skeleton helpers ────────────────────────────────────────────────────── */
function skeletonCards(n = 6, cls = 'fy-card') {
    return Array.from({ length: n }, () => `<div class="${cls} fy-skeleton"></div>`).join('');
}

/* ─── Questionnaire Logic ─────────────────────────────────────────────────── */
const Q_DATA = {
    mood: ['Happy', 'Relaxed', 'Excited', 'Romantic', 'Emotional', 'Curious', 'Adventurous', 'Scared', 'Inspired', 'Nostalgic', 'Stressed', 'Surprise Me'],
    genres: Object.values(GENRE_NAMES),
    theme: ['Friendship', 'Love', 'Revenge', 'Space', 'Time Travel', 'Artificial Intelligence', 'Superheroes', 'Magic', 'Psychological', 'Detective', 'Mafia', 'Survival', 'Sports', 'Coming of Age', 'True Story', 'Post Apocalyptic', 'Crime Investigation', 'Military', 'Political', 'Mythology'],
    companions: ['Myself', 'Friends', 'Partner', 'Family', 'Kids'],
    language: ['English', 'Tamil', 'Hindi', 'Korean', 'Japanese', 'French', 'Spanish', 'Any Language'],
    length: ['Under 90 Minutes', '90–120 Minutes', 'More Than 2 Hours', 'Any Length'],
    release: ['Latest', 'Classic', 'Mix Both'],
    ending: ['Happy', 'Emotional', 'Unexpected Twist', 'Dark', 'Open Ending', 'No Preference']
};

function renderQuestionnaireCard(label, type) {
    // Elegant SVG icon placeholder
    const icon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`;
    return `<div class="selection-card" data-type="${type}" data-val="${label}">
        <div class="selection-icon">${icon}</div>
        <div class="selection-label">${label}</div>
    </div>`;
}

function initQuestionnaire() {
    FY.questionnaire.currentStep = 1;
    FY.questionnaire.answers = { mood: '', genres: [], theme: '', companions: '', language: '', length: '', release: '', ending: '' };
    
    document.getElementById('fy-grid-mood').innerHTML = Q_DATA.mood.map(v => renderQuestionnaireCard(v, 'mood')).join('');
    document.getElementById('fy-grid-genres').innerHTML = Q_DATA.genres.map(v => renderQuestionnaireCard(v, 'genres')).join('');
    document.getElementById('fy-grid-theme').innerHTML = Q_DATA.theme.map(v => renderQuestionnaireCard(v, 'theme')).join('');
    document.getElementById('fy-grid-companions').innerHTML = Q_DATA.companions.map(v => renderQuestionnaireCard(v, 'companions')).join('');
    document.getElementById('fy-grid-language').innerHTML = Q_DATA.language.map(v => renderQuestionnaireCard(v, 'language')).join('');
    document.getElementById('fy-grid-length').innerHTML = Q_DATA.length.map(v => renderQuestionnaireCard(v, 'length')).join('');
    document.getElementById('fy-grid-release').innerHTML = Q_DATA.release.map(v => renderQuestionnaireCard(v, 'release')).join('');
    document.getElementById('fy-grid-ending').innerHTML = Q_DATA.ending.map(v => renderQuestionnaireCard(v, 'ending')).join('');

    document.querySelectorAll('.selection-card').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.type;
            const val = card.dataset.val;
            
            if (type === 'genres') {
                card.classList.toggle('selected');
                const idx = FY.questionnaire.answers.genres.indexOf(val);
                if (idx > -1) FY.questionnaire.answers.genres.splice(idx, 1);
                else FY.questionnaire.answers.genres.push(val);
            } else {
                document.querySelectorAll(`.selection-card[data-type="${type}"]`).forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                FY.questionnaire.answers[type] = val;
                setTimeout(nextQuestionnaireStep, 300);
            }
        });
    });

    updateQuestionnaireUI();
}

// Attach to window so onclick="nextQuestionnaireStep()" works from HTML
window.nextQuestionnaireStep = async function() {
    if (FY.questionnaire.currentStep < FY.questionnaire.totalSteps) {
        FY.questionnaire.currentStep++;
        updateQuestionnaireUI();
    } else {
        document.getElementById('fy-q-progress-bar').style.width = `100%`;
        await completeQuestionnaire();
    }
}

function updateQuestionnaireUI() {
    for (let i = 1; i <= FY.questionnaire.totalSteps; i++) {
        const step = document.getElementById(`fy-step-${i}`);
        if (step) step.classList.toggle('hidden', i !== FY.questionnaire.currentStep);
    }
    const pct = ((FY.questionnaire.currentStep - 1) / FY.questionnaire.totalSteps) * 100;
    document.getElementById('fy-q-progress-bar').style.width = `${pct}%`;
}

async function completeQuestionnaire() {
    document.getElementById('fy-questionnaire').classList.add('hidden');
    document.getElementById('fy-results').classList.remove('hidden');
    await loadForYouResults();
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
    
    let reasonHtml = '';
    if (m.recommendation_reason) {
        reasonHtml = `<div class="fy-rec-reason"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> ${m.recommendation_reason}</div>`;
    }

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
                <span class="fy-imdb">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right:2px"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    ${rating}
                </span>
            </div>
            <div class="fy-genres">${genres}</div>
            ${reasonHtml}
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

function renderContinueCard(m, idx) {
    const poster   = fyPosterUrl(m.poster_path, 'w342');
    const progress = 20 + ((idx * 23) % 75); 
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

/* ─── Render genre card (No Emojis) ────────────────────────────────────────── */
function renderGenreCard(gid, score) {
    const name  = GENRE_NAMES[gid] || 'Genre';
    const color = GENRE_COLORS[gid] || '#6366f1';
    const iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
    
    return `
    <div class="fy-genre-card" style="--gc:${color}" data-genre-id="${gid}">
        <span class="fy-genre-icon">${iconSvg}</span>
        <span class="fy-genre-name">${name}</span>
    </div>`;
}

/* ─── Render stat card (No Emojis) ────────────────────────────────────────── */
function renderStatCard(iconSvg, label, value, accent = '#ffffff') {
    return `
    <div class="fy-stat-card">
        <div class="fy-stat-icon" style="color:${accent}">${iconSvg}</div>
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

function renderSection(gridId, cards) {
    const el = document.getElementById(gridId);
    if (!el) return;
    el.innerHTML = cards;
    el.querySelectorAll('[data-id]').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.fy-trailer-btn') || e.target.closest('.fy-action-btn')) return;
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

/* ─── Fetch and Render Results ───────────────────────────────────────────── */
async function loadForYouResults() {
    const username = STATE.user || API.getCurrentUser() || 'Cinephile';
    const greeting = document.getElementById('fy-greeting');
    if (greeting) greeting.textContent = `Welcome Back, ${username}`;

    const grids = ['fy-rec-grid','fy-because-grid','fy-continue-grid',
                   'fy-trending-grid','fy-picks-grid','fy-gems-grid',
                   'fy-similar-grid','fy-history-grid'];
    grids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = skeletonCards(6);
    });

    const [recData, trendData, histData, statsData] = await Promise.allSettled([
        API.submitMoodQuestionnaire(FY.questionnaire.answers),
        API.getTrending(),
        API.getHistory(),
        API.getStats(),
    ]);

    const recs = recData.status === 'fulfilled' ? (recData.value.results || []) : [];
    FY.recommendations = recs;

    if (recs.length > 0) {
        renderFyHero(recs);
        renderSection('fy-rec-grid', recs.slice(0, 12).map(renderRecCard).join(''));
    } else {
        renderSection('fy-rec-grid', '<p class="fy-empty-msg">No recommendations found for this mood.</p>');
    }

    const trending = trendData.status === 'fulfilled' ? (trendData.value.results || []) : [];
    FY.trending = trending;
    renderSection('fy-trending-grid', trending.slice(0, 12).map(renderRecCard).join(''));

    const history = histData.status === 'fulfilled' ? (histData.value.results || []) : [];
    FY.history = history;

    if (history.length > 0) {
        renderSection('fy-history-grid', history.slice(0, 8).map(renderHCard).join(''));
        renderSection('fy-continue-grid', history.slice(0, 6).map((m, i) => renderContinueCard(m, i)).join(''));
        
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
    } else {
        renderSection('fy-history-grid', '<p class="fy-empty-msg">No viewing history yet. Start watching!</p>');
        renderSection('fy-continue-grid', '<p class="fy-empty-msg">Nothing to continue yet.</p>');
        const becauseLabel = document.getElementById('fy-because-label');
        if (becauseLabel) becauseLabel.textContent = 'Your Top Pick';
        renderSection('fy-because-grid', recs.slice(4, 10).map(renderRecCard).join(''));
    }

    const picks = recs.length >= 12 ? recs.slice(12, 20) : trending.slice(0, 8);
    renderSection('fy-picks-grid', picks.map(renderRecCard).join(''));

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
        renderSection('fy-gems-grid', gems.length > 0 ? gems.map(renderRecCard).join('') : trending.slice(8, 14).map(renderRecCard).join(''));
    } catch (_) {
        renderSection('fy-gems-grid', trending.slice(8, 14).map(renderRecCard).join(''));
    }

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

    const stats = statsData.status === 'fulfilled' ? statsData.value : null;
    FY.stats = stats;
    renderStats(stats);
    renderGenres(stats);
}

function renderStats(stats) {
    const grid = document.getElementById('fy-stats-grid');
    if (!grid) return;
    if (!stats) {
        grid.innerHTML = '<p class="fy-empty-msg">Log in to see your stats.</p>';
        return;
    }
    
    const i1 = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`;
    const i2 = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
    const i3 = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    const i4 = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="6.5"/></svg>`;
    const i5 = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    const i6 = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

    grid.innerHTML = [
        renderStatCard(i1, 'Movies Rated',    stats.movies_rated || 0,    '#a78bfa'),
        renderStatCard(i2, 'Movies Saved',    stats.movies_saved || 0,    '#34d399'),
        renderStatCard(i3, 'Avg Rating',      stats.average_rating || '—', '#fbbf24'),
        renderStatCard(i4, 'Favourite Genre', stats.favorite_genre || '—', '#f472b6'),
        renderStatCard(i5, 'Hours Watched',   stats.hours_watched || 0,   '#60a5fa'),
        renderStatCard(i6, 'Titles Viewed',   stats.history_count || 0,   '#f97316'),
    ].join('');
}

function renderGenres(stats) {
    const grid = document.getElementById('fy-genre-grid');
    if (!grid) return;
    if (!stats || !stats.top_genres || stats.top_genres.length === 0) {
        const defaults = [28, 878, 18, 53, 80];
        grid.innerHTML = defaults.map(id => renderGenreCard(id, 1)).join('');
        return;
    }
    grid.innerHTML = stats.top_genres.map(g => renderGenreCard(g.id, g.score)).join('');
}

/* ─── Nav wiring ───────────────────────── */
function initForYouNav() {
    const btn = document.getElementById('nav-foryou-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            showView(document.getElementById('view-for-you'));
            document.getElementById('fy-results').classList.add('hidden');
            document.getElementById('fy-questionnaire').classList.remove('hidden');
            initQuestionnaire();
        });
    }

    const restartBtn = document.getElementById('fy-restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            document.getElementById('fy-results').classList.add('hidden');
            document.getElementById('fy-questionnaire').classList.remove('hidden');
            initQuestionnaire();
        });
    }

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

    document.querySelectorAll('.fy-hero-dot').forEach((dot, i) => {
        dot.addEventListener('click', () => {
            FY.heroIndex = i;
            setFyHeroSlide(FY.recommendations.length > 0 ? FY.recommendations : FY.trending, i);
        });
    });

    const aiFab = document.getElementById('ai-fab');
    const aiPanel = document.getElementById('ai-panel');
    const aiClose = document.getElementById('ai-panel-close');

    if (aiFab) {
        aiFab.addEventListener('click', () => {
            aiPanel.classList.toggle('hidden');
        });
    }
    if (aiClose) {
        aiClose.addEventListener('click', () => {
            aiPanel.classList.add('hidden');
        });
    }

    document.querySelectorAll('.ai-suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const msg = btn.textContent;
            const body = document.querySelector('.ai-panel-body');
            body.innerHTML += `<p class="ai-msg ai-msg-user">${msg}</p>`;
            body.innerHTML += `<p class="ai-msg ai-msg-bot">Let me analyse your preferences to find the perfect match for "${msg}"... Please check the For You section for updated results.</p>`;
            body.scrollTop = body.scrollHeight;
        });
    });
}
