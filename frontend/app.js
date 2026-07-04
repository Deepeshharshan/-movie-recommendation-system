/* ==========================================================================
   VISIONCINE — APPLICATION CONTROLLER
   ========================================================================== */

'use strict';

// ─── Global State ─────────────────────────────────────────────────────────────
const STATE = {
    user:           null,
    currentFilter:  'all',
    heroMovieId:    null,
    heroTrailerKey: null,
    activeMovieId:  null,
    activeMovieData: null,
    allMovies:      [],
    watchlist:      JSON.parse(localStorage.getItem('vc_watchlist') || '[]'),
    activityLog:    JSON.parse(localStorage.getItem('vc_activity_log') || '[]'),
    sessionStart:   null,
    eventCounter:   parseInt(localStorage.getItem('vc_event_counter') || '4000', 10),
};

// ─── DOM References ────────────────────────────────────────────────────────────
const DOM = {
    // Views
    viewAuth:      document.getElementById('view-auth'),
    viewDashboard: document.getElementById('view-dashboard'),
    viewProfile:   document.getElementById('view-profile'),

    // Auth
    authForm:        document.getElementById('auth-form'),
    authMode:        document.getElementById('auth-mode'),
    authTitle:       document.getElementById('auth-title'),
    authSubtitle:    document.getElementById('auth-subtitle'),
    authAlert:       document.getElementById('auth-alert'),
    authSubmit:      document.getElementById('auth-submit'),
    authBtnLabel:    document.getElementById('auth-btn-label'),
    authSpinner:     document.getElementById('auth-spinner'),
    authToggleBtn:   document.getElementById('auth-toggle-btn'),
    authToggleMsg:   document.getElementById('auth-toggle-msg'),
    inpUsername:     document.getElementById('inp-username'),
    inpPassword:     document.getElementById('inp-password'),

    // Navbar
    mainNav:         document.getElementById('main-nav'),
    navAvatar:       document.getElementById('nav-avatar'),
    navProfileBtn:   document.getElementById('nav-profile-btn'),
    navLogoutBtn:    document.getElementById('nav-logout-btn'),
    searchInput:     document.getElementById('search-input'),

    // Dashboard
    heroSection:     document.getElementById('hero-section'),
    heroBg:          document.getElementById('hero-bg'),
    heroBadge:       document.getElementById('hero-badge'),
    heroTitle:       document.getElementById('hero-title'),
    heroDesc:        document.getElementById('hero-desc'),
    heroTrailerBtn:  document.getElementById('hero-trailer-btn'),
    heroInfoBtn:     document.getElementById('hero-info-btn'),
    filterRail:      document.getElementById('filter-rail'),
    sectionLabel:    document.getElementById('section-label'),
    sectionCount:    document.getElementById('section-count'),
    movieGrid:       document.getElementById('movie-grid'),
    
    // For You Section
    foryouSection:   document.getElementById('foryou-section'),
    foryouLabel:     document.getElementById('foryou-label'),
    foryouGrid:      document.getElementById('foryou-grid'),

    // Profile
    profileBackBtn:  document.getElementById('profile-back-btn'),
    profileAvLg:     document.getElementById('profile-avatar-lg'),
    profileName:     document.getElementById('profile-display-name'),
    diagTier:        document.getElementById('diag-tier'),
    diagToken:       document.getElementById('diag-token'),
    statEvents:      document.getElementById('stat-events'),
    statSaved:       document.getElementById('stat-saved'),
    diagSessionStart: document.getElementById('diag-session-start'),
    activityLogBody: document.getElementById('activity-log-body'),
    clearLogBtn:     document.getElementById('clear-log-btn'),
    libraryGrid:     document.getElementById('library-grid'),
    libraryCount:    document.getElementById('library-count'),

    // Trailer Overlay
    trailerOverlay:  document.getElementById('trailer-overlay'),
    trailerIframe:   document.getElementById('trailer-iframe'),
    trailerPlaceholder: document.getElementById('trailer-placeholder'),
    trailerTitleLabel: document.getElementById('trailer-title-label'),
    trailerCloseBtn: document.getElementById('trailer-close-btn'),
    trailerBackdrop: document.getElementById('trailer-backdrop'),

    // Details Overlay
    detailsOverlay:  document.getElementById('details-overlay'),
    detailsCloseBtn: document.getElementById('details-close-btn'),
    detailsBackdrop: document.getElementById('details-backdrop'),
    detailsPoster:   document.getElementById('details-poster'),
    detailsTitle:    document.getElementById('details-title'),
    detailsYear:     document.getElementById('details-year'),
    detailsRuntime:  document.getElementById('details-runtime'),
    detailsRating:   document.getElementById('details-rating'),
    detailsGenres:   document.getElementById('details-genres'),
    detailsOverview: document.getElementById('details-overview'),
    detailsCastSection: document.getElementById('details-cast-section'),
    detailsCastRow:  document.getElementById('details-cast-row'),
    detailsTrailerBtn: document.getElementById('details-trailer-btn'),
    detailsSaveBtn:  document.getElementById('details-save-btn'),
    rateSelect:      document.getElementById('rate-select'),
    rateSubmitBtn:   document.getElementById('rate-submit-btn'),

    toastLayer:      document.getElementById('toast-layer'),
};

