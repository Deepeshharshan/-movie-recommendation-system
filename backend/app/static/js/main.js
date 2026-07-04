// ---------- Theme toggle (dark/light, persisted for the session) ----------
(function initTheme() {
    const root = document.documentElement;
    const toggleBtn = document.getElementById('theme-toggle');
    const stored = window.__cinematch_theme || 'dark';
    root.setAttribute('data-theme', stored);
    if (toggleBtn) toggleBtn.textContent = stored === 'dark' ? '☀️' : '🌙';

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const current = root.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            window.__cinematch_theme = next;
            toggleBtn.textContent = next === 'dark' ? '☀️' : '🌙';
        });
    }
})();

// ---------- Toast notifications ----------
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Auto-dismiss flashed server-side messages
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.flash').forEach((el) => {
        setTimeout(() => { el.style.display = 'none'; }, 4000);
    });
});

// ---------- Live search suggestions ----------
(function initSearchSuggestions() {
    const input = document.getElementById('search-input');
    const box = document.getElementById('suggestions-box');
    if (!input || !box) return;

    let debounceTimer;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim();

        if (query.length < 2) {
            box.classList.remove('active');
            box.innerHTML = '';
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                renderSuggestions(data);
            } catch (err) {
                box.classList.remove('active');
            }
        }, 250);
    });

    function renderSuggestions(items) {
        if (!items.length) {
            box.classList.remove('active');
            box.innerHTML = '';
            return;
        }
        box.innerHTML = items
            .map((m) => `<div class="suggestion-item" data-id="${m.id}"><span>${m.title}</span><span>${m.year || ''}</span></div>`)
            .join('');
        box.classList.add('active');

        box.querySelectorAll('.suggestion-item').forEach((el) => {
            el.addEventListener('click', () => {
                window.location.href = `/movie/${el.dataset.id}`;
            });
        });
    }

    document.addEventListener('click', (e) => {
        if (!box.contains(e.target) && e.target !== input) {
            box.classList.remove('active');
        }
    });
})();
