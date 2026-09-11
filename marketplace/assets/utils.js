// ============================================
// Shared helpers
// ============================================

const Utils = {
    // --- Safety -------------------------------------------------
    escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // --- Identifiers --------------------------------------------
    uid(prefix = 'id') {
        return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    },

    // --- Formatting ---------------------------------------------
    formatDate(iso, withTime = false) {
        if (!iso) return '—';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '—';
        const date = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        if (!withTime) return date;
        return `${date} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    },

    timeAgo(iso) {
        if (!iso) return '—';
        const diff = Date.now() - new Date(iso).getTime();
        const minutes = Math.round(diff / 60000);
        if (minutes < 1) return 'только что';
        if (minutes < 60) return `${minutes} мин назад`;
        const hours = Math.round(minutes / 60);
        if (hours < 24) return `${hours} ч назад`;
        const days = Math.round(hours / 24);
        return `${days} дн назад`;
    },

    hoursSince(iso) {
        if (!iso) return 0;
        return (Date.now() - new Date(iso).getTime()) / 3600000;
    },

    money(value) {
        if (value === null || value === undefined || value === '') return '—';
        return '$' + Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 });
    },

    fileSize(bytes) {
        if (!bytes) return '0 KB';
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    },

    initials(name) {
        return String(name || '?')
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join('');
    },

    // --- Validation ---------------------------------------------
    normalizePhone(phone) {
        return String(phone || '').replace(/\D/g, '');
    },

    formatPhone(phone) {
        const digits = Utils.normalizePhone(phone).replace(/^1/, '');
        if (digits.length !== 10) return phone || '—';
        return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    },

    isValidPhone(phone) {
        const digits = Utils.normalizePhone(phone).replace(/^1/, '');
        // 10 digits, area code and exchange cannot start with 0 or 1
        return /^[2-9]\d{2}[2-9]\d{6}$/.test(digits);
    },

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(email || '').trim());
    },

    isValidZip(zip) {
        return /^\d{5}$/.test(String(zip || '').trim());
    },

    // --- Geo ----------------------------------------------------
    // Great-circle distance in miles.
    distanceMiles(a, b) {
        if (!a || !b) return null;
        const toRad = deg => (deg * Math.PI) / 180;
        const R = 3958.8;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
        return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
    },

    // --- URL / tracking -----------------------------------------
    queryParams() {
        const params = {};
        new URLSearchParams(window.location.search).forEach((value, key) => {
            params[key.toLowerCase()] = value;
        });
        return params;
    },

    // --- DOM ----------------------------------------------------
    el(selector, root = document) { return root.querySelector(selector); },
    els(selector, root = document) { return Array.from(root.querySelectorAll(selector)); },

    toast(message, tone = 'info') {
        let host = document.querySelector('.toast-host');
        if (!host) {
            host = document.createElement('div');
            host.className = 'toast-host';
            document.body.appendChild(host);
        }
        const toast = document.createElement('div');
        toast.className = `toast toast-${tone}`;
        toast.textContent = message;
        host.appendChild(toast);
        setTimeout(() => toast.classList.add('toast-out'), 3200);
        setTimeout(() => toast.remove(), 3600);
    },

    // Downscale an image file to a thumbnail data URL so media survives a
    // page reload without blowing the localStorage quota.
    thumbnail(file, maxSize = 480) {
        return new Promise(resolve => {
            if (!file.type.startsWith('image/')) return resolve(null);
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(img.width * scale));
                canvas.height = Math.max(1, Math.round(img.height * scale));
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                try {
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                } catch (err) {
                    resolve(null);
                }
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
            img.src = url;
        });
    },

    videoDuration(file) {
        return new Promise(resolve => {
            const url = URL.createObjectURL(file);
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                URL.revokeObjectURL(url);
                resolve(Math.round(video.duration || 0));
            };
            video.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
            video.src = url;
        });
    }
};

if (typeof module !== 'undefined') { module.exports = Utils; }

// ------------------------------------------------------------
// Dialog system — promise-based replacement for prompt/confirm.
// Field types: text, number, date, time, textarea, select,
// chips (single choice), stars (1-5 rating).
// Resolves with {key: value, ...} on OK, null on cancel.
// ------------------------------------------------------------
Utils.dialog = function (options) {
    return new Promise(resolve => {
        const fields = options.fields || [];
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.innerHTML = `
            <div class="modal modal-sm dialog-modal">
                <div class="modal-header">
                    <h3>${Utils.escapeHtml(options.title || '')}</h3>
                    <button class="modal-close" data-act="cancel"><i class="fas fa-xmark"></i></button>
                </div>
                ${options.message ? `<p class="small" style="color:var(--text-secondary); margin-bottom:14px">${Utils.escapeHtml(options.message)}</p>` : ''}
                ${fields.map((field, fi) => {
                    const label = field.label ? `<label>${Utils.escapeHtml(field.label)}${field.required ? ' *' : ''}</label>` : '';
                    if (field.type === 'chips') {
                        return `<div class="field" data-field="${fi}">${label}
                            <div class="chip-row">${field.options.map((option, oi) => {
                                const value = option.value !== undefined ? option.value : option;
                                const text = option.label !== undefined ? option.label : option;
                                return `<button type="button" class="chip ${field.value === value ? 'selected' : ''}" data-chip="${oi}">${Utils.escapeHtml(text)}</button>`;
                            }).join('')}</div></div>`;
                    }
                    if (field.type === 'stars') {
                        return `<div class="field" data-field="${fi}">${label}
                            <div class="star-input">${[1, 2, 3, 4, 5].map(n =>
                                `<i class="fas fa-star ${field.value >= n ? 'on' : ''}" data-star="${n}"></i>`).join('')}</div></div>`;
                    }
                    if (field.type === 'textarea') {
                        return `<div class="field" data-field="${fi}">${label}
                            <textarea class="input" data-input placeholder="${Utils.escapeHtml(field.placeholder || '')}">${Utils.escapeHtml(field.value || '')}</textarea></div>`;
                    }
                    if (field.type === 'select') {
                        return `<div class="field" data-field="${fi}">${label}
                            <select class="input" data-input>${field.options.map(option => {
                                const value = option.value !== undefined ? option.value : option;
                                const text = option.label !== undefined ? option.label : option;
                                return `<option value="${Utils.escapeHtml(value)}" ${field.value === value ? 'selected' : ''}>${Utils.escapeHtml(text)}</option>`;
                            }).join('')}</select></div>`;
                    }
                    return `<div class="field" data-field="${fi}">${label}
                        <input class="input" data-input type="${field.type || 'text'}"
                            value="${Utils.escapeHtml(field.value !== undefined && field.value !== null ? field.value : '')}"
                            placeholder="${Utils.escapeHtml(field.placeholder || '')}"></div>`;
                }).join('')}
                <div class="flex mt-2" style="justify-content:flex-end">
                    ${options.cancelLabel === null ? '' : `<button class="btn btn-outline" data-act="cancel">${Utils.escapeHtml(options.cancelLabel || 'Отмена')}</button>`}
                    <button class="btn ${options.danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${Utils.escapeHtml(options.okLabel || 'OK')}</button>
                </div>
            </div>`;
        document.body.appendChild(backdrop);

        const state = fields.map(field => field.value !== undefined ? field.value : null);

        backdrop.addEventListener('click', event => {
            const chip = event.target.closest('[data-chip]');
            if (chip) {
                const holder = chip.closest('[data-field]');
                const fi = Number(holder.dataset.field);
                const field = fields[fi];
                const option = field.options[Number(chip.dataset.chip)];
                state[fi] = option.value !== undefined ? option.value : option;
                Utils.els('.chip', holder).forEach(c => c.classList.toggle('selected', c === chip));
                return;
            }
            const star = event.target.closest('[data-star]');
            if (star) {
                const holder = star.closest('[data-field]');
                const fi = Number(holder.dataset.field);
                state[fi] = Number(star.dataset.star);
                Utils.els('[data-star]', holder).forEach(s =>
                    s.classList.toggle('on', Number(s.dataset.star) <= state[fi]));
                return;
            }
            const act = event.target.closest('[data-act]');
            if (!act && event.target !== backdrop) return;
            const action = act ? act.dataset.act : 'cancel';
            if (action === 'ok') {
                const values = {};
                let valid = true;
                fields.forEach((field, fi) => {
                    if (!['chips', 'stars'].includes(field.type)) {
                        const input = backdrop.querySelector(`[data-field="${fi}"] [data-input]`);
                        state[fi] = input ? input.value.trim() : state[fi];
                    }
                    if (field.required && (state[fi] === null || state[fi] === '' || state[fi] === undefined)) valid = false;
                    values[field.key] = state[fi];
                });
                if (!valid) return Utils.toast('Заполните обязательные поля', 'danger');
                cleanup();
                resolve(values);
            } else {
                cleanup();
                resolve(null);
            }
        });

        const onKey = event => {
            if (event.key === 'Escape') { cleanup(); resolve(null); }
        };
        document.addEventListener('keydown', onKey);
        function cleanup() {
            document.removeEventListener('keydown', onKey);
            backdrop.remove();
        }
        const first = backdrop.querySelector('[data-input]');
        if (first) first.focus();
    });
};

// Sugar: confirm-style dialog resolving to boolean.
Utils.confirmDialog = function (title, message, options = {}) {
    return Utils.dialog(Object.assign({ title, message, okLabel: options.okLabel || 'Да' }, options))
        .then(result => result !== null);
};
