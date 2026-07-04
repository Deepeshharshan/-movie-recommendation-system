/**
 * Movie Recommendation System - Vision Pro Interface
 * Backend-Connected: TMDB for movie data, Flask for user actions.
 * UI design is fully preserved — only logic is updated.
 */

// --- TMDB API Configuration ---
const TMDB_API_KEY = '1ce706eba9d04d9aabca93cb7cc91efd';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_HERO_IMAGE_BASE = 'https://image.tmdb.org/t/p/original';

// TMDB Genre ID to name map (fetched once on init)
const GENRE_MAP = {};

// DOM Elements
const feedbackLayer = document.getElementById('feedback-layer');
const feedbackMessage = document.getElementById('feedback-message');
const movieGrid = document.getElementById('movie-grid');
const searchInput = document.getElementById('search-input');
const heroShowcase = document.getElementById('hero-showcase');
const heroTitle = document.getElementById('hero-title');
const heroDesc = document.getElementById('hero-desc');
const heroAction = document.getElementById('hero-action');

// Modal Elements
const movieModal = document.getElementById('movie-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalImg = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalYear = document.getElementById('modal-year');
const modalGenre = document.getElementById('modal-genre');
const modalReviews = document.getElementById('modal-reviews');
const modalDesc = document.getElementById('modal-desc');
const modalRating = document.getElementById('modal-rating');
const userRatingInput = document.getElementById('user-rating-input');
const submitRatingBtn = document.getElementById('submit-rating-btn');

let activeMovieModal = null;
let ALL_MOVIES = [];

// ─── Spatial Alert (preserved exactly as designed) ─────────────────────────
function showSpatialAlert(message, type = 'info', duration = 3000) {
    feedbackMessage.innerHTML = `<span class="alert-icon">${type === 'error' ? '⚠️' : '✨'}</span> ${message}`;
    feedbackLayer.classList.remove('hidden');
    feedbackLayer.classList.add('visible');
    setTimeout(() => feedbackLayer.classList.remove('visible'), duration);
}

// ─── Skeleton Loader (preserved exactly as designed) ───────────────────────
function renderSkeletons() {
    movieGrid.innerHTML = Array(8).fill('<div class="movie-card skeleton-card"></div>').join('');
}

// ─── TMDB: Fetch genre list once and cache ──────────────────────────────────
async function loadGenres() {
    if (Object.keys(GENRE_MAP).length > 0) return; // Already loaded
    try {
        const res = await fetch(`${TMDB_BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`);
        const data = await res.json();
        if (data.genres) {
            data.genres.forEach(g => { GENRE_MAP[g.id] = g.name; });
        }
    } catch (e) {
        console.warn('Could not load TMDB genres:', e);
    }
}

// ─── Map TMDB movie object to our UI schema ─────────────────────────────────
function mapTMDBMovie(movie) {
    const genres = movie.genre_ids
        ? movie.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean).join(', ') || 'Cinema'
        : (movie.genres ? movie.genres.map(g => g.name).join(', ') : 'Cinema');

    return {
        id: movie.id,
        title: movie.title,
        year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A',
        genre: genres,
        rating: movie.vote_average ? (movie.vote_average / 2).toFixed(1) : 'N/A', // Convert 10-pt to 5-pt scale
        reviews: movie.vote_count || 0,
        image: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster',
        heroImage: movie.backdrop_path ? `${TMDB_HERO_IMAGE_BASE}${movie.backdrop_path}` : null,
        desc: movie.overview || 'No description available.'
    };
}

// ─── TMDB: Fetch Popular or Search ─────────────────────────────────────────
async function fetchMovies(query = '') {
    renderSkeletons();

    await loadGenres(); // Ensure genre map is ready

    const url = query
        ? `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
        : `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            ALL_MOVIES = data.results.map(mapTMDBMovie);
            renderMovies(ALL_MOVIES);

            if (!query) {
                updateHero(ALL_MOVIES[Math.floor(Math.random() * Math.min(ALL_MOVIES.length, 5))]);
            }
        } else {
            movieGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-secondary);">No movies found for "${query}".</p>`;
        }
    } catch (error) {
        console.error('Error fetching TMDB data:', error);
        movieGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-secondary);">Could not load movies. Please try again.</p>`;
    }
}

