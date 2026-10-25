/* ===== Kookielicious Cakes by Lykz - Admin Dashboard =====
   Client-side login only: the username and a password hash are kept in
   localStorage and the login flag in sessionStorage. This is NOT real
   security; it only prevents casual access on this device.
*/

(function () {
    'use strict';

    /* ===== ELEMENTS ===== */
    const loginPage = document.getElementById('dashLoginPage');
    const shell = document.getElementById('dashShell');
    const loginContainer = document.getElementById('dashLoginFormContainer');

    const sidebar = document.getElementById('dashSidebar');
    const overlay = document.getElementById('dashOverlay');
    const menuToggle = document.getElementById('dashMenuToggle');
    const navItems = document.querySelectorAll('.dash-nav-item');
    const pages = document.querySelectorAll('.dash-page');
    const topbarUser = document.getElementById('dashTopbarUser');
    const logoutBtn = document.getElementById('dashNavLogout');

    /* ===== STATE ===== */
    let orderSearch = '';
    let orderStatusFilter = '';
    let sortDir = 'asc';
    let confirmCallback = null;
    let editingGalleryId = null;
    let galleryNewSrc = null;

    /* ===== HELPERS ===== */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text === null || text === undefined ? '' : text;
        return div.innerHTML;
    }

    function badgeClass(status) {
        return String(status || '').toLowerCase().replace(/\s+/g, '-');
    }

    function formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d)) return '';
        return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function formatPeso(value) {
        return Number(value || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
    }

    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    function resizeImage(dataUrl, maxWidth, quality) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width;
                let h = img.height;
                if (w > maxWidth) {
                    h = Math.round((h * maxWidth) / w);
                    w = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = dataUrl;
        });
    }

    function openModal(modal) { modal.classList.remove('hidden'); }
    function closeModal(modal) { modal.classList.add('hidden'); }

    /* ===== AUTH ===== */
    function renderSetup() {
        loginContainer.innerHTML = `
            <h2>Set up your admin account</h2>
            <p>Create the username and password for this dashboard.</p>
            <form id="dashSetupForm">
                <div class="dash-form-group">
                    <label for="dashSetupUser">Username</label>
                    <input type="text" id="dashSetupUser" required autocomplete="username">
                </div>
                <div class="dash-form-group">
                    <label for="dashSetupPass">Password (min 6 characters)</label>
                    <input type="password" id="dashSetupPass" required minlength="6" autocomplete="new-password">
                </div>
                <div class="dash-form-group">
                    <label for="dashSetupConfirm">Confirm Password</label>
                    <input type="password" id="dashSetupConfirm" required autocomplete="new-password">
                </div>
                <p class="dash-error" id="dashSetupError"></p>
                <button type="submit" class="dash-btn dash-btn-primary" style="width:100%">Create account</button>
            </form>
        `;
        document.getElementById('dashSetupForm').addEventListener('submit', handleSetup);
    }

    function renderLogin() {
        loginContainer.innerHTML = `
            <h2>Admin Login</h2>
            <p>Welcome back. Sign in to manage your cake business.</p>
            <form id="dashLoginForm">
                <div class="dash-form-group">
                    <label for="dashLoginUser">Username</label>
                    <input type="text" id="dashLoginUser" required autocomplete="username">
                </div>
                <div class="dash-form-group">
                    <label for="dashLoginPass">Password</label>
                    <input type="password" id="dashLoginPass" required autocomplete="current-password">
                </div>
                <p class="dash-error" id="dashLoginError"></p>
                <button type="submit" class="dash-btn dash-btn-primary" style="width:100%">Sign in</button>
            </form>
        `;
        document.getElementById('dashLoginForm').addEventListener('submit', handleLogin);
    }

    function renderAuth() {
        getAdmin() ? renderLogin() : renderSetup();
    }

    async function handleSetup(e) {
        e.preventDefault();
        const user = document.getElementById('dashSetupUser').value.trim();
        const pass = document.getElementById('dashSetupPass').value;
        const confirm = document.getElementById('dashSetupConfirm').value;
        const errorEl = document.getElementById('dashSetupError');
        if (!user) {
            errorEl.textContent = 'Please enter a username';
            errorEl.style.display = 'block';
            return;
        }
        if (pass.length < 6) {
            errorEl.textContent = 'Password must be at least 6 characters';
            errorEl.style.display = 'block';
            return;
        }
        if (pass !== confirm) {
            errorEl.textContent = 'Passwords do not match';
            errorEl.style.display = 'block';
            return;
        }
        try {
            const hash = await sha256(pass);
            saveAdmin({ username: user, passwordHash: hash });
            setSession(true);
            openDashboard();
        } catch (err) {
            errorEl.textContent = 'Could not save account: ' + err.message;
            errorEl.style.display = 'block';
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const user = document.getElementById('dashLoginUser').value.trim();
        const pass = document.getElementById('dashLoginPass').value;
        const admin = getAdmin();
        const errorEl = document.getElementById('dashLoginError');
        if (!admin || admin.username !== user || (await sha256(pass)) !== admin.passwordHash) {
            errorEl.textContent = 'Incorrect username or password';
            errorEl.style.display = 'block';
            return;
        }
        setSession(true);
        openDashboard();
    }

    function openDashboard() {
        loginPage.hidden = true;
        shell.hidden = false;
        topbarUser.textContent = (getAdmin() || {}).username || '';
        showPage('overview');
    }

    function doLogout() {
        setSession(false);
        shell.hidden = true;
        loginPage.hidden = false;
        renderAuth();
    }

    /* ===== PAGES ===== */
    function showPage(pageId) {
        pages.forEach((page) => {
            page.classList.remove('dash-page-active');
            page.hidden = true;
        });
        const target = document.getElementById(
            'dashPage' + pageId.charAt(0).toUpperCase() + pageId.slice(1)
        );
        if (target) {
            target.hidden = false;
            target.classList.add('dash-page-active');
        }
        navItems.forEach((item) => {
            item.classList.toggle('dash-nav-active', item.dataset.page === pageId);
        });
        document.getElementById('dashMain').scrollTop = 0;
        renderCurrentPage();
        closeSidebar();
    }

    function initNav() {
        navItems.forEach((item) => {
            item.addEventListener('click', (e) => {
                const pageId = item.dataset.page;
                if (!pageId) return;
                if (pageId === 'website') {
                    e.preventDefault();
                    window.open('index.html', '_blank');
                    return;
                }
                e.preventDefault();
                showPage(pageId);
            });
        });
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            doLogout();
        });
    }

    function closeSidebar() {
        sidebar.classList.remove('dash-sidebar-open');
        overlay.classList.remove('dash-overlay-open');
    }

    /* ===== OVERVIEW ===== */
    function countUpcoming(orders) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const limit = new Date(today);
        limit.setDate(today.getDate() + 7);
        return orders.filter((o) => {
            if (o.status === 'Completed' || o.status === 'Cancelled') return false;
            const d = new Date(o.eventDate);
            if (isNaN(d)) return false;
            d.setHours(0, 0, 0, 0);
            return d >= today && d <= limit;
        }).length;
    }

    function renderOverview() {
        const orders = getOrders();
        const total = orders.length;
        const pending = orders.filter((o) => o.status === 'Pending').length;
        const upcoming = countUpcoming(orders);
        const sales = orders
            .filter((o) => o.status === 'Completed')
            .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

        document.getElementById('dashStats').innerHTML = `
            <div class="dash-stat-card"><div class="dash-stat-label">Total Orders</div><div class="dash-stat-value">${total}</div></div>
            <div class="dash-stat-card"><div class="dash-stat-label">Pending Orders</div><div class="dash-stat-value">${pending}</div></div>
            <div class="dash-stat-card"><div class="dash-stat-label">Upcoming (7 days)</div><div class="dash-stat-value">${upcoming}</div></div>
            <div class="dash-stat-card"><div class="dash-stat-label">Total Sales (Completed)</div><div class="dash-stat-value">${formatPeso(sales)}</div></div>
        `;

        /* Orders per month chart (last 6 months) */
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ key: m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0'), label: m.toLocaleDateString('en-PH', { month: 'short' }) });
        }
        const counts = {};
        months.forEach((m) => { counts[m.key] = 0; });
        orders.forEach((o) => {
            const d = new Date(o.createdAt || o.eventDate);
            if (isNaN(d)) return;
            const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            if (counts[key] !== undefined) counts[key]++;
        });
        const max = Math.max(...Object.values(counts), 1);
        document.getElementById('dashChart').innerHTML = months.map((m) => {
            const pct = Math.round((counts[m.key] / max) * 100);
            return `
                <div class="dash-chart-col">
                    <div class="dash-chart-count">${counts[m.key]}</div>
                    <div class="dash-chart-bar"><div class="dash-chart-fill" style="height:${pct}%"></div></div>
                    <div class="dash-chart-label">${m.label}</div>
                </div>
            `;
        }).join('');
        document.getElementById('dashChartEmpty').style.display = total ? 'none' : 'block';

        /* Upcoming orders */
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const limit = new Date(today);
        limit.setDate(today.getDate() + 7);
        const upcomingList = orders
            .filter((o) => {
                if (o.status === 'Completed' || o.status === 'Cancelled') return false;
                const d = new Date(o.eventDate);
                if (isNaN(d)) return false;
                d.setHours(0, 0, 0, 0);
                return d >= today && d <= limit;
            })
            .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
            .slice(0, 5);
        const upcomingEl = document.getElementById('dashUpcoming');
        const upcomingEmpty = document.getElementById('dashUpcomingEmpty');
        if (upcomingList.length === 0) {
            upcomingEl.innerHTML = '';
            upcomingEmpty.style.display = 'block';
        } else {
            upcomingEmpty.style.display = 'none';
            upcomingEl.innerHTML = upcomingList.map((o) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px solid rgba(212,175,55,0.2);">
                    <div>
                        <div style="font-weight:600;color:var(--gold-light);">${formatDate(o.eventDate)}</div>
                        <div style="color:var(--cream);font-size:0.9rem;">${escapeHtml(o.customer)} &#8226; ${escapeHtml(o.cakeType)}</div>
                    </div>
                    <span class="dash-badge ${badgeClass(o.status)}">${o.status}</span>
                </div>
            `).join('');
        }
    }

    /* ===== ORDERS ===== */
    function nextOrderNo(orders) {
        let max = 0;
        orders.forEach((o) => {
            const m = String(o.orderNo || '').match(/KC-(\d+)/);
            if (m) max = Math.max(max, parseInt(m[1], 10));
        });
        return 'KC-' + String(max + 1).padStart(4, '0');
    }

    function filteredOrders() {
        return getOrders().filter((o) => {
            const term = orderSearch;
            const matchSearch = !term ||
                (o.customer && o.customer.toLowerCase().includes(term)) ||
                (o.contact && o.contact.toLowerCase().includes(term)) ||
                (o.orderNo && o.orderNo.toLowerCase().includes(term));
            const matchStatus = !orderStatusFilter || o.status === orderStatusFilter;
            return matchSearch && matchStatus;
        });
    }

    function renderOrders() {
        let list = filteredOrders();
        list.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
        if (sortDir === 'desc') list.reverse();

        const tbody = document.getElementById('dashOrdersBody');
        const empty = document.getElementById('dashOrdersEmpty');
        if (list.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
        } else {
            empty.style.display = 'none';
            tbody.innerHTML = list.map((o) => `
                <tr>
                    <td><span class="dash-order-no">${escapeHtml(o.orderNo)}</span></td>
                    <td>${escapeHtml(o.customer)}</td>
                    <td>${escapeHtml(o.contact)}</td>
                    <td>${formatDate(o.eventDate)}</td>
                    <td>${escapeHtml(o.cakeType)}</td>
                    <td>${formatPeso(o.totalAmount)}</td>
                    <td>${formatPeso((Number(o.totalAmount) || 0) - (Number(o.downpayment) || 0))}</td>
                    <td><span class="dash-badge ${badgeClass(o.status)}">${o.status}</span></td>
                    <td>
                        <button class="dash-btn dash-btn-ghost dash-btn-sm" data-edit="${escapeHtml(o.id)}" title="Edit">Edit</button>
                        <button class="dash-btn dash-btn-ghost dash-btn-sm" data-del="${escapeHtml(o.id)}" title="Delete">Delete</button>
                    </td>
                </tr>
            `).join('');
            tbody.querySelectorAll('[data-edit]').forEach((btn) => {
                btn.addEventListener('click', () => openOrderEdit(btn.dataset.edit));
            });
            tbody.querySelectorAll('[data-del]').forEach((btn) => {
                btn.addEventListener('click', () => requestDeleteOrder(btn.dataset.del));
            });
        }
    }

    function openOrderEdit(id) {
        const orders = getOrders();
        const o = id ? orders.find((x) => x.id === id) : null;
        document.getElementById('dashOrderModalTitle').textContent = o ? 'Edit Order' : 'Add Order';
        document.getElementById('dashOrderEditId').value = o ? o.id : '';
        document.getElementById('dashOrderCustomer').value = o ? o.customer : '';
        document.getElementById('dashOrderContact').value = o ? o.contact : '';
        document.getElementById('dashOrderEventDate').value = o ? o.eventDate : '';
        document.getElementById('dashOrderCakeType').value = o ? o.cakeType : '';
        document.getElementById('dashOrderDetails').value = o ? o.details || '' : '';
        document.getElementById('dashOrderTotal').value = o ? o.totalAmount || 0 : 0;
        document.getElementById('dashOrderDownpayment').value = o ? o.downpayment || 0 : 0;
        document.getElementById('dashOrderStatus').value = o ? o.status : 'Pending';
        document.getElementById('dashOrderError').style.display = 'none';
        openModal(document.getElementById('dashOrderModal'));
    }

    function saveOrderFromForm() {
        const customer = document.getElementById('dashOrderCustomer').value.trim();
        const contact = document.getElementById('dashOrderContact').value.trim();
        const eventDate = document.getElementById('dashOrderEventDate').value;
        const cakeType = document.getElementById('dashOrderCakeType').value;
        const details = document.getElementById('dashOrderDetails').value.trim();
        const total = Number(document.getElementById('dashOrderTotal').value) || 0;
        const downpayment = Number(document.getElementById('dashOrderDownpayment').value) || 0;
        const status = document.getElementById('dashOrderStatus').value;
        const errorEl = document.getElementById('dashOrderError');
        const editId = document.getElementById('dashOrderEditId').value || null;

        if (!customer || !contact || !eventDate || !cakeType) {
            errorEl.textContent = 'Customer, contact, event date, and cake type are required.';
            errorEl.style.display = 'block';
            return;
        }

        const orders = getOrders();
        const existing = editId ? orders.find((o) => o.id === editId) : null;
        const now = new Date().toISOString();
        const order = {
            id: editId || uid(),
            orderNo: (existing && existing.orderNo) || nextOrderNo(orders),
            customer,
            contact,
            eventDate,
            cakeType,
            details,
            totalAmount: total,
            downpayment,
            status,
            createdAt: (existing && existing.createdAt) || now
        };
        const updated = editId ? orders.map((o) => (o.id === editId ? order : o)) : [...orders, order];
        if (!saveOrders(updated)) {
            errorEl.textContent = 'Could not save order. Storage may be full.';
            errorEl.style.display = 'block';
            return;
        }
        closeModal(document.getElementById('dashOrderModal'));
        renderOrders();
        renderOverview();
    }

    function requestDeleteOrder(id) {
        const o = getOrders().find((x) => x.id === id);
        showConfirm('Delete order', 'Delete order ' + escapeHtml(o.orderNo) + '?', () => {
            const orders = getOrders().filter((x) => x.id !== id);
            saveOrders(orders);
            renderOrders();
            renderOverview();
        });
    }

    function exportCsv() {
        const list = filteredOrders();
        const rows = [
            ['Order No', 'Customer', 'Contact', 'Event Date', 'Cake Type', 'Total', 'Balance', 'Status', 'Created At']
        ];
        list.forEach((o) => {
            rows.push([
                o.orderNo,
                o.customer,
                o.contact,
                o.eventDate,
                o.cakeType,
                o.totalAmount,
                (Number(o.totalAmount) || 0) - (Number(o.downpayment) || 0),
                o.status,
                o.createdAt
            ]);
        });
        const csv = rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kookielicious-orders.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    /* ===== GALLERY ===== */
    function renderGallery() {
        const gallery = getGallery();
        const grid = document.getElementById('dashGalleryGrid');
        const empty = document.getElementById('dashGalleryEmpty');
        if (gallery.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';
        grid.innerHTML = gallery.map((item, i) => `
            <div class="dash-gallery-card">
                <img class="dash-gallery-thumb" src="${escapeHtml(item.src)}" alt="${escapeHtml(item.title)}">
                <div class="dash-gallery-body">
                    <div class="dash-gallery-head">
                        <span class="dash-gallery-title">${escapeHtml(item.title)}</span>
                        <span class="dash-gallery-cat">${escapeHtml(item.category)}</span>
                    </div>
                    <label class="dash-toggle">
                        <input type="checkbox" data-vis="${escapeHtml(item.id)}" ${item.visible ? 'checked' : ''}>
                        <span>Visible</span>
                    </label>
                    <div class="dash-gallery-actions">
                        <button class="dash-btn dash-btn-ghost dash-btn-sm" data-edit="${escapeHtml(item.id)}" title="Edit">Edit</button>
                        <button class="dash-btn dash-btn-ghost dash-btn-sm" data-del="${escapeHtml(item.id)}" title="Delete">Delete</button>
                        <button class="dash-btn dash-btn-ghost dash-btn-sm" data-up="${escapeHtml(item.id)}" ${i === 0 ? 'disabled' : ''} title="Move up">&#9650;</button>
                        <button class="dash-btn dash-btn-ghost dash-btn-sm" data-down="${escapeHtml(item.id)}" ${i === gallery.length - 1 ? 'disabled' : ''} title="Move down">&#9660;</button>
                    </div>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('[data-vis]').forEach((cb) => {
            cb.addEventListener('change', () => {
                const g = getGallery();
                const item = g.find((x) => x.id === cb.dataset.vis);
                if (item) {
                    item.visible = cb.checked;
                    saveGallery(g);
                }
            });
        });
        grid.querySelectorAll('[data-edit]').forEach((btn) => {
            btn.addEventListener('click', () => openGalleryEdit(btn.dataset.edit));
        });
        grid.querySelectorAll('[data-del]').forEach((btn) => {
            btn.addEventListener('click', () => requestDeleteGallery(btn.dataset.del));
        });
        grid.querySelectorAll('[data-up]').forEach((btn) => {
            btn.addEventListener('click', () => moveGalleryItem(btn.dataset.up, -1));
        });
        grid.querySelectorAll('[data-down]').forEach((btn) => {
            btn.addEventListener('click', () => moveGalleryItem(btn.dataset.down, 1));
        });
    }

    function moveGalleryItem(id, dir) {
        const g = getGallery();
        const i = g.findIndex((x) => x.id === id);
        const target = i + dir;
        if (target < 0 || target >= g.length) return;
        [g[i], g[target]] = [g[target], g[i]];
        saveGallery(g);
        renderGallery();
    }

    function requestDeleteGallery(id) {
        const item = getGallery().find((x) => x.id === id);
        showConfirm('Delete cake', 'Delete "' + escapeHtml(item.title) + '" from the gallery?', () => {
            const g = getGallery().filter((x) => x.id !== id);
            saveGallery(g);
            renderGallery();
        });
    }

    function openGalleryEdit(id) {
        const item = id ? getGallery().find((x) => x.id === id) : null;
        editingGalleryId = id || null;
        galleryNewSrc = null;
        document.getElementById('dashGalleryModalTitle').textContent = item ? 'Edit Cake' : 'Add Cake';
        document.getElementById('dashGalleryEditId').value = item ? item.id : '';
        document.getElementById('dashGalleryTitle').value = item ? item.title : '';
        document.getElementById('dashGalleryCategory').value = item ? item.category : 'birthday';
        document.getElementById('dashGalleryVisible').checked = item ? item.visible : true;
        const preview = document.getElementById('dashGalleryPreview');
        preview.src = item ? item.src : '';
        preview.style.display = item ? 'block' : 'none';
        document.getElementById('dashGalleryImage').value = '';
        document.getElementById('dashGalleryImageReq').textContent = item ? '' : '*';
        document.getElementById('dashGalleryError').style.display = 'none';
        openModal(document.getElementById('dashGalleryModal'));
    }

    document.getElementById('dashGalleryImage').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const preview = document.getElementById('dashGalleryPreview');
        const dataUrl = await readFile(file);
        preview.src = dataUrl;
        preview.style.display = 'block';
        galleryNewSrc = await resizeImage(dataUrl, 1000, 0.8);
    });

    document.getElementById('dashGalleryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('dashGalleryTitle').value.trim();
        const category = document.getElementById('dashGalleryCategory').value;
        const visible = document.getElementById('dashGalleryVisible').checked;
        const errorEl = document.getElementById('dashGalleryError');
        if (!title) {
            errorEl.textContent = 'Title is required';
            errorEl.style.display = 'block';
            return;
        }
        const gallery = getGallery();
        let src;
        if (editingGalleryId) {
            const existing = gallery.find((x) => x.id === editingGalleryId);
            src = galleryNewSrc || (existing ? existing.src : '');
        } else {
            if (!galleryNewSrc) {
                errorEl.textContent = 'Please choose an image';
                errorEl.style.display = 'block';
                return;
            }
            src = galleryNewSrc;
        }
        const entry = { id: editingGalleryId || uid(), src, title, category, visible };
        const updated = editingGalleryId
            ? gallery.map((x) => (x.id === editingGalleryId ? entry : x))
            : [...gallery, entry];
        if (!saveGallery(updated)) {
            errorEl.textContent = 'Could not save. Local storage may be full. Export a backup and use smaller images.';
            errorEl.style.display = 'block';
            return;
        }
        closeModal(document.getElementById('dashGalleryModal'));
        renderGallery();
    });

    document.getElementById('dashResetGallery').addEventListener('click', () => {
        showConfirm('Reset gallery', 'Restore the default gallery? All custom gallery items will be removed.', () => {
            saveGallery(getDefaultGallery());
            renderGallery();
        });
    });

    /* ===== SETTINGS ===== */
    document.getElementById('dashPasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const admin = getAdmin();
        const current = document.getElementById('dashPassCurrent').value;
        const newPass = document.getElementById('dashPassNew').value;
        const confirm = document.getElementById('dashPassConfirm').value;
        const errorEl = document.getElementById('dashPassError');
        if (!admin || (await sha256(current)) !== admin.passwordHash) {
            errorEl.textContent = 'Current password is incorrect';
            errorEl.style.display = 'block';
            return;
        }
        if (newPass.length < 6) {
            errorEl.textContent = 'New password must be at least 6 characters';
            errorEl.style.display = 'block';
            return;
        }
        if (newPass !== confirm) {
            errorEl.textContent = 'Passwords do not match';
            errorEl.style.display = 'block';
            return;
        }
        try {
            saveAdmin({ username: admin.username, passwordHash: await sha256(newPass) });
            errorEl.style.display = 'none';
            document.getElementById('dashPasswordForm').reset();
        } catch (err) {
            errorEl.textContent = 'Could not save password';
            errorEl.style.display = 'block';
        }
    });

    document.getElementById('dashExportBackup').addEventListener('click', () => {
        const backup = { gallery: getGallery(), orders: getOrders() };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kookielicious-backup.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('dashImportFile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const text = await readFile(file);
            const data = JSON.parse(text);
            if (!data || !Array.isArray(data.gallery) || !Array.isArray(data.orders)) {
                throw new Error('Invalid backup format');
            }
            showConfirm('Import backup', 'This will replace all current gallery and orders data. Continue?', () => {
                saveGallery(data.gallery);
                saveOrders(data.orders);
                renderCurrentPage();
                e.target.value = '';
            });
        } catch (err) {
            alert('Invalid backup file: ' + err.message);
        }
    });

    document.getElementById('dashDeleteAllOrders').addEventListener('click', () => {
        showConfirm('Delete all orders', 'Delete every order? This cannot be undone.', () => {
            saveOrders([]);
            renderOrders();
            renderOverview();
        });
    });

    function renderCurrentPage() {
        const active = document.querySelector('.dash-page.dash-page-active');
        if (!active) return;
        if (active.id === 'dashPageOverview') renderOverview();
        else if (active.id === 'dashPageOrders') renderOrders();
        else if (active.id === 'dashPageGallery') renderGallery();
    }

    /* ===== MODALS ===== */
    function showConfirm(title, message, callback) {
        document.getElementById('dashConfirmTitle').textContent = title;
        document.getElementById('dashConfirmMessage').textContent = message;
        confirmCallback = callback;
        openModal(document.getElementById('dashConfirmModal'));
    }

    document.getElementById('dashConfirmOk').addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        confirmCallback = null;
        closeModal(document.getElementById('dashConfirmModal'));
    });
    document.getElementById('dashConfirmCancel').addEventListener('click', () => {
        confirmCallback = null;
        closeModal(document.getElementById('dashConfirmModal'));
    });

    document.querySelectorAll('.dash-modal-close').forEach((btn) => {
        btn.addEventListener('click', () => closeModal(btn.closest('.dash-modal')));
    });
    document.querySelectorAll('.dash-modal').forEach((modal) => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.dash-modal:not(.hidden)').forEach((modal) => closeModal(modal));
        }
    });

    /* Order form wiring */
    document.getElementById('dashOrderForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveOrderFromForm();
    });
    document.getElementById('dashOrderModalCancel').addEventListener('click', () => {
        closeModal(document.getElementById('dashOrderModal'));
    });
    document.getElementById('dashAddOrder').addEventListener('click', () => openOrderEdit(null));
    document.getElementById('dashExportCsv').addEventListener('click', exportCsv);
    document.getElementById('dashOrderSearch').addEventListener('input', (e) => {
        orderSearch = e.target.value.toLowerCase();
        renderOrders();
    });
    document.getElementById('dashOrderFilter').addEventListener('change', (e) => {
        orderStatusFilter = e.target.value;
        renderOrders();
    });
    document.getElementById('dashOrdersTable').querySelector('th[data-sort="eventDate"]').addEventListener('click', () => {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        renderOrders();
    });

    /* Gallery buttons */
    document.getElementById('dashAddCake').addEventListener('click', () => openGalleryEdit(null));
    document.getElementById('dashGalleryModalCancel').addEventListener('click', () => {
        closeModal(document.getElementById('dashGalleryModal'));
    });

    /* Sidebar mobile */
    menuToggle.addEventListener('click', () => {
        const open = !sidebar.classList.contains('dash-sidebar-open');
        sidebar.classList.toggle('dash-sidebar-open');
        overlay.classList.toggle('dash-overlay-open');
    });
    overlay.addEventListener('click', closeSidebar);
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeSidebar();
    });

    /* ===== INIT ===== */
    document.addEventListener('DOMContentLoaded', () => {
        initNav();
        if (sessionActive()) {
            loginPage.hidden = true;
            shell.hidden = false;
            topbarUser.textContent = (getAdmin() || {}).username || '';
            showPage('overview');
        } else {
            loginPage.hidden = false;
            shell.hidden = true;
            renderAuth();
        }
    });
})();