// ─── Toast Notification System ─────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3200) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-dot"></div><span>${message}</span>`;
    DOM.toastLayer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

// ─── Auth Alert (inline within auth card) ─────────────────────────────────────
function showAuthAlert(message, type = 'error') {
    DOM.authAlert.textContent = message;
    DOM.authAlert.className = `auth-alert ${type}`;
    DOM.authAlert.classList.remove('hidden');
}

function clearAuthAlert() {
    DOM.authAlert.classList.add('hidden');
    DOM.authAlert.className = 'auth-alert hidden';
}

// ─── View Router ───────────────────────────────────────────────────────────────
function showView(viewEl) {
    [DOM.viewAuth, DOM.viewDashboard, DOM.viewProfile].forEach(v => {
        v.classList.remove('active');
        v.classList.add('hidden');
    });
    viewEl.classList.remove('hidden');
    requestAnimationFrame(() => viewEl.classList.add('active'));
}

// ─── Activity Log ──────────────────────────────────────────────────────────────
function recordEvent(type, reference, metric = '—') {
    STATE.eventCounter++;
    localStorage.setItem('vc_event_counter', STATE.eventCounter);

    const event = {
        id:        STATE.eventCounter,
        type,
        reference,
        metric,
        timestamp: new Date().toISOString(),
    };

    STATE.activityLog.unshift(event);
    if (STATE.activityLog.length > 100) STATE.activityLog.pop();
    localStorage.setItem('vc_activity_log', JSON.stringify(STATE.activityLog));
}

function renderActivityLog() {
    if (STATE.activityLog.length === 0) {
        DOM.activityLogBody.innerHTML = `<tr class="log-empty-row"><td colspan="5">No interaction events recorded in this session.</td></tr>`;
        return;
    }
    DOM.activityLogBody.innerHTML = STATE.activityLog.map(e => {
        let badgeClass = 'view';
        if (e.type.includes('AUTH')) badgeClass = 'auth';
        if (e.type.includes('RATING')) badgeClass = 'rating';
        if (e.type.includes('LIBRARY')) badgeClass = 'library';
        if (e.type.includes('SEARCH')) badgeClass = 'search';

        return `
        <tr>
            <td class="log-event-id">${e.id}</td>
            <td><span class="log-type-badge ${badgeClass}">${e.type}</span></td>
            <td class="log-reference">${e.reference}</td>
            <td class="log-metric">${e.metric}</td>
            <td class="log-timestamp">${e.timestamp}</td>
        </tr>
        `;
    }).join('');
}

// ─── Watchlist / Saved Library ─────────────────────────────────────────────────
function isInWatchlist(tmdbId) {
    return STATE.watchlist.some(m => m.id === tmdbId);
}

