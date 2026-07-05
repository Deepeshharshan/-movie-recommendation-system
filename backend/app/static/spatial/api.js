// ==========================================================================
// VISIONCINE API CLIENT
// Centralized communication layer for Flask Backend + TMDB
// ==========================================================================

const FLASK_BASE = window.location.origin.includes('127.0.0.1') || window.location.origin.includes('localhost')
    ? 'http://127.0.0.1:5002'  // local dev
    : '';                       // production: same-origin (EC2 serves both frontend + API)
const TMDB_BASE  = 'https://api.themoviedb.org/3';
const TMDB_KEY   = '1ce706eba9d04d9aabca93cb7cc91efd';

const API = {

    // ─── Internal state ────────────────────────────────────────────────────
    _currentUser: null,

    setCurrentUser(username) {
        this._currentUser = username;
        localStorage.setItem('movie_user', username);
    },

    clearCurrentUser() {
        this._currentUser = null;
        localStorage.removeItem('movie_user');
    },

    getCurrentUser() {
        return this._currentUser || localStorage.getItem('movie_user');
    },

    isAuthenticated() {
        return !!this.getCurrentUser();
    },

    // ─── Flask Backend Request Wrapper ─────────────────────────────────────
    async request(endpoint, method = 'GET', data = null) {
        const config = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        };
        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }
        try {
            const response = await fetch(`${FLASK_BASE}${endpoint}`, config);
            const result = await response.json().catch(() => ({}));
            return { success: response.ok, ...result };
        } catch (error) {
            console.error(`Flask API Error [${endpoint}]:`, error);
            return { success: false, error: 'Network error. Is the backend running?' };
        }
    },

    // ─── Direct TMDB Request ───────────────────────────────────────────────
    async fetchTMDB(path) {
        const sep = path.includes('?') ? '&' : '?';
        const url = `${TMDB_BASE}${path}${sep}api_key=${TMDB_KEY}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`TMDB error: ${response.status}`);
        return response.json();
    },

    // ─── Auth Methods ──────────────────────────────────────────────────────
    async login(username, password) {
        return this.request('/auth/login', 'POST', { email: username, password });
    },

    async register(username, password) {
        // Backend register requires email; use username@visioncine.local as a fallback
        return this.request('/auth/register', 'POST', {
            first_name: username,
            last_name: '',
            email: `${username}@visioncine.local`,
            password
        });
    },

    async logout() {
        const result = await this.request('/auth/logout', 'POST');
        if (result.success) this.clearCurrentUser();
        return result;
    },

    // ─── Movie Methods ─────────────────────────────────────────────────────
    async rateMovie(movieId, score) {
        // First ensure the movie is cached in the backend DB via TMDB
        return this.request('/api/movie/rate', 'POST', { tmdb_id: movieId, score });
    },

    async getProfile() {
        return this.request('/users/profile', 'GET');
    }
};
