/* ===== Kookielicious Cakes by Lykz - Main Script ===== */

document.addEventListener('DOMContentLoaded', () => {

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

    /* ===== GALLERY FILTER ===== */
    const filterButtons = document.querySelectorAll('.filter-btn');
    const galleryCards = document.querySelectorAll('.gallery-card');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filter = button.dataset.filter;

            galleryCards.forEach(card => {
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
    const galleryItems = [...galleryCards];

    const openLightbox = (index) => {
        currentIndex = index;
        const card = galleryItems[index];
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
        currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
        updateLightbox();
    };

    const showNext = () => {
        currentIndex = (currentIndex + 1) % galleryItems.length;
        updateLightbox();
    };

    const updateLightbox = () => {
        const card = galleryItems[currentIndex];
        const img = card.querySelector('img');
        const title = card.querySelector('.gallery-title').textContent;

        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightboxTitle.textContent = title;
    };

    galleryCards.forEach((card, index) => {
        card.addEventListener('click', () => openLightbox(index));
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

    /* ===== ORDER FORM VALIDATION & MAILTO SUBMISSION ===== */
    const orderForm = document.getElementById('orderForm');
    const formSuccess = document.getElementById('formSuccess');

    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const fullName = document.getElementById('fullName').value.trim();
        const contactNumber = document.getElementById('contactNumber').value.trim();
        const eventDate = document.getElementById('eventDate').value;
        const cakeType = document.getElementById('cakeType').value;
        const cakeDetails = document.getElementById('cakeDetails').value.trim();

        if (!fullName || !contactNumber || !eventDate || !cakeType || !cakeDetails) {
            return;
        }

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
    });

});
