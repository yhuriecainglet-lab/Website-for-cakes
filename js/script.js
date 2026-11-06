/* ===== Kookielicious Cakes by Lykz - Main Script ===== */

const GALLERY_FALLBACK = [
    { title: 'Pink & Blue Christening Set', category: 'christening', src: 'images/476964397_1734633784061425_9081176933088120602_n.jpg', alt: 'Pink & Blue Christening Set - round white cake with star toppers and pink/blue cupcakes' },
    { title: 'Rainbow Unicorn Cake', category: 'birthday', src: 'images/211210521_915464542645024_5184086500641054154_n.jpg', alt: 'Rainbow Unicorn Cake - white round cake with gold horn and colorful rosette mane' },
    { title: 'Under the Sea Cupcakes', category: 'cupcakes', src: 'images/470229193_1697571481100989_454437787587739516_n.jpg', alt: 'Under the Sea Cupcakes - mint green cupcakes with seashells, starfish and seahorses' },
    { title: 'Little Mermaid Cake', category: 'kids', src: 'images/470232715_1697571101101027_7207012082697027500_n.jpg', alt: 'Little Mermaid Cake - mermaid themed cake with fondant mermaid figure and seashells' },
    { title: 'Baby Dino 2nd Birthday Cake', category: 'kids', src: 'images/472632910_1710292949828842_8176161407709832996_n.jpg', alt: 'Baby Dino 2nd Birthday Cake - light blue cake with green dinosaur and white eggs' },
    { title: 'Red Roses & Gold Leaf 18th Birthday Cake', category: 'elegant', src: 'images/472505326_1710292906495513_5377312948419610032_n.jpg', alt: 'Red Roses & Gold Leaf 18th Birthday Cake - white cake with red roses and gold leaf accents' },
    { title: 'Chocolate Pretzel Loaded Cake', category: 'birthday', src: 'images/473597945_1716231842568286_6014189328397794439_n.jpg', alt: 'Chocolate Pretzel Loaded Cake with candy toppings and Happy Birthday topper' }
];

