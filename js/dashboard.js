/* ===== Kookielicious Cakes by Lykz - Admin Dashboard (Supabase) =====
   Client-side login via Supabase Auth. All data stored in Supabase.
   Not real security for public use; keeps dashboard access controlled on this device.
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
    let galleryNewFile = null;
    let galleryOldStoragePath = null;
    let autoRefreshTimer = null;
    let ordersData = [];

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

    function orderNoDisplay(orderNo) {
        return 'KC-' + String(orderNo || 0).padStart(4, '0');
    }

    function openModal(modal) { modal.classList.remove('hidden'); }
    function closeModal(modal) { modal.classList.add('hidden'); }

    function showPageError(containerId, message) {
        const el = document.getElementById(containerId);
        if (el) {
            el.textContent = message;
            el.style.display = 'block';
        }
    }

    function hidePageError(containerId) {
        const el = document.getElementById(containerId);
        if (el) el.style.display = 'none';
    }

    /* ===== AUTH ===== */
    function renderLogin() {
        loginContainer.innerHTML = `
            <form id="dashLoginForm">
                <h2>Admin Login</h2>
                <p>Sign in to manage your cake business.</p>
                <div class="dash-form-group">
                    <label for="dashLoginEmail">Email</label>
                    <input type="email" id="dashLoginEmail" required autocomplete="username">
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

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('dashLoginEmail').value.trim();
        const password = document.getElementById('dashLoginPass').value;
        const errorEl = document.getElementById('dashLoginError');
        if (!email || !password) {
            errorEl.textContent = 'Please enter email and password';
            errorEl.style.display = 'block';
            return;
        }
        try {
            const { error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (err) {
            errorEl.textContent = 'Incorrect email or password';
            errorEl.style.display = 'block';
        }
    }

    function doLogout() {
        sb.auth.signOut();
    }

    function setAuthUI(authenticated, user) {
        if (authenticated) {
            loginPage.hidden = true;
            shell.hidden = false;
            topbarUser.textContent = user ? (user.email || '') : '';
            showPage('overview');
        } else {
            shell.hidden = true;
            loginPage.hidden = false;
            renderLogin();
        }
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
        startAutoRefreshIfNeeded(pageId);
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

    /* ===== AUTO REFRESH ===== */
    function startAutoRefreshIfNeeded(pageId) {
        stopAutoRefresh();
        if (pageId === 'orders' || pageId === 'overview') {
            autoRefreshTimer = setInterval(() => {
                if (pageId === 'orders') renderOrders();
                else if (pageId === 'overview') renderOverview();
            }, 30000);
        }
    }

    function stopAutoRefresh() {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
            autoRefreshTimer = null;
        }
    }

    /* ===== OVERVIEW ===== */
    function countUpcoming(orders) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const limit = new Date(today);
        limit.setDate(today.getDate() + 7);
        return orders.filter((o) => {
            if (o.status === 'Completed' || o.status === 'Cancelled') return false;
            const d = new Date(o.event_date);
            if (isNaN(d)) return false;
            d.setHours(0, 0, 0, 0);
            return d >= today && d <= limit;
        }).length;
    }

    async function renderOverview() {
        const orders = await fetchOrders();
        ordersData = orders;
        const total = orders.length;
        const pending = orders.filter((o) => o.status === 'Pending').length;
        const upcoming = countUpcoming(orders);
        const sales = orders
            .filter((o) => o.status === 'Completed')
            .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

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
            const d = new Date(o.created_at || o.event_date);
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
                const d = new Date(o.event_date);
                if (isNaN(d)) return false;
                d.setHours(0, 0, 0, 0);
                return d >= today && d <= limit;
            })
            .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
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
                        <div style="font-weight:600;color:var(--gold-light);">${formatDate(o.event_date)}</div>
                        <div style="color:var(--cream);font-size:0.9rem;">${escapeHtml(o.customer)} &#8226; ${escapeHtml(o.cake_type)}</div>
                    </div>
                    <span class="dash-badge ${badgeClass(o.status)}">${o.status}</span>
                </div>
            `).join('');
        }
    }

    /* ===== ORDERS ===== */
    function filteredOrders() {
        return ordersData.filter((o) => {
            const term = orderSearch;
            const matchSearch = !term ||
                (o.customer && o.customer.toLowerCase().includes(term)) ||
                (o.contact && o.contact.toLowerCase().includes(term)) ||
                (orderNoDisplay(o.order_no) && orderNoDisplay(o.order_no).toLowerCase().includes(term));
            const matchStatus = !orderStatusFilter || o.status === orderStatusFilter;
            return matchSearch && matchStatus;
        });
    }

    async function renderOrders() {
        const orders = await fetchOrders();
        ordersData = orders;
        let list = filteredOrders();
        list.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
        if (sortDir === 'desc') list.reverse();

        const tbody = document.getElementById('dashOrdersBody');
        const empty = document.getElementById('dashOrdersEmpty');
        const errorContainer = document.getElementById('dashOrdersError');

        if (list.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            hidePageError('dashOrdersError');
        } else {
            empty.style.display = 'none';
            hidePageError('dashOrdersError');
            tbody.innerHTML = list.map((o) => {
                const newBadge = (o.source === 'website' && o.status === 'Pending')
                    ? '<span class="dash-badge dash-badge-new" style="margin-left:0.5rem;background:var(--gold);">New</span>'
                    : '';
                return `
                <tr>
                    <td><span class="dash-order-no">${escapeHtml(orderNoDisplay(o.order_no))}</span></td>
                    <td>${escapeHtml(o.customer)}${newBadge}</td>
                    <td>${escapeHtml(o.contact)}</td>
                    <td>${formatDate(o.event_date)}</td>
                    <td>${escapeHtml(o.cake_type)}</td>
                    <td>${formatPeso(o.total_amount)}</td>
                    <td>${formatPeso((Number(o.total_amount) || 0) - (Number(o.downpayment) || 0))}</td>
                    <td><span class="dash-badge ${badgeClass(o.status)}">${o.status}</span></td>
                    <td>
                        <button class="dash-btn dash-btn-ghost dash-btn-sm" data-edit="${escapeHtml(o.id)}" title="Edit">Edit</button>
                        <button class="dash-btn dash-btn-ghost dash-btn-sm" data-del="${escapeHtml(o.id)}" title="Delete">Delete</button>
                    </td>
                </tr>
            `;
            }).join('');
            tbody.querySelectorAll('[data-edit]').forEach((btn) => {
                btn.addEventListener('click', () => openOrderEdit(btn.dataset.edit));
            });
            tbody.querySelectorAll('[data-del]').forEach((btn) => {
                btn.addEventListener('click', () => requestDeleteOrder(btn.dataset.del));
            });
        }
    }

    function openOrderEdit(id) {
        const o = ordersData.find((x) => x.id === id) || null;
        document.getElementById('dashOrderModalTitle').textContent = o ? 'Edit Order' : 'Add Order';
        document.getElementById('dashOrderEditId').value = o ? o.id : '';
        document.getElementById('dashOrderCustomer').value = o ? o.customer : '';
        document.getElementById('dashOrderContact').value = o ? o.contact : '';
        document.getElementById('dashOrderEventDate').value = o ? o.event_date : '';
        document.getElementById('dashOrderCakeType').value = o ? o.cake_type : '';
        document.getElementById('dashOrderDetails').value = o ? o.details || '' : '';
        document.getElementById('dashOrderTotal').value = o ? o.total_amount || 0 : 0;
        document.getElementById('dashOrderDownpayment').value = o ? o.downpayment || 0 : 0;
        document.getElementById('dashOrderStatus').value = o ? o.status : 'Pending';
        document.getElementById('dashOrderError').style.display = 'none';
        openModal(document.getElementById('dashOrderModal'));
    }

    async function saveOrderFromForm() {
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

        const existing = editId ? ordersData.find((o) => o.id === editId) : null;
        const order = {
            id: editId || null,
            order_no: (existing && existing.order_no) || null,
            customer,
            contact,
            event_date: eventDate,
            cake_type: cakeType,
            details,
            total_amount: total,
            downpayment,
            status,
            source: 'dashboard'
        };

        try {
            await saveOrder(order);
            closeModal(document.getElementById('dashOrderModal'));
            renderOrders();
            renderOverview();
        } catch (err) {
            errorEl.textContent = 'Could not save order. Check your connection and try again.';
            errorEl.style.display = 'block';
        }
    }

    function requestDeleteOrder(id) {
        const o = ordersData.find((x) => x.id === id);
        if (!o) return;
        showConfirm('Delete order', 'Delete order ' + escapeHtml(orderNoDisplay(o.order_no)) + '?', async () => {
            try {
                await deleteOrder(id);
                renderOrders();
                renderOverview();
            } catch (err) {
                showConfirm('Error', 'Could not delete order. Check your connection.', () => {});
            }
        });
    }

    function exportCsv() {
        const list = filteredOrders();
        const rows = [
            ['Order No', 'Customer', 'Contact', 'Event Date', 'Cake Type', 'Total', 'Balance', 'Status', 'Created At']
        ];
        list.forEach((o) => {
            rows.push([
                orderNoDisplay(o.order_no),
                o.customer,
                o.contact,
                o.event_date,
                o.cake_type,
                o.total_amount,
                (Number(o.total_amount) || 0) - (Number(o.downpayment) || 0),
                o.status,
                o.created_at
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
    async function renderGallery() {
        const gallery = await fetchGallery();
        const grid = document.getElementById('dashGalleryGrid');
        const empty = document.getElementById('dashGalleryEmpty');
        if (!gallery || gallery.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';
        grid.innerHTML = gallery.map((item, i) => `
            <div class="dash-gallery-card">
                <img class="dash-gallery-thumb" src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}">
                <div class="dash-gallery-body">
                    <div class="dash-gallery-head">
                        <span class="dash-gallery-title">${escapeHtml(item.title)}</span>
                        <span class="dash-gallery-cat">${escapeHtml(item.category)}</span>
                    </div>
                    <label class="dash-toggle">
                        <input type="checkbox" data-id="${escapeHtml(item.id)}" ${item.visible ? 'checked' : ''}>
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

        grid.querySelectorAll('[data-id]').forEach((cb) => {
            cb.addEventListener('change', async () => {
                const id = cb.dataset.id;
                const item = gallery.find((x) => x.id === id);
                if (!item) return;
                try {
                    await saveGalleryItem({ id, title: item.title, category: item.category, image_url: item.image_url, storage_path: item.storage_path, visible: cb.checked, sort_order: item.sort_order });
                } catch (err) {
                    cb.checked = !cb.checked;
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

    async function moveGalleryItem(id, dir) {
        const gallery = await fetchGallery();
        const i = gallery.findIndex((x) => x.id === id);
        const target = i + dir;
        if (target < 0 || target >= gallery.length) return;
        const a = gallery[i];
        const b = gallery[target];
        const temp = a.sort_order;
        a.sort_order = b.sort_order;
        b.sort_order = temp;
        try {
            await saveGalleryItem(a);
            await saveGalleryItem(b);
            renderGallery();
        } catch (err) {
            // ignore
        }
    }

    function requestDeleteGallery(id) {
        const gallery = ordersData; // not used, fetch fresh
        fetchGallery().then((g) => {
            const item = g.find((x) => x.id === id);
            if (!item) return;
            showConfirm('Delete cake', 'Delete "' + escapeHtml(item.title) + '" from the gallery?', async () => {
                try {
                    await deleteGalleryItem(id, item.storage_path);
                    renderGallery();
                } catch (err) {
                    showConfirm('Error', 'Could not delete cake. Check your connection.', () => {});
                }
            });
        });
    }

    function openGalleryEdit(id) {
        editingGalleryId = id || null;
        galleryNewFile = null;
        galleryOldStoragePath = null;
        fetchGallery().then((gallery) => {
            const item = id ? gallery.find((x) => x.id === id) : null;
            document.getElementById('dashGalleryModalTitle').textContent = item ? 'Edit Cake' : 'Add Cake';
            document.getElementById('dashGalleryEditId').value = item ? item.id : '';
            document.getElementById('dashGalleryTitle').value = item ? item.title : '';
            document.getElementById('dashGalleryCategory').value = item ? item.category : 'birthday';
            document.getElementById('dashGalleryVisible').checked = item !== undefined ? item.visible : true;
            const preview = document.getElementById('dashGalleryPreview');
            preview.src = item ? item.image_url : '';
            preview.style.display = item ? 'block' : 'none';
            document.getElementById('dashGalleryImage').value = '';
            document.getElementById('dashGalleryImageReq').textContent = item ? '' : '*';
            document.getElementById('dashGalleryError').style.display = 'none';
            if (item && item.storage_path) galleryOldStoragePath = item.storage_path;
            openModal(document.getElementById('dashGalleryModal'));
        });
    }

    document.getElementById('dashGalleryImage').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        galleryNewFile = file;
        const preview = document.getElementById('dashGalleryPreview');
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
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

        let image_url = '';
        let storage_path = null;

        if (editingGalleryId) {
            // Edit: keep existing image unless replaced
            const existing = ordersData; // placeholder
            fetchGallery().then(async (gallery) => {
                const item = gallery.find((x) => x.id === editingGalleryId);
                if (!item) return;
                image_url = item.image_url;
                storage_path = item.storage_path || null;

                if (galleryNewFile) {
                    try {
                        const resized = await resizeImage(galleryNewFile, 1400, 0.85);
                        const blob = await fetch(resized).then((r) => r.blob());
                        const safeName = galleryNewFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                        const path = `${Date.now()}-${safeName}`;
                        const { error: upErr } = await sb.storage.from('cake-images').upload(path, blob);
                        if (upErr) throw upErr;
                        const { data: pub } = sb.storage.from('cake-images').getPublicUrl(path);
                        image_url = pub.publicUrl;
                        storage_path = path;
                        // Delete old file if it had a storage path
                        if (item.storage_path) {
                            try { await sb.storage.from('cake-images').remove([item.storage_path]); } catch (e) { /* ignore */ }
                        }
                    } catch (err) {
                        errorEl.textContent = 'Image upload failed. Check your connection.';
                        errorEl.style.display = 'block';
                        return;
                    }
                }

                try {
                    await saveGalleryItem({
                        id: editingGalleryId,
                        title,
                        category,
                        image_url,
                        storage_path,
                        visible,
                        sort_order: item.sort_order
                    });
                    closeModal(document.getElementById('dashGalleryModal'));
                    renderGallery();
                } catch (err) {
                    errorEl.textContent = 'Could not save cake. Check your connection.';
                    errorEl.style.display = 'block';
                }
            });
        } else {
            // Add: image required
            if (!galleryNewFile) {
                errorEl.textContent = 'Please choose an image';
                errorEl.style.display = 'block';
                return;
            }
            try {
                const resized = await resizeImage(galleryNewFile, 1400, 0.85);
                const blob = await fetch(resized).then((r) => r.blob());
                const safeName = galleryNewFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const path = `${Date.now()}-${safeName}`;
                const { error: upErr } = await sb.storage.from('cake-images').upload(path, blob);
                if (upErr) throw upErr;
                const { data: pub } = sb.storage.from('cake-images').getPublicUrl(path);
                image_url = pub.publicUrl;
                storage_path = path;

                // Get highest sort_order
                const gallery = await fetchGallery();
                const maxSort = gallery.reduce((max, item) => Math.max(max, Number(item.sort_order || 0)), 0);

                await saveGalleryItem({
                    title,
                    category,
                    image_url,
                    storage_path,
                    visible,
                    sort_order: maxSort + 1
                });
                closeModal(document.getElementById('dashGalleryModal'));
                renderGallery();
            } catch (err) {
                errorEl.textContent = 'Image upload failed. Check your connection.';
                errorEl.style.display = 'block';
            }
        }
    });

    /* ===== SETTINGS ===== */
    document.getElementById('dashPasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPass = document.getElementById('dashPassNew').value;
        const confirm = document.getElementById('dashPassConfirm').value;
        const errorEl = document.getElementById('dashPassError');
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
            const { error } = await sb.auth.updateUser({ password: newPass });
            if (error) throw error;
            errorEl.style.display = 'none';
            document.getElementById('dashPasswordForm').reset();
        } catch (err) {
            errorEl.textContent = 'Could not change password';
            errorEl.style.display = 'block';
        }
    });

    document.getElementById('dashExportBackup').addEventListener('click', async () => {
        try {
            await exportBackup();
        } catch (err) {
            // silent
        }
    });

    document.getElementById('dashDeleteAllOrders').addEventListener('click', () => {
        showConfirm('Delete all orders', 'Delete every order? This cannot be undone.', async () => {
            try {
                await deleteAllOrders();
                renderOrders();
                renderOverview();
            } catch (err) {
                showConfirm('Error', 'Could not delete orders. Check your connection.', () => {});
            }
        });
    });

    /* ===== RENDER CURRENT PAGE ===== */
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
    document.getElementById('dashRefreshOrders').addEventListener('click', () => {
        renderOrders();
    });
    document.getElementById('dashOrderSearch').addEventListener('input', (e) => {
        orderSearch = e.target.value.toLowerCase();
        renderOrders();
    });
    document.getElementById('dashOrderFilter').addEventListener('change', (e) => {
        orderStatusFilter = e.target.value;
        renderOrders();
    });
    const sortTh = document.getElementById('dashOrdersTable').querySelector('th[data-sort="eventDate"]');
    if (sortTh) {
        sortTh.addEventListener('click', () => {
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            renderOrders();
        });
    }

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
        renderLogin();
        sb.auth.getSession().then(({ data }) => {
            setAuthUI(!!data.session, data.session ? data.session.user : null);
        });
        sb.auth.onAuthStateChange((event, session) => {
            setAuthUI(event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED', session ? session.user : null);
            if (event === 'SIGNED_OUT') {
                stopAutoRefresh();
            }
        });
    });
})();
