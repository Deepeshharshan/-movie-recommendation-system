// ==========================================================================
// VISIONCINE SPA ROUTING & LOGIC
// ==========================================================================

// ─── Elements ─────────────────────────────────────────────────────────────
const authGate = document.getElementById('auth-gate');
const dashboardLayer = document.getElementById('dashboard-layer');

// Auth Gate Elements
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const authModeInput = document.getElementById('auth-mode');
const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
const toggleMsg = document.getElementById('toggle-msg');
const authHeader = document.querySelector('.auth-header');
const submitBtnText = document.querySelector('.btn-text');
const authNotification = document.getElementById('auth-notification');
const loginSpinner = document.getElementById('login-spinner');

// Dashboard Elements
const navUsername = document.getElementById('nav-username');
const logoutBtn = document.getElementById('logout-btn');
const heroTitle = document.getElementById('hero-title');
const heroDesc = document.getElementById('hero-desc');
const heroShowcase = document.getElementById('hero-showcase');
const movieGrid = document.getElementById('movie-grid');

// Feedback Alert
const feedbackLayer = document.getElementById('feedback-layer');
const feedbackMessage = document.getElementById('feedback-message');

// ─── State Management ─────────────────────────────────────────────────────
function checkAuthAndRoute() {
    // Check localStorage (simulating token/user persistence)
    const user = localStorage.getItem('movie_user');
    
    if (user) {
        // Logged in: Reveal Dashboard
        navUsername.textContent = user;
        transitionToDashboard();
    } else {
        // Not logged in: Show Auth Gate
        authGate.classList.remove('fade-out');
        dashboardLayer.classList.add('hidden');
        dashboardLayer.classList.remove('revealed');
    }
}

function transitionToDashboard() {
    // Hardware accelerated cinematic fade out
    authGate.classList.add('fade-out');
    
    // Wait for fade out to complete before showing dashboard
    setTimeout(() => {
        dashboardLayer.classList.remove('hidden');
        // Trigger CSS reflow to ensure transition works
        void dashboardLayer.offsetWidth; 
        dashboardLayer.classList.add('revealed');
        
        // Fetch data for dashboard
        loadDashboardData();
    }, 800); // matches the 0.8s CSS transition
}

function showAuthNotification(msg, type = 'error') {
    authNotification.textContent = msg;
    authNotification.classList.remove('hidden');
    if (type === 'error') {
        authNotification.style.background = 'rgba(255, 59, 48, 0.2)';
        authNotification.style.borderColor = 'rgba(255, 59, 48, 0.4)';
        authNotification.style.color = '#ffb3b0';
    } else {
        authNotification.style.background = 'rgba(48, 209, 88, 0.2)';
        authNotification.style.borderColor = 'rgba(48, 209, 88, 0.4)';
        authNotification.style.color = '#a6f7b9';
    }
}

function showSpatialAlert(msg) {
    feedbackMessage.textContent = msg;
    feedbackLayer.classList.remove('hidden');
    setTimeout(() => {
        feedbackLayer.classList.add('hidden');
    }, 3000);
}

// ─── Auth Logic ───────────────────────────────────────────────────────────

// Toggle Login / Register
toggleAuthModeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    authNotification.classList.add('hidden');
    
    if (authModeInput.value === 'login') {
        authModeInput.value = 'register';
        authHeader.textContent = 'Create Account';
        submitBtnText.textContent = 'Sign Up';
        toggleMsg.textContent = 'Already have an account?';
        toggleAuthModeBtn.textContent = 'Log In';
    } else {
        authModeInput.value = 'login';
        authHeader.textContent = 'Access Portal';
        submitBtnText.textContent = 'Sign In';
        toggleMsg.textContent = 'Need access?';
        toggleAuthModeBtn.textContent = 'Create Account';
    }
});

// Handle Form Submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authNotification.classList.add('hidden');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const isLogin = authModeInput.value === 'login';
    
    if (!username || !password) return;
    
    // UI Loading state
    submitBtnText.classList.add('hidden');
    loginSpinner.classList.remove('hidden');
    
    try {
        const action = isLogin ? API.login : API.register;
        const result = await action(username, password);
        
        if (result.success) {
            // SUCCESS! 
            localStorage.setItem('movie_user', username);
            API.setCurrentUser(username);
            
            if (!isLogin) {
                // If it was register, switch to login silently or just login directly
                // (Flask backend logs them in on register automatically)
            }
            
            // Execute the Cinematic Reveal
            transitionToDashboard();
            
        } else {
            showAuthNotification(result.error || 'Authentication failed.');
        }
    } catch (err) {
        showAuthNotification('Network error. Please ensure backend is running.');
    } finally {
        submitBtnText.classList.remove('hidden');
        loginSpinner.classList.add('hidden');
    }
});

