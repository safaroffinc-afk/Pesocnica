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
