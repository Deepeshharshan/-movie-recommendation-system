/* ==========================================================================
   VISIONCINE — PREMIUM PAGE CONTROLLER (subscription.js)
   All logic for the pricing / premium view (#view-subscription).
   Loaded after api.js and app.js.
   ========================================================================== */

'use strict';

/* ─── Plan definitions ───────────────────────────────────────────────────── */
const PLANS = [
    {
        id: 'starter',
        name: 'Starter',
        price: '₹99',
        period: '/month',
        badge: null,
        features: [
            { label: 'Resolution',          value: 'HD Streaming' },
            { label: 'Devices',             value: '1 Device' },
            { label: 'Ads',                 value: 'Advertisements', negative: true },
            { label: 'Downloads',           value: 'Downloads', positive: true },
            { label: 'Recommendations',     value: 'Basic Recommendations' },
        ],
        btnLabel: 'Subscribe',
        btnClass: 'btn-ghost',
        description: 'Perfect for casual viewing',
    },
    {
        id: 'premium',
        name: 'Premium',
        price: '₹299',
        period: '/month',
        badge: 'Most Popular',
        features: [
            { label: 'Resolution',          value: 'Full HD' },
            { label: 'Devices',             value: '3 Devices' },
            { label: 'Ads',                 value: 'No Ads', positive: true },
            { label: 'Downloads',           value: 'Offline Downloads', positive: true },
            { label: 'Recommendations',     value: 'AI Recommendations', positive: true },
            { label: 'Continue Watching',   value: 'Continue Watching Sync', positive: true },
        ],
        btnLabel: 'Upgrade',
        btnClass: 'btn-primary',
        description: 'Best for families & enthusiasts',
    },
    {
        id: 'ultimate',
        name: 'Ultimate',
        price: '₹499',
        period: '/month',
        badge: 'Best Value',
        features: [
            { label: 'Resolution',          value: '4K HDR' },
            { label: 'Audio',               value: 'Dolby Vision & Atmos', positive: true },
            { label: 'Devices',             value: 'Unlimited Devices', positive: true },
            { label: 'Sharing',             value: 'Family Sharing', positive: true },
            { label: 'Concierge',           value: 'AI Movie Concierge', positive: true },
            { label: 'Content',             value: 'Exclusive Collections', positive: true },
            { label: 'Support',             value: 'Priority Support', positive: true },
        ],
        btnLabel: 'Go Ultimate',
        btnClass: 'btn-primary sub-ultimate-btn',
        description: 'The complete cinematic experience',
    },
];