function saveToLibrary(movie) {
    if (isInWatchlist(movie.id)) {
        showToast('Title already in your library.', 'info');
        return;
    }
    STATE.watchlist.push({ id: movie.id, title: movie.title, poster_path: movie.poster_path, year: (movie.release_date || '').substring(0, 4) });
    localStorage.setItem('vc_watchlist', JSON.stringify(STATE.watchlist));
    recordEvent('LIBRARY_SAVE', `"${movie.title}"`, `ID:${movie.id}`);
    showToast(`"${movie.title}" saved to library.`, 'success');
    DOM.statSaved.textContent = STATE.watchlist.length;
}

function removeFromLibrary(tmdbId) {
    STATE.watchlist = STATE.watchlist.filter(m => m.id !== tmdbId);
    localStorage.setItem('vc_watchlist', JSON.stringify(STATE.watchlist));
    DOM.statSaved.textContent = STATE.watchlist.length;
    renderLibrary();
}

function renderLibrary() {
    DOM.libraryCount.textContent = `${STATE.watchlist.length} title${STATE.watchlist.length !== 1 ? 's' : ''}`;
    DOM.statSaved.textContent = STATE.watchlist.length;

    if (STATE.watchlist.length === 0) {
        DOM.libraryGrid.innerHTML = `<p class="library-empty">No titles saved to your library.</p>`;
        return;
    }

    DOM.libraryGrid.innerHTML = STATE.watchlist.map(m => `
        <div class="library-card">
            <img src="https://image.tmdb.org/t/p/w300${m.poster_path}" alt="${m.title}" loading="lazy">
            <button class="library-remove-btn" data-id="${m.id}" title="Remove" aria-label="Remove ${m.title}">&times;</button>
        </div>
    `).join('');

    DOM.libraryGrid.querySelectorAll('.library-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromLibrary(parseInt(btn.dataset.id, 10));
        });
    });
}

// ─── Skeleton Loaders ──────────────────────────────────────────────────────────
function renderSkeletonGrid(count = 12) {
    DOM.movieGrid.innerHTML = Array.from({ length: count }, () =>
        `<div class="skeleton-card"></div>`
    ).join('');
}

function resetHeroSkeleton() {
    DOM.heroBadge.className = 'hero-badge skeleton-inline';
    DOM.heroBadge.style.cssText = 'width:90px;height:22px';
    DOM.heroBadge.textContent = '';
    DOM.heroTitle.className = 'hero-title skeleton-block';
    DOM.heroTitle.style.cssText = 'width:60%;height:56px;margin-bottom:1rem';
    DOM.heroTitle.textContent = '';
    DOM.heroDesc.className = 'hero-desc skeleton-block';
    DOM.heroDesc.style.cssText = 'width:45%;height:64px;margin-bottom:2rem';
    DOM.heroDesc.textContent = '';
    DOM.heroTrailerBtn.className = 'btn-primary btn-hero skeleton-btn';
    DOM.heroInfoBtn.className = 'btn-ghost btn-hero skeleton-btn';
    DOM.heroBg.style.backgroundImage = '';
}

// ─── Render Hero ───────────────────────────────────────────────────────────────
async function renderHero(movie) {
    STATE.heroMovieId = movie.id;
    STATE.heroTrailerKey = null;

    DOM.heroBg.style.backgroundImage = movie.backdrop_path
        ? `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`
        : '';

    DOM.heroBadge.className = 'hero-badge';
    DOM.heroBadge.style.cssText = '';
    DOM.heroBadge.textContent = 'FEATURED TITLE';

    DOM.heroTitle.className = 'hero-title';
    DOM.heroTitle.style.cssText = '';
    DOM.heroTitle.textContent = movie.title || movie.original_title;

    DOM.heroDesc.className = 'hero-desc';
    DOM.heroDesc.style.cssText = '';
    DOM.heroDesc.textContent = movie.overview
        ? (movie.overview.length > 180 ? movie.overview.substring(0, 180) + '…' : movie.overview)
        : 'No synopsis available.';

    DOM.heroTrailerBtn.className = 'btn-primary btn-hero';
    DOM.heroInfoBtn.className = 'btn-ghost btn-hero';

    // Fetch trailer key in background
    try {
        const data = await API.fetchTMDB(`/movie/${movie.id}/videos`);
        const trailer = (data.results || []).find(v => v.site === 'YouTube' && v.type === 'Trailer');
        STATE.heroTrailerKey = trailer ? trailer.key : null;
    } catch (_) { STATE.heroTrailerKey = null; }
}

