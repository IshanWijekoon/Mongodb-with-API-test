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
const API_KEY = 'SUPER-SECRET-DEV-KEY-123';
const API_HEADERS = { 'X-API-KEY': API_KEY };

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

const HOT_FAHRENHEIT_THRESHOLD = 100;
const COMFORT_CELSIUS_MIN = 15;
const COMFORT_CELSIUS_MAX = 30;

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
            method: 'POST',
            headers: API_HEADERS
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || `HTTP ${res.status}`);
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
        const res = await fetch(`${CURRENCY_API}/history`, {
            headers: API_HEADERS
        });
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
            headers: API_HEADERS
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

        const safety = evaluateTemperatureSafety(value, unit);
        renderSafetyResult(safety);

        showToast('Conversion successful!', 'success');
        loadTempHistory();

    } catch (err) {
        console.error('Temperature conversion error:', err);
        hideSafetyResult();
        showToast(`Could not reach temperature API: ${err.message}`, 'error');
    } finally {
        btn.classList.remove('loading');
        btn.removeAttribute('aria-busy');
        btn.innerHTML = CONVERT_BTN_HTML;
    }
}

function toFahrenheit(value, unit) {
    switch (unit) {
        case 'celsius':
            return (value * 1.8) + 32;
        case 'fahrenheit':
            return value;
        case 'kelvin':
            return ((value - 273.15) * 1.8) + 32;
        default:
            return value;
    }
}

function toCelsius(value, unit) {
    switch (unit) {
        case 'celsius':
            return value;
        case 'fahrenheit':
            return (value - 32) / 1.8;
        case 'kelvin':
            return value - 273.15;
        default:
            return value;
    }
}

function unitSymbolForInput(unit) {
    switch (unit) {
        case 'celsius':
            return '°C';
        case 'fahrenheit':
            return '°F';
        case 'kelvin':
            return 'K';
        default:
            return '';
    }
}

function evaluateTemperatureSafety(value, unit) {
    const fahrenheit = toFahrenheit(value, unit);
    const celsius = toCelsius(value, unit);
    const symbol = unitSymbolForInput(unit);
    const formatted = `${value.toFixed(1)}${symbol}`;

    if (fahrenheit > HOT_FAHRENHEIT_THRESHOLD) {
        return {
            level: 'hot',
            label: 'Hot',
            message: `${formatted} is dangerously HOT! Stay hydrated and avoid prolonged exposure.`
        };
    }

    if (celsius >= COMFORT_CELSIUS_MIN && celsius <= COMFORT_CELSIUS_MAX) {
        return {
            level: 'safe',
            label: 'Comfortable',
            message: `${formatted} is in a comfortable and safe range (${COMFORT_CELSIUS_MIN}°C to ${COMFORT_CELSIUS_MAX}°C).`
        };
    }

    if (celsius < COMFORT_CELSIUS_MIN) {
        return {
            level: 'cold',
            label: 'Cold',
            message: `${formatted} is COLD. Dress warmly and limit time outdoors.`
        };
    }

    return {
        level: 'caution',
        label: 'Warm',
        message: `${formatted} is warm but below the danger threshold. Use caution in heat.`
    };
}

function hideSafetyResult() {
    document.getElementById('temp-safety-result').classList.add('hidden');
}

function renderSafetyResult(safety) {
    const panel = document.getElementById('temp-safety-result');
    const labelEl = document.getElementById('temp-safety-label');
    const messageEl = document.getElementById('temp-safety-message');
    const iconEl = document.getElementById('temp-safety-icon');

    panel.classList.remove('hidden', 'safety-result--safe', 'safety-result--caution', 'safety-result--hot', 'safety-result--cold');
    panel.classList.add(`safety-result--${safety.level}`);
    labelEl.textContent = safety.label;
    messageEl.textContent = safety.message;

    if (safety.level === 'safe') {
        iconEl.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
    } else if (safety.level === 'hot') {
        iconEl.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
    } else if (safety.level === 'cold') {
        iconEl.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 7l-5-5-5 5M7 17l5 5 5-5"/></svg>';
    } else {
        iconEl.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
    }
}

async function loadTempHistory() {
    const container = document.getElementById('temp-history-body');

    try {
        const res = await fetch(`${TEMP_API}/history`, {
            headers: API_HEADERS
        });
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
