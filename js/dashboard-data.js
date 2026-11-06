/* ===== Kookielicious Cakes by Lykz - Dashboard Data Helpers (Supabase) =====
   Async wrappers around Supabase calls for gallery and orders.
   Every call checks the returned { data, error } and is wrapped in try/catch.
*/

/* Image resize helper: max width 1400px, JPEG quality 0.85 */
async function resizeImage(file, maxWidth, quality) {
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
        img.src = URL.createObjectURL(file);
    });
}

/* Gallery helpers */
async function fetchGallery() {
    try {
        const { data, error } = await sb.from('gallery').select('*').order('sort_order');
        if (error) throw error;
        return data || [];
    } catch (err) {
        return [];
    }
}

async function saveGalleryItem(item) {
    try {
        const payload = {
            title: item.title,
            category: item.category,
            image_url: item.image_url,
            storage_path: item.storage_path || null,
            visible: item.visible !== undefined ? item.visible : true,
            sort_order: item.sort_order
        };
        if (item.id) {
            const { error } = await sb.from('gallery').update(payload).eq('id', item.id);
            if (error) throw error;
            return item.id;
        } else {
            const { data, error } = await sb.from('gallery').insert(payload).select('id').single();
            if (error) throw error;
            return data.id;
        }
    } catch (err) {
        throw err;
    }
}

async function deleteGalleryItem(id, storagePath) {
    try {
        const { error } = await sb.from('gallery').delete().eq('id', id);
        if (error) throw error;
        if (storagePath) {
            try {
                await sb.storage.from('cake-images').remove([storagePath]);
            } catch (e) {
                // storage delete failure shouldn't block row delete
            }
        }
    } catch (err) {
        throw err;
    }
}

/* Order helpers */
async function fetchOrders() {
    try {
        const { data, error } = await sb.from('orders').select('*').order('event_date', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) {
        return [];
    }
}

async function saveOrder(order) {
    try {
        const payload = {
            order_no: order.order_no,
            customer: order.customer,
            contact: order.contact,
            event_date: order.event_date,
            cake_type: order.cake_type,
            details: order.details || '',
            total_amount: order.total_amount || 0,
            downpayment: order.downpayment || 0,
            status: order.status || 'Pending',
            source: order.source || 'dashboard'
        };
        if (order.id) {
            const { error } = await sb.from('orders').update(payload).eq('id', order.id);
            if (error) throw error;
            return order.id;
        } else {
            const { data, error } = await sb.from('orders').insert(payload).select().single();
            if (error) throw error;
            return data;
        }
    } catch (err) {
        throw err;
    }
}

async function deleteOrder(id) {
    try {
        const { error } = await sb.from('orders').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        throw err;
    }
}

async function deleteAllOrders() {
    try {
        const { error } = await sb.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
    } catch (err) {
        throw err;
    }
}

/* Backup export */
async function exportBackup() {
    try {
        const { data: gallery } = await sb.from('gallery').select('*');
        const { data: orders } = await sb.from('orders').select('*');
        const backup = { gallery: gallery || [], orders: orders || [] };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kookielicious-backup.json';
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        throw err;
    }
}