// ─── Render Movie Grid ─────────────────────────────────────────────────────────
function renderMovieGrid(movies) {
    DOM.sectionCount.textContent = `${movies.length} title${movies.length !== 1 ? 's' : ''}`;

    if (movies.length === 0) {
        DOM.movieGrid.innerHTML = `<p style="grid-column:1/-1;color:var(--text-tertiary);font-size:0.875rem;">No titles match the selected filter.</p>`;
        return;
    }

    DOM.movieGrid.innerHTML = movies.filter(m => m.poster_path).map(m => `
        <div class="movie-card" data-id="${m.id}" data-title="${(m.title || '').replace(/"/g, '&quot;')}">
            <img class="movie-card-img" src="https://image.tmdb.org/t/p/w500${m.poster_path}" alt="${m.title || ''}" loading="lazy">
            <div class="movie-card-overlay">
                <p class="movie-card-title">${m.title || m.original_title || ''}</p>
                <p class="movie-card-year">${(m.release_date || '').substring(0, 4)}</p>
            </div>
        </div>
    `).join('');

    DOM.movieGrid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => openDetailsOverlay(parseInt(card.dataset.id, 10)));
    });
}

function renderForYouGrid(movies) {
    if (!DOM.foryouSection || !DOM.foryouGrid) return;
    if (!movies || movies.length === 0) {
        DOM.foryouSection.style.display = 'none';
        return;
    }
    DOM.foryouSection.style.display = 'block';
    DOM.foryouGrid.innerHTML = movies.filter(m => m.poster_path).slice(0, 6).map(m => `
        <div class="movie-card" data-id="${m.id}" data-title="${(m.title || '').replace(/"/g, '&quot;')}">
            <img class="movie-card-img" src="https://image.tmdb.org/t/p/w500${m.poster_path}" alt="${m.title || ''}" loading="lazy">
            <div class="movie-card-overlay">
                <p class="movie-card-title">${m.title || m.original_title || ''}</p>
                <p class="movie-card-year">${(m.release_date || '').substring(0, 4)}</p>
            </div>
        </div>
    `).join('');

    DOM.foryouGrid.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => openDetailsOverlay(parseInt(card.dataset.id, 10)));
    });
}

// ─── Fetch + Display Movies by Filter ─────────────────────────────────────────
const FILTER_ENDPOINTS = {
    all:       '/trending/movie/week',
    trending:  '/trending/movie/day',
    top_rated: '/movie/top_rated',
    release:   '/movie/now_playing',
    watchlist: null,
};

const FILTER_LABELS = {
    all:       'Recommended Titles',
    trending:  'Trending Index',
    top_rated: 'High Rated Core',
    release:   'Chronological Release',
    watchlist: 'Saved Library',
};