/* ─── Payment methods (SVGs) ──────────────────────────────────────────────── */
const PAYMENT_METHODS = [
    { name: 'UPI',        svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', color: '#f97316' },
    { name: 'Google Pay', svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>', color: '#34d399' },
    { name: 'PhonePe',    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>', color: '#8b5cf6' },
    { name: 'Paytm',      svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', color: '#06b6d4' },
    { name: 'Visa',       svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>', color: '#1a56db' },
    { name: 'MasterCard', svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="12" r="6"/><circle cx="16" cy="12" r="6"/></svg>', color: '#ef4444' },
    { name: 'RuPay',      svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>', color: '#10b981' },
    { name: 'PayPal',     svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 7.5A4.5 4.5 0 0 0 13 3H7.4a.5.5 0 0 0-.5.5v16.1a.5.5 0 0 0 .5.5H11v-4h1.5a5.5 5.5 0 0 0 5.5-5.5v-.5a4.5 4.5 0 0 0-4.5-4.5z"/></svg>', color: '#3b82f6' },
    { name: 'Stripe',     svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 12c-2 0-3-1-3-2s1-2 3-2 3 1 3 2c0 2-2 3-3 4zm0 0c2 0 3 1 3 2s-1 2-3 2-3-1-3-2c0-2 2-3 3-4z"/><line x1="12" y1="2" x2="12" y2="22"/></svg>', color: '#6366f1' },
];

/* ─── Movie Quality Badges ────────────────────────────────────────────────── */
const QUALITY_BADGES = [
    '4K', 'HDR10+', 'Dolby Vision', 'Dolby Atmos', 'IMAX Enhanced', 'Blu-ray', 'Director\'s Cut', 'Premium Exclusive'
];

/* ─── Premium Benefits ────────────────────────────────────────────────────── */
const PREMIUM_BENEFITS = [
    'Unlimited Streaming', 'Highest Video Quality', 'AI Movie Concierge', 'Personalized Recommendations', 'Offline Downloads', 'Cloud Sync', 'Cross Device Resume', 'Family Sharing', 'Priority Support', 'Early Access'
];

/* ─── State ──────────────────────────────────────────────────────────────── */
const SUB = {
    selectedPlan: 'premium',
    currentPlan: null,
    autoRenew: true,
    emailNotifs: true,
};

/* ─── Render ─────────────────────────────────────────────────────────────── */
function renderPricingCards() {
    const container = document.getElementById('sub-pricing-grid');
    if (!container) return;

    container.innerHTML = PLANS.map(plan => `
    <div class="sub-card ${plan.badge ? 'sub-card-featured' : ''} ${SUB.selectedPlan === plan.id ? 'sub-card-selected' : ''}"
         id="sub-card-${plan.id}" data-plan="${plan.id}">
        ${plan.badge ? `<div class="sub-card-badge">${plan.badge}</div>` : ''}
        <div class="sub-card-header">
            <h3 class="sub-plan-name">${plan.name}</h3>
            <p class="sub-plan-desc">${plan.description}</p>
            <div class="sub-price-row">
                <span class="sub-price">${plan.price}</span>
                <span class="sub-period">${plan.period}</span>
            </div>
        </div>
        <ul class="sub-feature-list">
            ${plan.features.map(f => `
            <li class="sub-feature-item ${f.positive ? 'feat-yes' : ''} ${f.negative ? 'feat-no' : ''}">
                <span class="feat-icon">${f.positive ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : f.negative ? '—' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'}</span>
                <span class="feat-label">${f.label}</span>
                <span class="feat-val">${f.value}</span>
            </li>`).join('')}
        </ul>
        <button class="${plan.btnClass} sub-plan-btn" data-plan="${plan.id}">
            ${plan.btnLabel}
        </button>
    </div>`).join('');

    container.querySelectorAll('.sub-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.sub-plan-btn')) return;
            selectPlan(card.dataset.plan);
        });
    });
    container.querySelectorAll('.sub-plan-btn').forEach(btn => {
        btn.addEventListener('click', () => handleSubscribe(btn.dataset.plan));
    });
}

function selectPlan(planId) {
    SUB.selectedPlan = planId;
    document.querySelectorAll('.sub-card').forEach(c => {
        c.classList.toggle('sub-card-selected', c.dataset.plan === planId);
    });
    const plan = PLANS.find(p => p.id === planId);
    const payTitle = document.getElementById('sub-pay-plan-name');
    if (payTitle && plan) payTitle.textContent = `${plan.name} — ${plan.price}/month`;
}

function handleSubscribe(planId) {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return;
    selectPlan(planId);
    const paySection = document.getElementById('sub-payment-section');
    if (paySection) paySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(`${plan.name} plan selected. Complete payment below.`, 'info');
}

function renderPaymentMethods() {
    const grid = document.getElementById('sub-payment-methods');
    if (!grid) return;
    grid.innerHTML = PAYMENT_METHODS.map(pm => `
    <div class="sub-payment-card" data-method="${pm.name}">
        <div class="sub-payment-icon" style="background:${pm.color}22;color:${pm.color}">${pm.svg}</div>
        <span class="sub-payment-name">${pm.name}</span>
    </div>`).join('');

    grid.querySelectorAll('.sub-payment-card').forEach(card => {
        card.addEventListener('click', () => {
            grid.querySelectorAll('.sub-payment-card').forEach(c => c.classList.remove('sub-payment-selected'));
            card.classList.add('sub-payment-selected');
        });
    });
}

function renderQualityBadges() {
    const wrap = document.getElementById('quality-badges-wrap');
    if (!wrap) return;
    wrap.innerHTML = QUALITY_BADGES.map(b => `<span class="quality-badge">${b}</span>`).join('');
}

function renderPremiumBenefits() {
    const grid = document.getElementById('premium-benefits-grid');
    if (!grid) return;
    grid.innerHTML = PREMIUM_BENEFITS.map(b => `
    <div class="premium-benefit-item">
        <svg class="benefit-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${b}</span>
    </div>`).join('');
}

async function renderPremiumCollections() {
    const grid = document.getElementById('premium-exclusive-grid');
    if (!grid) return;
    
    grid.innerHTML = `<p class="fy-empty-msg">Loading collections...</p>`;
    
    try {
        const data = await API.getPremiumCollections();
        if (data.collections && data.collections.length > 0) {
            grid.innerHTML = data.collections.map(c => `
                <div class="premium-collection-row">
                    <h3 class="collection-title">${c.collection.title} <span class="collection-badge">${c.collection.badge}</span></h3>
                    <div class="collection-movies">
                        ${c.movies.map(m => `
                            <div class="fy-card" data-id="${m.id}" data-title="${(m.title||'').replace(/"/g,'&quot;')}">
                                <div class="fy-card-poster-wrap">
                                    <img class="fy-card-poster" src="${m.poster_url}" alt="${m.title||''}" loading="lazy">
                                    <div class="premium-corner-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = `<p class="fy-empty-msg">No collections found.</p>`;
        }
    } catch (_) {
        grid.innerHTML = `<p class="fy-empty-msg">Failed to load collections.</p>`;
    }
}

async function renderCurrentPlan() {
    const section = document.getElementById('sub-current-plan');
    if (!section) return;

    try {
        const data = await API.getPremiumInfo();
        SUB.currentPlan = data;
        const statusColor = data.status === 'Active' ? '#34d399' : '#f87171';

        section.innerHTML = `
        <div class="sub-current-card">
            <div class="sub-current-header">
                <div>
                    <h4 class="sub-current-plan-name">${data.plan}</h4>
                    <p class="sub-current-price">${data.price}</p>
                </div>
                <span class="sub-status-badge" style="color:${statusColor};border-color:${statusColor}20;background:${statusColor}10">
                    ● ${data.status}
                </span>
            </div>
            <div class="sub-current-meta">
                <div class="sub-meta-item">
                    <span class="sub-meta-label">Billing Date</span>
                    <span class="sub-meta-val">${data.billing_date}</span>
                </div>
                <div class="sub-meta-item">
                    <span class="sub-meta-label">Renewal Date</span>
                    <span class="sub-meta-val">${data.renewal_date}</span>
                </div>
            </div>
            <div class="sub-current-features">
                ${data.features.map(f => `<span class="fy-genre-chip">${f}</span>`).join('')}
            </div>
            <div class="sub-current-actions">
                <button class="btn-primary" onclick="handleSubscribe('premium')">Upgrade Plan</button>
                <button class="btn-ghost sub-cancel-btn" id="sub-cancel-btn">Cancel Subscription</button>
            </div>
        </div>`;

        document.getElementById('sub-cancel-btn')?.addEventListener('click', () => {
            showToast('Contact support@visioncine.com to cancel your subscription.', 'info');
        });
    } catch (_) {
        section.innerHTML = `<p class="fy-empty-msg">No active subscription found. Choose a plan below.</p>`;
    }
}

function renderSettings() {
    const section = document.getElementById('sub-settings-section');
    if (!section) return;

    section.innerHTML = `
    <div class="sub-settings-grid">
        <div class="sub-setting-row">
            <div class="sub-setting-info">
                <span class="sub-setting-label">Auto Renew</span>
                <span class="sub-setting-desc">Automatically renew your subscription each month</span>
            </div>
            <button class="sub-toggle ${SUB.autoRenew ? 'active' : ''}" id="toggle-autorenew">
                <div class="sub-toggle-thumb"></div>
            </button>
        </div>
        <div class="sub-setting-row">
            <div class="sub-setting-info">
                <span class="sub-setting-label">Email Notifications</span>
                <span class="sub-setting-desc">Receive billing receipts and plan updates</span>
            </div>
            <button class="sub-toggle ${SUB.emailNotifs ? 'active' : ''}" id="toggle-email">
                <div class="sub-toggle-thumb"></div>
            </button>
        </div>
        <div class="sub-setting-row">
            <div class="sub-setting-info">
                <span class="sub-setting-label">Payment History</span>
                <span class="sub-setting-desc">View and download your invoices</span>
            </div>
            <button class="btn-ghost sub-setting-btn" onclick="showToast('Payment history coming soon.','info')">
                View Invoices →
            </button>
        </div>
    </div>`;

    document.getElementById('toggle-autorenew')?.addEventListener('click', function() {
        SUB.autoRenew = !SUB.autoRenew;
        this.classList.toggle('active', SUB.autoRenew);
        showToast(`Auto-renew ${SUB.autoRenew ? 'enabled' : 'disabled'}.`, 'success');
    });
    document.getElementById('toggle-email')?.addEventListener('click', function() {
        SUB.emailNotifs = !SUB.emailNotifs;
        this.classList.toggle('active', SUB.emailNotifs);
        showToast(`Email notifications ${SUB.emailNotifs ? 'enabled' : 'disabled'}.`, 'success');
    });
}

function renderPaymentForm() {
    const form = document.getElementById('sub-payment-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = document.getElementById('sub-pay-btn');
        btn.innerHTML = `<div class="btn-spinner" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></div> Processing...`;
        setTimeout(() => {
            btn.innerHTML = 'Complete Secure Payment';
            showToast('Subscription activated successfully! Welcome to Premium.', 'success');
            renderCurrentPlan();
        }, 1500);
    });
}

/* ─── Nav wiring (called from app.js) ────────────────────────────────────── */
function initSubscriptionNav() {
    const btn = document.getElementById('nav-subscription-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            showView(document.getElementById('view-subscription'));
            renderPricingCards();
            renderPremiumCollections();
            renderQualityBadges();
            renderPremiumBenefits();
            renderPaymentMethods();
            renderCurrentPlan();
            renderSettings();
            renderPaymentForm();
            selectPlan('premium');
        });
    }
}
