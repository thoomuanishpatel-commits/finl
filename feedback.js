/* ==========================================================================
   Live Kitchen - Diner Feedback JS Code
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Sliding Navigation Link Indicator & Mouse Hover slide animations
    const navLinksList = document.querySelectorAll("#main-nav .nav-link:not(.portal-link)");
    const navIndicator = document.querySelector("#main-nav .nav-indicator");

    function updateNavIndicator() {
        const activeLink = document.querySelector("#main-nav .nav-link.active");
        if (activeLink && navIndicator) {
            navIndicator.style.width = activeLink.offsetWidth + "px";
            navIndicator.style.left = activeLink.offsetLeft + "px";
        }
    }

    setTimeout(updateNavIndicator, 150);
    window.addEventListener("resize", updateNavIndicator);

    navLinksList.forEach(link => {
        link.addEventListener("mouseenter", () => {
            if (navIndicator) {
                navIndicator.style.width = link.offsetWidth + "px";
                navIndicator.style.left = link.offsetLeft + "px";
            }
        });
    });

    const navBar = document.getElementById("main-nav");
    if (navBar) {
        navBar.addEventListener("mouseleave", () => {
            updateNavIndicator();
        });
    }


    // ==========================================
    // 1. Navigation Cart Indicator Update
    // ==========================================
    function updateCartIndicator() {
        const cartLink = document.getElementById('nav-billing-link');
        if (!cartLink) return;

        let cart = [];
        try {
            const cartData = localStorage.getItem('live_kitchen_cart');
            if (cartData) cart = JSON.parse(cartData);
        } catch (e) {
            console.error("Cart error", e);
        }
        cartLink.textContent = `Billing (${cart.length})`;
    }

    updateCartIndicator();


    // ==========================================
    // 2. Interactive Stars Selector Logic
    // ==========================================
    const ratingContainers = document.querySelectorAll('.rating-stars-interactive');
    const selectedRatings = { taste: 5, hygiene: 5, accuracy: 5 };

    ratingContainers.forEach(container => {
        const stars = container.querySelectorAll('.star-btn');
        const dimension = container.getAttribute('data-rating');

        stars.forEach(star => {
            star.addEventListener('click', () => {
                const val = parseInt(star.getAttribute('data-val'));
                selectedRatings[dimension] = val;

                // Update highlights
                stars.forEach(s => {
                    const starVal = parseInt(s.getAttribute('data-val'));
                    if (starVal <= val) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
            });
        });
    });


    // ==========================================
    // 3. Persistent Storage & Dynamic Review Stream
    // ==========================================
    const feedbackForm = document.getElementById('diner-feedback-form');
    const reviewsStream = document.getElementById('reviews-stream-ticker');

    // Retrieve and render saved local reviews on load
    function loadSavedReviews() {
        if (!reviewsStream) return;
        
        let savedReviews = [];
        try {
            const rawRev = localStorage.getItem('live_kitchen_custom_reviews');
            if (rawRev) savedReviews = JSON.parse(rawRev);
        } catch(e) {}

        savedReviews.forEach(rev => {
            prependReviewNode(rev.name, rev.chef, rev.rating, rev.comments, false);
        });
    }

    // Helper: Prepend review node card
    function prependReviewNode(name, chef, rating, comments, animate = true) {
        if (!reviewsStream) return;

        const node = document.createElement('div');
        node.className = 'verified-review-node';
        if (animate) {
            node.style.opacity = '0';
            node.style.transform = 'translateY(15px)';
            node.style.transition = 'all 0.5s ease';
        }

        const starsStr = '⭐'.repeat(rating);
        node.innerHTML = `
            <div class="rev-header">
                <h5>${escapeHTML(name)}</h5>
                <span class="rev-tag">Verified Diner</span>
            </div>
            <div class="rev-stars">${starsStr} • ${escapeHTML(chef)}</div>
            <p>"${escapeHTML(comments)}"</p>
        `;

        reviewsStream.insertBefore(node, reviewsStream.firstChild);

        if (animate) {
            setTimeout(() => {
                node.style.opacity = '1';
                node.style.transform = 'translateY(0)';
            }, 50);
        }
    }

    loadSavedReviews();

    // Form Submit
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('fb-name').value;
            const chef = document.getElementById('fb-chef').value;
            const comments = document.getElementById('fb-comments').value;

            // Calculate average rating across dimensions
            const avgRating = Math.round(
                (selectedRatings.taste + selectedRatings.hygiene + selectedRatings.accuracy) / 3
            );

            // Prepend UI
            prependReviewNode(name, chef, avgRating, comments, true);

            // Save locally
            let savedReviews = [];
            try {
                const rawRev = localStorage.getItem('live_kitchen_custom_reviews');
                if (rawRev) savedReviews = JSON.parse(rawRev);
            } catch(e) {}

            savedReviews.push({ name, chef, rating: avgRating, comments });
            localStorage.setItem('live_kitchen_custom_reviews', JSON.stringify(savedReviews));

            showToast("✨ Diner audit submitted successfully. Thank you for audits!");

            // Reset Form and ratings
            feedbackForm.reset();
            ratingContainers.forEach(container => {
                const stars = container.querySelectorAll('.star-btn');
                const dimension = container.getAttribute('data-rating');
                selectedRatings[dimension] = 5;
                stars.forEach(s => s.classList.add('active'));
            });
        });
    }

    // Escape script inputs
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // Helper: Toast alerts
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'custom-toast-alert';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('active'), 50);

        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

});
