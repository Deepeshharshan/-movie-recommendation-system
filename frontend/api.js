/**
 * api.js - Centralized Flask Backend Communications
 * Preserves the Spatial UI while routing actions to the backend.
 */
const FLASK_BASE_URL = 'http://127.0.0.1:5000'; // Default local Flask port

const API = {
    // Session Management
    getToken() {
        return localStorage.getItem('visioncine_token');
    },

    setToken(token) {
        localStorage.setItem('visioncine_token', token);
    },

    clearToken() {
        localStorage.removeItem('visioncine_token');
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    // Core Fetch Wrapper
    async request(endpoint, method = 'GET', data = null) {
        const headers = {
            'Content-Type': 'application/json',
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`; // Standard JWT bearer format
        }

        const config = {
            method,
            headers,
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${FLASK_BASE_URL}${endpoint}`, config);
            const result = await response.json().catch(() => ({})); // Handle empty responses safely
            
            if (!response.ok) {
                throw new Error(result.error || result.message || 'Backend request failed');
            }
            
            return result;
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            throw error; // Let the caller catch and show UI alerts
        }
    },

    // Backend Endpoints
    async login(email, password) {
        // Expected payload structure
        return this.request('/login', 'POST', { email, password });
    },

    async register(firstName, lastName, email, password) {
        return this.request('/register', 'POST', { 
            first_name: firstName, 
            last_name: lastName, 
            email, 
            password 
        });
    },

    async submitRating(movieId, rating) {
        return this.request('/rate', 'POST', { movie_id: movieId, rating });
    },

    async getProfile() {
        return this.request('/profile', 'GET');
    }
};
