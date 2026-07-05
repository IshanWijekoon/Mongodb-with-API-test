/* ===================================================
   ConvertHub — Application Logic
   =================================================== */

// API Endpoints
const isLocalRuntime =
    window.location.protocol === 'file:' ||
    ['localhost', '127.0.0.1'].includes(window.location.hostname);
const CURRENCY_API = isLocalRuntime
    ? 'http://localhost:8082/api/currency'
    : 'https://currency-converter.vikumkodikara123.workers.dev/api/currency';
const TEMP_API = isLocalRuntime
    ? 'http://localhost:8081/api/temperatures'
    : 'https://temperature-converter.vikumkodikara123.workers.dev/api/temperatures';
const TEMP_API_KEY = 'SUPER-SECRET-DEV-KEY-123';

const THEME_KEY = 'converthub-theme';
const THEME_COLORS = { dark: '#0a0e17', light: '#f0f4f8' };

const CONVERT_BTN_HTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
    <span class="btn-label">Convert</span>`;

const LOADING_BTN_HTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke-dasharray="30 60"/>
    </svg>
    <span class="btn-label">Converting...</span>`;

const UNIT_SYMBOLS = { Celsius: '°C', Fahrenheit: '°F', Kelvin: 'K' };

// ==========================================
//  THEME
// ==========================================
function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLORS[theme]);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
}

function initTheme() {
    applyTheme(getPreferredTheme());
}

// ==========================================
//  TAB SWITCHING
// ==========================================
function switchTab(tab) {
    const currencySection = document.getElementById('section-currency');
    const tempSection = document.getElementById('section-temperature');
    const tabCurrency = document.getElementById('tab-currency');
    const tabTemp = document.getElementById('tab-temperature');
    const indicator = document.getElementById('tab-indicator');

    if (tab === 'currency') {
        currencySection.classList.remove('hidden');
        tempSection.classList.add('hidden');
        tabCurrency.classList.add('active');
        tabTemp.classList.remove('active');
        tabCurrency.setAttribute('aria-selected', 'true');
        tabTemp.setAttribute('aria-selected', 'false');
        indicator.classList.remove('tab-indicator--temp');
        loadCurrencyHistory();
    } else {
        currencySection.classList.add('hidden');
        tempSection.classList.remove('hidden');
        tabTemp.classList.add('active');
        tabCurrency.classList.remove('active');
        tabTemp.setAttribute('aria-selected', 'true');
        tabCurrency.setAttribute('aria-selected', 'false');
        indicator.classList.add('tab-indicator--temp');
        loadTempHistory();
    }
}

