/* ===== Kookielicious Cakes by Lykz - Dashboard Data Helpers =====
   Storage helpers for the admin dashboard. Everything lives in localStorage
   (sessionStorage only holds the login flag). Every read and write is wrapped
   in try/catch so the app never crashes if storage is empty, full, or blocked.
*/

const KC_STORAGE = {
    GALLERY: 'kc_gallery',
    ORDERS: 'kc_orders',
    ADMIN: 'kc_admin',
    SESSION: 'kc_session'
};

/* Default gallery mirrored from the public site (exact titles, paths, categories). */
const DEFAULT_GALLERY = [
    { id: 'g1', src: 'images/476964397_1734633784061425_9081176933088120602_n.jpg', title: 'Pink & Blue Christening Set', category: 'christening', visible: true },
    { id: 'g2', src: 'images/211210521_915464542645024_5184086500641054154_n.jpg', title: 'Rainbow Unicorn Cake', category: 'birthday', visible: true },
    { id: 'g3', src: 'images/470229193_1697571481100989_454437787587739516_n.jpg', title: 'Under the Sea Cupcakes', category: 'cupcakes', visible: true },
    { id: 'g4', src: 'images/470232715_1697571101101027_7207012082697027500_n.jpg', title: 'Little Mermaid Cake', category: 'kids', visible: true },
    { id: 'g5', src: 'images/472632910_1710292949828842_8176161407709832996_n.jpg', title: 'Baby Dino 2nd Birthday Cake', category: 'kids', visible: true },
    { id: 'g6', src: 'images/472505326_1710292906495513_5377312948419610032_n.jpg', title: 'Red Roses & Gold Leaf 18th Birthday Cake', category: 'elegant', visible: true },
    { id: 'g7', src: 'images/473597945_1716231842568286_6014189328397794439_n.jpg', title: 'Chocolate Pretzel Loaded Cake', category: 'birthday', visible: true }
];

function _load(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
    } catch (err) {
        return fallback;
    }
}

function _save(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (err) {
        return false;
    }
}

/* Gallery */
function getGallery() {
    const list = _load(KC_STORAGE.GALLERY, null);
    return Array.isArray(list) && list.length > 0 ? list : [...DEFAULT_GALLERY];
}

function saveGallery(list) {
    return _save(KC_STORAGE.GALLERY, list);
}

/* Orders */
function getOrders() {
    return _load(KC_STORAGE.ORDERS, []);
}

function saveOrders(list) {
    return _save(KC_STORAGE.ORDERS, list);
}

/* Unique id */
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/* Admin account */
function getAdmin() {
    return _load(KC_STORAGE.ADMIN, null);
}

function getDefaultGallery() {
    return [...DEFAULT_GALLERY];
}

function saveAdmin(admin) {
    return _save(KC_STORAGE.ADMIN, admin);
}

/* Login flag (session only) */
function sessionActive() {
    try {
        return sessionStorage.getItem(KC_STORAGE.SESSION) === '1';
    } catch (err) {
        return false;
    }
}

function setSession(active) {
    try {
        if (active) {
            sessionStorage.setItem(KC_STORAGE.SESSION, '1');
        } else {
            sessionStorage.removeItem(KC_STORAGE.SESSION);
        }
    } catch (err) {
        // ignore
    }
}

/* SHA-256 hash of a string (never store plain passwords) */
async function sha256(text) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}
