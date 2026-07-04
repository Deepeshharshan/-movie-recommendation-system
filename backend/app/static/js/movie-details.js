document.addEventListener('DOMContentLoaded', () => {
    const actionBar = document.querySelector('.action-bar');
    if (!actionBar) return;

    const movieId = actionBar.dataset.movieId;

    // ----- Star rating -----
    const ratingWidget = document.getElementById('rating-widget');
    if (ratingWidget) {
        const stars = ratingWidget.querySelectorAll('.star');
        stars.forEach((star) => {
            star.addEventListener('click', async () => {
                const score = parseInt(star.dataset.score, 10);
                try {
                    const res = await fetch(`/api/movie/${movieId}/rate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ score }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                        stars.forEach((s) => {
                            s.classList.toggle('filled', parseInt(s.dataset.score, 10) <= score);
                        });
                        showToast(`Rated ${score} / 5`, 'success');
                    } else {
                        showToast(data.error || 'Could not save rating.', 'error');
                    }
                } catch (err) {
                    showToast('Network error. Please try again.', 'error');
                }
            });
        });
    }

    // ----- Favorite toggle -----
    const favBtn = document.getElementById('favorite-btn');
    if (favBtn) {
        favBtn.addEventListener('click', async () => {
            try {
                const res = await fetch(`/api/movie/${movieId}/favorite`, { method: 'POST' });
                const data = await res.json();
                favBtn.classList.toggle('active', data.favorited);
                favBtn.textContent = data.favorited ? '♥ Favorited' : '♡ Favorite';
                showToast(data.favorited ? 'Added to favorites' : 'Removed from favorites', 'info');
            } catch (err) {
                showToast('Network error. Please try again.', 'error');
            }
        });
    }

    // ----- Share -----
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const url = shareBtn.dataset.url;
            if (navigator.share) {
                try {
                    await navigator.share({ title: document.title, url });
                } catch (err) { /* user cancelled */ }
            } else {
                await navigator.clipboard.writeText(url);
                showToast('Link copied to clipboard', 'success');
            }
        });
    }

    // ----- Watchlist toggle -----
    const watchBtn = document.getElementById('watchlist-btn');
    if (watchBtn) {
        watchBtn.addEventListener('click', async () => {
            try {
                const res = await fetch(`/api/movie/${movieId}/watchlist`, { method: 'POST' });
                const data = await res.json();
                watchBtn.classList.toggle('active', data.watchlisted);
                watchBtn.textContent = data.watchlisted ? '✓ In Watchlist' : '+ Watchlist';
                showToast(data.watchlisted ? 'Added to watchlist' : 'Removed from watchlist', 'info');
            } catch (err) {
                showToast('Network error. Please try again.', 'error');
            }
        });
    }
});