// Simple array shuffler (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function loadMovies(filter = 'all') {
    STATE.currentFilter = filter;
    DOM.sectionLabel.textContent = FILTER_LABELS[filter] || 'Titles';
    renderSkeletonGrid();

    if (filter === 'watchlist') {
        renderMovieGrid(STATE.watchlist.map(m => ({ ...m, poster_path: m.poster_path })));
        return;
    }

    try {
        const endpoint = FILTER_ENDPOINTS[filter] || FILTER_ENDPOINTS.all;
        const data = await API.fetchTMDB(endpoint);
        
        let results = data.results || [];
        
        // Randomize the order if it's a general list so the dashboard looks fresh every time
        if (filter === 'all' || filter === 'trending') {
            results = shuffleArray([...results]);
        }
        
        STATE.allMovies = results;
        renderMovieGrid(STATE.allMovies);

        if (filter === 'all' || filter === 'trending') {
            const withBackdrop = STATE.allMovies.find(m => m.backdrop_path);
            if (withBackdrop) renderHero(withBackdrop);
            
            // Build "For You" Section
            if (STATE.activityLog.length > 0) {
                // Find latest movie view or rating
                const latestMovieEvent = STATE.activityLog.find(e => 
                    e.type === 'DETAIL_VIEW' || e.type === 'RATING_SUBMIT' || e.type === 'LIBRARY_SAVE'
                );
                
                if (latestMovieEvent && latestMovieEvent.reference) {
                    const match = latestMovieEvent.metric.match(/ID:(\d+)/);
                    if (match && match[1]) {
                        const baseTitle = latestMovieEvent.reference.replace(/"/g, '');
                        DOM.foryouLabel.textContent = `"${baseTitle}"`;
                        
                        try {
                            const recData = await API.fetchTMDB(`/movie/${match[1]}/recommendations`);
                            renderForYouGrid(recData.results || []);
                        } catch(e) {
                            if (DOM.foryouSection) DOM.foryouSection.style.display = 'none';
                        }
                    } else if (STATE.watchlist.length > 0) {
                        // Fallback to latest watchlist item
                        const lastSaved = STATE.watchlist[STATE.watchlist.length - 1];
                        if (DOM.foryouLabel) DOM.foryouLabel.textContent = `"${lastSaved.title}"`;
                        try {
                            const recData = await API.fetchTMDB(`/movie/${lastSaved.id}/recommendations`);
                            renderForYouGrid(recData.results || []);
                        } catch(e) {
                            if (DOM.foryouSection) DOM.foryouSection.style.display = 'none';
                        }
                    } else {
                        if (DOM.foryouSection) DOM.foryouSection.style.display = 'none';
                    }
                } else {
                    if (DOM.foryouSection) DOM.foryouSection.style.display = 'none';
                }
            } else {
                if (DOM.foryouSection) DOM.foryouSection.style.display = 'none';
            }
        } else {
            if (DOM.foryouSection) DOM.foryouSection.style.display = 'none';
        }
    } catch (err) {
        console.error('loadMovies error:', err);
        DOM.movieGrid.innerHTML = `<p style="grid-column:1/-1;color:var(--text-tertiary);font-size:0.875rem;">Failed to load titles. Check your connection.</p>`;
        showToast('Failed to load movie data.', 'error');
    }
}

// ─── Search ────────────────────────────────────────────────────────────────────
let _searchTimer = null;

DOM.searchInput.addEventListener('input', (e) => {
    clearTimeout(_searchTimer);
    const q = e.target.value.trim();

    if (!q) {
        loadMovies(STATE.currentFilter);
        return;
    }

    _searchTimer = setTimeout(async () => {
        renderSkeletonGrid();
        DOM.sectionLabel.textContent = `Results for "${q}"`;
        try {
            const data = await API.fetchTMDB(`/search/movie?query=${encodeURIComponent(q)}`);
            const results = (data.results || []).slice(0, 18);
            DOM.sectionCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
            renderMovieGrid(results);
            recordEvent('SEARCH_QUERY', `"${q}"`, `${results.length} results`);
        } catch (_) {
            showToast('Search request failed.', 'error');
        }
    }, 450);
});

// ─── Filter Rail ───────────────────────────────────────────────────────────────
DOM.filterRail.addEventListener('click', (e) => {
    const tag = e.target.closest('.filter-tag');
    if (!tag) return;
    DOM.filterRail.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
    tag.classList.add('active');
    loadMovies(tag.dataset.filter);
});