document.addEventListener('DOMContentLoaded', async () => {

    /* ===== MOBILE HAMBURGER TOGGLE ===== */
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('open');
    });

    /* ===== CLOSE MOBILE MENU ON LINK CLICK ===== */
    document.querySelectorAll('.nav-link, .nav-btn').forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu.classList.contains('open')) {
                navMenu.classList.remove('open');
            }
        });
    });

    /* ===== NAVBAR ACTIVE LINK HIGHLIGHTING ON SCROLL ===== */
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');

    const observerOptions = {
        root: null,
        rootMargin: '-50% 0px -50% 0px',
        threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const id = entry.target.id;
            const navLink = document.querySelector(`.nav-link[href="#${id}"]`);
            if (entry.isIntersecting) {
                navLinks.forEach(link => link.classList.remove('active'));
                if (navLink) navLink.classList.add('active');
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        sectionObserver.observe(section);
    });

    /* ===== SCROLL REVEAL ANIMATION ===== */
    const revealElements = document.querySelectorAll('.hero-text, .hero-image, .about-container, .cakes-grid, .gallery, .order, .contact-container, .feature-list, .steps, .gallery-card, .cake-card, .step');

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        threshold: 0.1
    });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
        revealElements.forEach(el => {
            el.classList.add('reveal');
            revealObserver.observe(el);
        });
    } else {
        revealElements.forEach(el => el.classList.add('visible'));
    }

    /* ===== BACK TO TOP BUTTON ===== */
    const backToTop = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* ===== GALLERY FROM SUPABASE ===== */
    const galleryLoading = document.getElementById('galleryLoading');
    const galleryEmpty = document.getElementById('galleryEmpty');
    const galleryGrid = document.getElementById('galleryGrid');

    function renderGalleryCards(items) {
        galleryGrid.innerHTML = '';
        if (!items || items.length === 0) {
            galleryEmpty.style.display = 'block';
            return;
        }
        galleryEmpty.style.display = 'none';
        items.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'gallery-card';
            card.dataset.category = item.category;
            const img = document.createElement('img');
            img.src = item.image_url;
            img.alt = item.alt || item.title;
            img.loading = 'lazy';
            const overlay = document.createElement('div');
            overlay.className = 'gallery-overlay';
            const title = document.createElement('span');
            title.className = 'gallery-title';
            title.textContent = item.title;
            overlay.appendChild(title);
            card.appendChild(img);
            card.appendChild(overlay);
            galleryGrid.appendChild(card);
        });
    }

    async function loadGallery() {
        galleryLoading.style.display = 'block';
        try {
            const { data, error } = await sb.from('gallery').select('*').eq('visible', true).order('sort_order');
            if (error) throw error;
            if (data && data.length > 0) {
                renderGalleryCards(data);
            } else {
                galleryEmpty.style.display = 'block';
            }
        } catch (err) {
            // Fallback: keep hardcoded gallery already in the HTML
        } finally {
            galleryLoading.style.display = 'none';
        }
    }

    await loadGallery();

    /* ===== GALLERY FILTER ===== */
    const filterButtons = document.querySelectorAll('.filter-btn');

    function getGalleryCards() {
        return document.querySelectorAll('.gallery-card');
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filter = button.dataset.filter;
            const cards = getGalleryCards();

            cards.forEach(card => {
                if (filter === 'all' || card.dataset.category === filter) {
                    card.style.display = '';
                    card.classList.remove('filtered-out');
                } else {
                    card.classList.add('filtered-out');
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });

    /* ===== LIGHTBOX ===== */
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');

    let currentIndex = 0;

    function getGalleryItems() {
        return [...getGalleryCards()];
    }

    const openLightbox = (index) => {
        currentIndex = index;
        const items = getGalleryItems();
        const card = items[index];
        const img = card.querySelector('img');
        const title = card.querySelector('.gallery-title').textContent;

        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightboxTitle.textContent = title;

        lightbox.classList.add('show');
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
        lightbox.classList.remove('show');
        document.body.style.overflow = '';
    };

    const showPrev = () => {
        const items = getGalleryItems();
        currentIndex = (currentIndex - 1 + items.length) % items.length;
        updateLightbox();
    };

    const showNext = () => {
        const items = getGalleryItems();
        currentIndex = (currentIndex + 1) % items.length;
        updateLightbox();
    };

    const updateLightbox = () => {
        const items = getGalleryItems();
        const card = items[currentIndex];
        const img = card.querySelector('img');
        const title = card.querySelector('.gallery-title').textContent;

        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightboxTitle.textContent = title;
    };

    // Re-bind lightbox clicks whenever gallery changes (delegation via container)
    galleryGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.gallery-card');
        if (!card) return;
        const items = getGalleryItems();
        const index = items.indexOf(card);
        if (index >= 0) openLightbox(index);
    });

    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', showPrev);
    lightboxNext.addEventListener('click', showNext);

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('show')) return;

        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            showPrev();
        } else if (e.key === 'ArrowRight') {
            showNext();
        }
    });

    /* ===== ORDER FORM VALIDATION & SUBMISSION ===== */
    const orderForm = document.getElementById('orderForm');
    const formSuccess = document.getElementById('formSuccess');
    const submitBtn = orderForm.querySelector('.form-btn');

    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Honeypot check
        const websiteField = orderForm.querySelector('input[name="website"]');
        if (websiteField && websiteField.value.trim() !== '') {
            // Silent pretend success for spam bots
            formSuccess.style.display = 'block';
            formSuccess.textContent = 'Thank you! Your order inquiry has been received. We will contact you soon.';
            orderForm.reset();
            return;
        }

        const fullName = document.getElementById('fullName').value.trim();
        const contactNumber = document.getElementById('contactNumber').value.trim();
        const eventDate = document.getElementById('eventDate').value;
        const cakeType = document.getElementById('cakeType').value;
        const cakeDetails = document.getElementById('cakeDetails').value.trim();

        if (!fullName || !contactNumber || !eventDate || !cakeType || !cakeDetails) {
            return;
        }

        // Client-side length limits
        if (fullName.length > 100 || contactNumber.length > 40 || cakeDetails.length > 2000) {
            return;
        }

        // No past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(eventDate);
        selectedDate.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        try {
            const { error } = await sb.from('orders').insert({
                customer: fullName,
                contact: contactNumber,
                event_date: eventDate,
                cake_type: cakeType,
                details: cakeDetails,
                status: 'Pending',
                source: 'website',
                total_amount: 0,
                downpayment: 0
            });

            if (error) throw error;

            formSuccess.textContent = 'Thank you! Your order inquiry has been received. We will contact you soon.';
            formSuccess.style.display = 'block';
            orderForm.reset();
        } catch (err) {
            // Fallback to mailto
            const bodyLines = [
                `Full Name: ${fullName}`,
                `Contact Number: ${contactNumber}`,
                `Event Date: ${eventDate}`,
                `Cake Type: ${cakeType}`,
                `Cake Details/Theme: ${cakeDetails}`
            ];
            const emailBody = bodyLines.join('\n');
            const subject = `Cake Order Inquiry from ${fullName}`;
            const mailtoLink = `mailto:lykzmeh@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
            formSuccess.style.display = 'block';
            orderForm.reset();
            window.location.href = mailtoLink;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Inquiry';
        }
    });

});