// ==========================================
//  CURRENCY CONVERTER
// ==========================================
async function convertCurrency() {
    const input = document.getElementById('currency-input');
    const amount = parseFloat(input.value);
    const btn = document.getElementById('btn-convert-currency');

    if (!amount || amount <= 0) {
        showToast('Please enter a valid USD amount', 'error');
        input.focus();
        return;
    }

    btn.classList.add('loading');
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = LOADING_BTN_HTML;

    try {
        const res = await fetch(`${CURRENCY_API}/convert?usdAmount=${amount}`, {
            method: 'POST'
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || `HTTP ${res.status}`);
        }

        const data = await res.json();

        const resultPanel = document.getElementById('currency-result');
        resultPanel.classList.remove('hidden');

        document.getElementById('currency-input-val').textContent = `$ ${formatNumber(data.inputAmount)}`;
        document.getElementById('currency-output-val').textContent = `Rs ${formatNumber(data.outputAmount)}`;
        document.getElementById('currency-rate-info').textContent = `Rate: 1 USD = ${data.exchangeRate} LKR`;
        document.getElementById('currency-time-info').textContent = formatTimestamp(data.timestamp);

        showToast('Conversion successful!', 'success');
        loadCurrencyHistory();

    } catch (err) {
        console.error('Currency conversion error:', err);
        showToast(`Could not reach currency API: ${err.message}`, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.removeAttribute('aria-busy');
        btn.innerHTML = CONVERT_BTN_HTML;
    }
}

async function loadCurrencyHistory() {
    const container = document.getElementById('currency-history-body');

    try {
        const res = await fetch(`${CURRENCY_API}/history`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!data.length) {
            container.innerHTML = '<div class="history-empty" role="listitem">No conversion history yet</div>';
            return;
        }

        const sorted = [...data].reverse();
        container.innerHTML = sorted.map((item, i) => `
            <div class="history-item" role="listitem" style="animation-delay: ${i * 0.04}s">
                <span class="history-index">${sorted.length - i}</span>
                <div class="history-body">
                    <div class="history-primary">$ ${formatNumber(item.inputAmount)} USD</div>
                    <div class="history-secondary">Rate: ${item.exchangeRate} · ${formatTimestamp(item.timestamp)}</div>
                </div>
                <div class="history-output">
                    <div class="history-output-val history-output-val--currency">Rs ${formatNumber(item.outputAmount)}</div>
                    <div class="history-output-meta">LKR</div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Load currency history error:', err);
        container.innerHTML = '<div class="history-error" role="listitem">Could not load history. Check your connection.</div>';
    }
}

// ==========================================
//  TEMPERATURE CONVERTER
// ==========================================
async function convertTemperature() {
    const input = document.getElementById('temp-input');
    const value = parseFloat(input.value);
    const unit = document.getElementById('temp-unit').value;
    const btn = document.getElementById('btn-convert-temp');

    if (isNaN(value)) {
        showToast('Please enter a valid temperature value', 'error');
        input.focus();
        return;
    }

    btn.classList.add('loading');
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = LOADING_BTN_HTML;

    try {
        const res = await fetch(`${TEMP_API}/convert?value=${value}&unit=${unit}`, {
            method: 'POST',
            headers: {
                'X-API-KEY': TEMP_API_KEY
            }
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || `HTTP ${res.status}`);
        }

        const data = await res.json();

        const resultPanel = document.getElementById('temp-result');
        resultPanel.classList.remove('hidden');

        const inSymbol = UNIT_SYMBOLS[data.inputUnit] || '';
        const outSymbol = UNIT_SYMBOLS[data.outputUnit] || '';

        document.getElementById('temp-input-val').textContent = `${formatNumber(data.inputTemperature)} ${inSymbol}`;
        document.getElementById('temp-output-val').textContent = `${formatNumber(data.outputTemperature)} ${outSymbol}`;
        document.getElementById('temp-unit-info').textContent = `${data.inputUnit} → ${data.outputUnit}`;
        document.getElementById('temp-time-info').textContent = formatTimestamp(data.timestamp);

        showToast('Conversion successful!', 'success');
        loadTempHistory();

    } catch (err) {
        console.error('Temperature conversion error:', err);
        showToast(`Could not reach temperature API: ${err.message}`, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.removeAttribute('aria-busy');
        btn.innerHTML = CONVERT_BTN_HTML;
    }
}

async function loadTempHistory() {
    const container = document.getElementById('temp-history-body');

    try {
        const res = await fetch(`${TEMP_API}/history`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!data.length) {
            container.innerHTML = '<div class="history-empty" role="listitem">No conversion history yet</div>';
            return;
        }

        const sorted = [...data].reverse();

        container.innerHTML = sorted.map((item, i) => `
            <div class="history-item" role="listitem" style="animation-delay: ${i * 0.04}s">
                <span class="history-index">${sorted.length - i}</span>
                <div class="history-body">
                    <div class="history-primary">${formatNumber(item.inputTemperature)} ${UNIT_SYMBOLS[item.inputUnit] || ''}</div>
                    <div class="history-secondary">${item.inputUnit} → ${item.outputUnit} · ${formatTimestamp(item.timestamp)}</div>
                </div>
                <div class="history-output">
                    <div class="history-output-val history-output-val--temp">${formatNumber(item.outputTemperature)} ${UNIT_SYMBOLS[item.outputUnit] || ''}</div>
                    <div class="history-output-meta">${item.outputUnit}</div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Load temp history error:', err);
        container.innerHTML = '<div class="history-error" role="listitem">Could not load history. Check your connection.</div>';
    }
}

// ==========================================
//  UTILITIES
// ==========================================
function formatNumber(num) {
    if (num === undefined || num === null) return '—';
    return Number(num).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatTimestamp(ts) {
    if (!ts) return '';
    try {
        const date = new Date(ts);
        if (isNaN(date.getTime())) return ts;
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch {
        return ts;
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-msg');

    toast.className = `toast ${type}`;
    msg.textContent = message;

    toast.style.animation = 'none';
    toast.offsetHeight;
    toast.style.animation = '';

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.4s ease-in forwards';
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 400);
    }, 3000);
}

// ==========================================
//  EVENT BINDINGS
// ==========================================
function bindEvents() {
    document.getElementById('tab-currency').addEventListener('click', () => switchTab('currency'));
    document.getElementById('tab-temperature').addEventListener('click', () => switchTab('temperature'));
    document.getElementById('btn-convert-currency').addEventListener('click', convertCurrency);
    document.getElementById('btn-convert-temp').addEventListener('click', convertTemperature);
    document.getElementById('btn-refresh-currency').addEventListener('click', loadCurrencyHistory);
    document.getElementById('btn-refresh-temp').addEventListener('click', loadTempHistory);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;

        const currencySection = document.getElementById('section-currency');
        if (!currencySection.classList.contains('hidden')) {
            if (document.activeElement === document.getElementById('currency-input')) {
                convertCurrency();
            }
        } else {
            if (document.activeElement === document.getElementById('temp-input') ||
                document.activeElement === document.getElementById('temp-unit')) {
                convertTemperature();
            }
        }
    });
}

// ==========================================
//  INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    bindEvents();
    loadCurrencyHistory();
});