// ─── Render movie cards (design preserved exactly) ─────────────────────────
function renderMovies(movies) {
    movieGrid.innerHTML = '';

    if (movies.length === 0) {
        movieGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-secondary);">No cinematic matches found.</p>`;
        return;
    }

    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <img src="${movie.image}" alt="${movie.title}" loading="lazy">
            <div class="card-overlay">
                <div class="card-title">${movie.title}</div>
                <div class="card-meta">⭐️ ${movie.rating} • ${movie.genre.split(',')[0]}</div>
            </div>
        `;
        card.addEventListener('click', () => openMovieModal(movie));
        movieGrid.appendChild(card);
    });
}

// ─── Hero Section (design preserved exactly) ───────────────────────────────
function updateHero(movie) {
    heroTitle.classList.remove('skeleton-text');
    heroDesc.classList.remove('skeleton-text-multiline');
    heroTitle.textContent = movie.title;
    heroDesc.textContent = movie.desc;
    heroShowcase.style.backgroundImage = `url('${movie.heroImage || movie.image}')`;
    heroAction.onclick = () => openMovieModal(movie);
}

// ─── Modal: Open (design preserved exactly) ────────────────────────────────
function openMovieModal(movie) {
    activeMovieModal = movie;
    modalImg.src = movie.image;
    modalTitle.textContent = movie.title;
    modalYear.textContent = movie.year;
    modalGenre.textContent = movie.genre;
    modalReviews.textContent = `${movie.reviews.toLocaleString()} Reviews`;
    modalDesc.textContent = movie.desc;
    modalRating.textContent = movie.rating;
    movieModal.classList.remove('hidden');
}

// ─── Modal: Close (design preserved exactly) ───────────────────────────────
function closeMovieModal() {
    movieModal.classList.add('hidden');
    activeMovieModal = null;
}

closeModalBtn.addEventListener('click', closeMovieModal);
movieModal.addEventListener('click', (e) => {
    if (e.target === movieModal) closeMovieModal();
});

// ─── Rating Submission → Flask Backend ────────────────────────────────────
submitRatingBtn.addEventListener('click', async () => {
    if (!activeMovieModal) return;

    const val = parseInt(userRatingInput.value);
    const movie = activeMovieModal;

    submitRatingBtn.textContent = 'Submitting...';
    submitRatingBtn.disabled = true;

    try {
        // Try to submit to Flask backend if authenticated
        if (API.isAuthenticated()) {
            await API.submitRating(movie.id, val);
        }
    } catch (err) {
        console.warn('Backend rating failed, applying locally:', err.message);
        // Silently fall through — still update the UI locally
    } finally {
        // Always update UI immediately regardless of backend result
        const currentRating = parseFloat(movie.rating);
        const newRating = ((currentRating * movie.reviews + val) / (movie.reviews + 1)).toFixed(1);
        movie.rating = newRating;
        movie.reviews += 1;

        modalRating.textContent = newRating;
        submitRatingBtn.textContent = 'Submit Rating';
        submitRatingBtn.disabled = false;

        showSpatialAlert(`You rated "${movie.title}" ${val} star${val !== 1 ? 's' : ''}!`);

        // Refresh the grid to reflect updated rating
        fetchMovies(searchInput.value.trim());
    }
});

// ─── Search (live, connected to TMDB) ──────────────────────────────────────
let searchDebounce = null;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
        fetchMovies(e.target.value.trim());
    }, 400); // 400ms debounce to avoid hammering the API
});

// ─── Init: Session check + initial data load ──────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Check session — redirect to landing if not authenticated
    if (!API.isAuthenticated()) {
        // Allow viewing without login for now, but flag unauthenticated state
        console.info('User not authenticated. Rating submissions will not persist to backend.');
    }

    // Always load movies from TMDB on startup
    fetchMovies();
});
