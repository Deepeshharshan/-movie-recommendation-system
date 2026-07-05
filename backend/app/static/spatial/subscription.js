/* ==========================================================================
   VISIONCINE — SUBSCRIPTION PAGE CONTROLLER  (subscription.js)
   All logic for the pricing / subscription view (#view-subscription).
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
            { label: 'Resolution',          value: 'HD' },
            { label: 'Devices',             value: '1 Device' },
            { label: 'Ads',                 value: 'Included', negative: true },
            { label: 'Downloads',           value: '—', negative: true },
            { label: 'AI Recommendations',  value: 'Basic' },
            { label: 'Continue Watching',   value: '—', negative: true },
            { label: 'Family Sharing',      value: '—', negative: true },
            { label: 'Priority Support',    value: '—', negative: true },
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
            { label: 'Downloads',           value: '✓', positive: true },
            { label: 'AI Recommendations',  value: 'Advanced', positive: true },
            { label: 'Continue Watching',   value: 'Synced', positive: true },
            { label: 'Family Sharing',      value: '—', negative: true },
            { label: 'Priority Support',    value: '—', negative: true },
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
            { label: 'Resolution',          value: '4K + Dolby Atmos' },
            { label: 'Devices',             value: 'Unlimited' },
            { label: 'Ads',                 value: 'No Ads', positive: true },
            { label: 'Downloads',           value: 'Offline Downloads', positive: true },
            { label: 'AI Recommendations',  value: 'Full AI', positive: true },
            { label: 'Continue Watching',   value: 'Synced', positive: true },
            { label: 'Family Sharing',      value: '✓', positive: true },
            { label: 'Priority Support',    value: '✓', positive: true },
        ],
        btnLabel: 'Go Ultimate',
        btnClass: 'btn-primary sub-ultimate-btn',
        description: 'The complete cinematic experience',
    },
];

/* ─── Comparison table rows ──────────────────────────────────────────────── */
const COMPARE_FEATURES = [
    { label: 'Resolution',         key: 'Resolution' },
    { label: 'Devices',            key: 'Devices' },
    { label: 'Downloads',          key: 'Downloads' },
    { label: 'Ads',                key: 'Ads' },
    { label: 'AI Recommendations', key: 'AI Recommendations' },
    { label: 'Continue Watching',  key: 'Continue Watching' },
    { label: 'Family Sharing',     key: 'Family Sharing' },
    { label: 'Priority Support',   key: 'Priority Support' },
];

/* ─── Payment methods ─────────────────────────────────────────────────────── */
const PAYMENT_METHODS = [
    { name: 'UPI',        icon: '₹',   color: '#f97316' },
    { name: 'Google Pay', icon: 'G',   color: '#34d399' },
    { name: 'PhonePe',   icon: 'P',   color: '#8b5cf6' },
    { name: 'Paytm',     icon: 'PT',  color: '#06b6d4' },
    { name: 'Visa',      icon: 'V',   color: '#1a56db' },
    { name: 'Mastercard',icon: 'MC',  color: '#ef4444' },
    { name: 'RuPay',     icon: 'R',   color: '#10b981' },
    { name: 'Stripe',    icon: 'S',   color: '#6366f1' },
];

/* ─── State ──────────────────────────────────────────────────────────────── */
const SUB = {
    selectedPlan: 'premium',
    currentPlan: null,
    autoRenew: true,
    emailNotifs: true,
};

/* ─── Render pricing cards ────────────────────────────────────────────────── */
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
                <span class="feat-icon">${f.positive ? '✓' : f.negative ? '—' : '◉'}</span>
                <span class="feat-label">${f.label}</span>
                <span class="feat-val">${f.value}</span>
            </li>`).join('')}
        </ul>
        <button class="${plan.btnClass} sub-plan-btn" data-plan="${plan.id}">
            ${plan.btnLabel}
        </button>
    </div>`).join('');

    // Attach plan selection
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
    // Update the payment section title
    const plan = PLANS.find(p => p.id === planId);
    const payTitle = document.getElementById('sub-pay-plan-name');
    if (payTitle && plan) payTitle.textContent = `${plan.name} — ${plan.price}/month`;
}

function handleSubscribe(planId) {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return;
    selectPlan(planId);
    // Scroll to payment
    const paySection = document.getElementById('sub-payment-section');
    if (paySection) paySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(`${plan.name} plan selected. Complete payment below.`, 'info');
}

/* ─── Render comparison table ─────────────────────────────────────────────── */
function renderCompareTable() {
    const tbody = document.getElementById('sub-compare-body');
    if (!tbody) return;

    // Build a feature → plan map
    const planMap = {};
    PLANS.forEach(plan => {
        planMap[plan.id] = {};
        plan.features.forEach(f => { planMap[plan.id][f.key] = f; });
    });

    tbody.innerHTML = COMPARE_FEATURES.map(row => `
    <tr class="compare-row">
        <td class="compare-feat-label">${row.label}</td>
        ${PLANS.map(plan => {
            const feat = planMap[plan.id][row.key];
            if (!feat) return '<td class="compare-cell">—</td>';
            const cls = feat.positive ? 'compare-yes' : feat.negative ? 'compare-no' : '';
            return `<td class="compare-cell ${cls}">${feat.value}</td>`;
        }).join('')}
    </tr>`).join('');
}

/* ─── Render payment methods ─────────────────────────────────────────────── */
function renderPaymentMethods() {
    const grid = document.getElementById('sub-payment-methods');
    if (!grid) return;
    grid.innerHTML = PAYMENT_METHODS.map(pm => `
    <div class="sub-payment-card" data-method="${pm.name}">
        <div class="sub-payment-icon" style="background:${pm.color}22;color:${pm.color}">${pm.icon}</div>
        <span class="sub-payment-name">${pm.name}</span>
    </div>`).join('');

    grid.querySelectorAll('.sub-payment-card').forEach(card => {
        card.addEventListener('click', () => {
            grid.querySelectorAll('.sub-payment-card').forEach(c => c.classList.remove('sub-payment-selected'));
            card.classList.add('sub-payment-selected');
        });
    });
}

/* ─── Render current subscription status ─────────────────────────────────── */
async function renderCurrentPlan() {
    const section = document.getElementById('sub-current-plan');
    if (!section) return;

    try {
        const data = await API.getSubscription();
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
                <button class="btn-primary" onclick="handleSubscribe('premium')">Upgrade to Premium</button>
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

/* ─── Render settings panel ──────────────────────────────────────────────── */
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

/* ─── Main load function ─────────────────────────────────────────────────── */
function loadSubscriptionPage() {
    renderPricingCards();
    renderCompareTable();
    renderPaymentMethods();
    renderCurrentPlan();
    renderSettings();

    // Payment form submit
    const payBtn = document.getElementById('sub-pay-btn');
    if (payBtn) {
        payBtn.addEventListener('click', () => {
            const plan = PLANS.find(p => p.id === SUB.selectedPlan);
            showToast(`Payment processing for ${plan?.name || 'selected plan'}… (demo mode)`, 'info');
        });
    }
}

/* ─── Nav wiring ─────────────────────────────────────────────────────────── */
function initSubscriptionNav() {
    const btn = document.getElementById('nav-subscription-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            showView(document.getElementById('view-subscription'));
            loadSubscriptionPage();
        });
    }
}