// ─── Trailer Overlay ───────────────────────────────────────────────────────────
function openTrailerOverlay(trailerKey, movieTitle = '') {
    DOM.trailerTitleLabel.textContent = movieTitle ? `${movieTitle} — Official Trailer` : 'Official Trailer';
    DOM.trailerIframe.src = '';

    if (trailerKey) {
        DOM.trailerIframe.src = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1`;
        DOM.trailerIframe.classList.remove('hidden');
        DOM.trailerPlaceholder.classList.add('hidden');
    } else {
        DOM.trailerIframe.classList.add('hidden');
        DOM.trailerPlaceholder.classList.remove('hidden');
    }

    DOM.trailerOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeTrailerOverlay() {
    DOM.trailerOverlay.classList.add('hidden');
    DOM.trailerIframe.src = '';
    document.body.style.overflow = '';
}

DOM.heroTrailerBtn.addEventListener('click', () => {
    if (STATE.heroMovieId) {
        const title = DOM.heroTitle.textContent;
        recordEvent('TRAILER_VIEW', `"${title}"`, '—');
        openTrailerOverlay(STATE.heroTrailerKey, title);
    }
});
DOM.trailerCloseBtn.addEventListener('click', closeTrailerOverlay);
DOM.trailerBackdrop.addEventListener('click', closeTrailerOverlay);

// ─── Details Overlay ───────────────────────────────────────────────────────────
async function openDetailsOverlay(tmdbId) {
    DOM.detailsOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    DOM.detailsPoster.src = '';
    DOM.detailsTitle.textContent = 'Loading…';
    DOM.detailsOverview.textContent = '';
    DOM.detailsGenres.innerHTML = '';
    DOM.detailsYear.textContent = '';
    DOM.detailsRuntime.textContent = '';
    DOM.detailsRating.textContent = '';
    DOM.detailsCastSection.classList.add('hidden');
    DOM.detailsCastRow.innerHTML = '';

    try {
        const movie = await API.fetchTMDB(`/movie/${tmdbId}`);
        STATE.activeMovieId   = tmdbId;
        STATE.activeMovieData = movie;

        DOM.detailsPoster.src = movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : '';
        DOM.detailsPoster.alt = movie.title || '';
        DOM.detailsTitle.textContent = movie.title || movie.original_title;
        DOM.detailsYear.textContent  = (movie.release_date || '').substring(0, 4);
        DOM.detailsRuntime.textContent = movie.runtime ? `${movie.runtime} min` : '—';
        DOM.detailsRating.textContent = movie.vote_average
            ? `${movie.vote_average.toFixed(1)} / 10`
            : '—';
        DOM.detailsOverview.textContent = movie.overview || 'No synopsis available.';

        DOM.detailsGenres.innerHTML = (movie.genres || [])
            .map(g => `<span class="genre-chip">${g.name}</span>`)
            .join('');

        // Fetch Credits (Cast)
        try {
            const credits = await API.fetchTMDB(`/movie/${tmdbId}/credits`);
            const cast = (credits.cast || []).slice(0, 10);
            
            if (cast.length > 0) {
                DOM.detailsCastRow.innerHTML = cast.map(c => {
                    const imgUrl = c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : '';
                    const avatarContent = imgUrl 
                        ? `<img class="cast-avatar" src="${imgUrl}" alt="${c.name}" loading="lazy">`
                        : `<div class="cast-avatar no-img">${c.name.charAt(0)}</div>`;
                        
                    return `
                    <div class="cast-card">
                        ${avatarContent}
                        <span class="cast-name">${c.name}</span>
                        <span class="cast-role">${c.character}</span>
                    </div>`;
                }).join('');
                DOM.detailsCastSection.classList.remove('hidden');
            }
        } catch (_) { /* ignore cast fetch errors */ }

        // Get trailer
        const videos = await API.fetchTMDB(`/movie/${tmdbId}/videos`);
        const trailer = (videos.results || []).find(v => v.site === 'YouTube' && v.type === 'Trailer');
        STATE.activeTrailerKey = trailer ? trailer.key : null;

        // Update save button
        DOM.detailsSaveBtn.textContent = isInWatchlist(tmdbId) ? 'Saved to Library' : 'Save to Library';
        DOM.detailsSaveBtn.disabled = isInWatchlist(tmdbId);

        recordEvent('DETAIL_VIEW', `"${movie.title}"`, `ID:${tmdbId}`);

    } catch (err) {
        DOM.detailsTitle.textContent = 'Failed to load title data.';
        showToast('Could not retrieve movie details.', 'error');
    }
}

function closeDetailsOverlay() {
    DOM.detailsOverlay.classList.add('hidden');
    document.body.style.overflow = '';
}

DOM.detailsCloseBtn.addEventListener('click', closeDetailsOverlay);
DOM.detailsBackdrop.addEventListener('click', closeDetailsOverlay);

DOM.heroInfoBtn.addEventListener('click', () => {
    if (STATE.heroMovieId) openDetailsOverlay(STATE.heroMovieId);
});

DOM.detailsTrailerBtn.addEventListener('click', () => {
    if (STATE.activeMovieData) {
        openTrailerOverlay(STATE.activeTrailerKey, STATE.activeMovieData.title);
    }
});

DOM.detailsSaveBtn.addEventListener('click', () => {
    if (STATE.activeMovieData) {
        saveToLibrary(STATE.activeMovieData);
        DOM.detailsSaveBtn.textContent = 'Saved to Library';
        DOM.detailsSaveBtn.disabled = true;
    }
});

// ─── Rating Submission ─────────────────────────────────────────────────────────
DOM.rateSubmitBtn.addEventListener('click', async () => {
    if (!STATE.activeMovieData) return;
    const score = parseFloat(DOM.rateSelect.value);
    const title = STATE.activeMovieData.title;

    DOM.rateSubmitBtn.disabled = true;
    DOM.rateSubmitBtn.textContent = 'Submitting…';

    try {
        const res = await API.rateMovie(STATE.activeMovieId, score);
        recordEvent('RATING_SUBMIT', `"${title}"`, `ID:${STATE.activeMovieId} | Metric:${score}.0`);
        showToast(`Rating submitted for "${title}".`, 'success');
        closeDetailsOverlay();
    } catch (_) {
        showToast('Rating submission failed. Please try again.', 'error');
    } finally {
        DOM.rateSubmitBtn.disabled = false;
        DOM.rateSubmitBtn.textContent = 'Submit';
    }
});

// ─── Profile Panel ─────────────────────────────────────────────────────────────
function openProfile() {
    DOM.profileName.textContent = STATE.user;
    DOM.profileAvLg.textContent = STATE.user ? STATE.user[0].toUpperCase() : 'U';
    DOM.diagToken.textContent   = `sess_${btoa(STATE.user).substring(0, 10)}`;
    DOM.statEvents.textContent  = STATE.activityLog.length;
    DOM.statSaved.textContent   = STATE.watchlist.length;
    DOM.diagSessionStart.textContent = STATE.sessionStart
        ? new Date(STATE.sessionStart).toISOString()
        : '—';

    renderActivityLog();
    renderLibrary();
    showView(DOM.viewProfile);
}

DOM.navProfileBtn.addEventListener('click', openProfile);
DOM.profileBackBtn.addEventListener('click', () => showView(DOM.viewDashboard));

DOM.clearLogBtn.addEventListener('click', () => {
    STATE.activityLog = [];
    localStorage.setItem('vc_activity_log', '[]');
    renderActivityLog();
    showToast('Interaction log cleared.', 'info');
});

// ─── Navbar scroll state ───────────────────────────────────────────────────────
DOM.viewDashboard.addEventListener('scroll', () => {
    if (DOM.viewDashboard.scrollTop > 60) {
        DOM.mainNav.classList.add('scrolled');
    } else {
        DOM.mainNav.classList.remove('scrolled');
    }
});

// ─── Authentication Logic ──────────────────────────────────────────────────────
DOM.authToggleBtn.addEventListener('click', () => {
    clearAuthAlert();
    const isLogin = DOM.authMode.value === 'login';
    if (isLogin) {
        DOM.authMode.value = 'register';
        DOM.authTitle.textContent    = 'Create Account';
        DOM.authSubtitle.textContent = 'Choose a username and passphrase to register.';
        DOM.authBtnLabel.textContent = 'Register';
        DOM.authToggleMsg.textContent = 'Have an account?';
        DOM.authToggleBtn.textContent = 'Sign In';
    } else {
        DOM.authMode.value = 'login';
        DOM.authTitle.textContent    = 'Access Portal';
        DOM.authSubtitle.textContent = 'Enter your credentials to continue.';
        DOM.authBtnLabel.textContent = 'Authenticate';
        DOM.authToggleMsg.textContent = 'No account?';
        DOM.authToggleBtn.textContent = 'Register';
    }
});

DOM.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthAlert();

    const username = DOM.inpUsername.value.trim();
    const password = DOM.inpPassword.value.trim();
    const isLogin  = DOM.authMode.value === 'login';

    if (!username) { showAuthAlert('Username is required.'); return; }
    if (!password || password.length < 6) { showAuthAlert('Password must be at least 6 characters.'); return; }

    DOM.authSubmit.disabled  = true;
    DOM.authBtnLabel.classList.add('hidden');
    DOM.authSpinner.classList.remove('hidden');

    try {
        const result = isLogin
            ? await API.login(username, password)
            : await API.register(username, password);

        if (result.success) {
            const successMsg = isLogin ? `Welcome back, ${username}.` : `Account created. Welcome, ${username}.`;
            showAuthAlert(successMsg, 'success');

            STATE.user         = username;
            STATE.sessionStart = new Date().toISOString();
            API.setCurrentUser(username);

            recordEvent(isLogin ? 'AUTH_LOGIN' : 'AUTH_REGISTER', `user:${username}`, '—');

            setTimeout(() => revealDashboard(), 900);
        } else {
            showAuthAlert(result.error || (isLogin ? 'Invalid credentials.' : 'Registration failed.'));
        }
    } catch (_) {
        showAuthAlert('Network error. Verify the backend is running on port 5002.');
    } finally {
        DOM.authSubmit.disabled = false;
        DOM.authBtnLabel.classList.remove('hidden');
        DOM.authSpinner.classList.add('hidden');
    }
});

// ─── Dashboard Reveal ──────────────────────────────────────────────────────────
function revealDashboard() {
    DOM.navAvatar.textContent = STATE.user ? STATE.user[0].toUpperCase() : 'U';
    resetHeroSkeleton();
    renderSkeletonGrid();
    showView(DOM.viewDashboard);
    loadMovies('all');
}

// ─── Logout ────────────────────────────────────────────────────────────────────
DOM.navLogoutBtn.addEventListener('click', async () => {
    recordEvent('AUTH_LOGOUT', `user:${STATE.user}`, '—');
    const res = await API.logout();
    if (res.success || res.message) {
        STATE.user = null;
        STATE.heroMovieId = null;
        STATE.heroTrailerKey = null;

        DOM.authMode.value = 'login';
        DOM.authTitle.textContent    = 'Access Portal';
        DOM.authSubtitle.textContent = 'Enter your credentials to continue.';
        DOM.authBtnLabel.textContent = 'Authenticate';
        DOM.authToggleMsg.textContent = 'No account?';
        DOM.authToggleBtn.textContent = 'Register';
        DOM.inpUsername.value = '';
        DOM.inpPassword.value = '';
        clearAuthAlert();

        showView(DOM.viewAuth);
    } else {
        showToast('Sign-out request failed.', 'error');
    }
});

// ─── Initialisation ────────────────────────────────────────────────────────────
(function init() {
    const savedUser = localStorage.getItem('movie_user');
    if (savedUser) {
        STATE.user         = savedUser;
        STATE.sessionStart = localStorage.getItem('vc_session_start') || new Date().toISOString();
        API.setCurrentUser(savedUser);
        revealDashboard();
    } else {
        showView(DOM.viewAuth);
    }
    localStorage.setItem('vc_session_start', STATE.sessionStart || new Date().toISOString());
})();