// Handle Logout
logoutBtn.addEventListener('click', async () => {
    const result = await API.logout();
    if (result.success) {
        localStorage.removeItem('movie_user');
        // Fade out dashboard and fade in auth
        dashboardLayer.classList.remove('revealed');
        setTimeout(() => {
            dashboardLayer.classList.add('hidden');
            authGate.classList.remove('fade-out');
            usernameInput.value = '';
            passwordInput.value = '';
        }, 800);
    } else {
        showSpatialAlert('Error logging out');
    }
});


// ─── Dashboard Data Loading ───────────────────────────────────────────────
async function loadDashboardData() {
    try {
        // Fetch trending movies for hero and grid
        const trendingResponse = await API.fetchTMDB('/trending/movie/week');
        const movies = trendingResponse.results;
        
        if (movies && movies.length > 0) {
            // Set Hero
            const hero = movies[0];
            heroTitle.classList.remove('skeleton-text');
            heroDesc.classList.remove('skeleton-text-multiline');
            heroTitle.textContent = hero.title || hero.original_title;
            heroDesc.textContent = hero.overview || "Discover the next generation of cinematic experiences.";
            heroShowcase.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${hero.backdrop_path})`;
            
            // Populate Grid
            movieGrid.innerHTML = '';
            movies.slice(1, 13).forEach(movie => {
                if (!movie.poster_path) return;
                
                const card = document.createElement('div');
                card.className = 'movie-card';
                card.innerHTML = `
                    <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}" class="movie-poster">
                `;
                
                card.addEventListener('click', () => openMovieModal(movie.id));
                movieGrid.appendChild(card);
            });
        }
    } catch (err) {
        console.error('Failed to load dashboard data', err);
        showSpatialAlert('Could not load movie data.');
    }
}

// ─── Movie Modal Logic ────────────────────────────────────────────────────
const modal = document.getElementById('movie-modal');
const closeModal = document.getElementById('close-modal');

async function openMovieModal(id) {
    modal.classList.remove('hidden');
    
    try {
        const movie = await API.fetchTMDB(`/movie/${id}`);
        document.getElementById('modal-title').textContent = movie.title;
        document.getElementById('modal-year').textContent = movie.release_date ? movie.release_date.substring(0, 4) : 'N/A';
        document.getElementById('modal-genre').textContent = movie.genres && movie.genres.length > 0 ? movie.genres[0].name : 'Movie';
        document.getElementById('modal-desc').textContent = movie.overview;
        document.getElementById('modal-rating').textContent = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        document.getElementById('modal-img').src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
        
        // Setup rate action
        document.getElementById('submit-rating-btn').onclick = async () => {
            const score = document.getElementById('user-rating-input').value;
            const res = await API.rateMovie(movie.id, score);
            if(res.success) {
                showSpatialAlert(`Rated ${movie.title} ${score} stars!`);
                modal.classList.add('hidden');
            } else {
                showSpatialAlert(res.error || 'Failed to submit rating.');
            }
        };
        
    } catch (err) {
        showSpatialAlert('Failed to load movie details.');
    }
}

closeModal.addEventListener('click', () => {
    modal.classList.add('hidden');
});

// ─── Search Functionality ─────────────────────────────────────────────────
const searchInput = document.getElementById('search-input');
let searchDebounce = null;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(async () => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            loadDashboardData(); // revert to trending
            return;
        }
        
        try {
            const searchRes = await API.fetchTMDB(`/search/movie?query=${encodeURIComponent(query)}`);
            movieGrid.innerHTML = '';
            document.querySelector('.section-heading').textContent = `Search Results for "${query}"`;
            
            searchRes.results.slice(0, 12).forEach(movie => {
                if (!movie.poster_path) return;
                const card = document.createElement('div');
                card.className = 'movie-card';
                card.innerHTML = `<img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}" class="movie-poster">`;
                card.addEventListener('click', () => openMovieModal(movie.id));
                movieGrid.appendChild(card);
            });
        } catch(err) {
            console.error('Search failed', err);
        }
    }, 500);
});

// ─── Initialize SPA ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRoute();
});
