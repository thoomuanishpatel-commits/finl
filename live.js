/* ==========================================================================
   Live Kitchen - CCTV & Telemetry JS Code
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
    // 2. Active Cam Card Selector Highlight
    // ==========================================
    const camCards = document.querySelectorAll('.live-cam-card');
    camCards.forEach(card => {
        card.addEventListener('click', () => {
            camCards.forEach(c => c.classList.remove('active-card'));
            card.classList.add('active-card');
        });
    });


    // ==========================================
    // 3. CCTV Streams Loaded Natively via HTML5 Video
    // ==========================================


    // ==========================================
    // 4. Sanitation Logs Ticker Feed
    // ==========================================
    const logFeed = document.getElementById('sanitation-log-feed');
    const logMessages = [
        "AI hygiene audit: gloves and hairnet certified at Station-3.",
        "Dishwasher sterilization module 2 temperature stabilized at 82°C.",
        "UV sanitization completed for Chef Sanjay (Station-1).",
        "Raw ingredients weight check verified at Station-4.",
        "Portion digital scale recalibration verified: OK.",
        "Air filtration sanitization index: 99.85% clean.",
        "Valet curbside pickup sensor initialized at lane-2.",
        "Food packaging heat-seal validated at Dispatch-Scale."
    ];

    setInterval(() => {
        if (!logFeed) return;

        const time = new Date();
        const timeStr = time.toLocaleTimeString();
        const randomMsg = logMessages[Math.floor(Math.random() * logMessages.length)];

        const logLine = document.createElement('div');
        logLine.className = 'log-line';
        logLine.style.opacity = '0';
        logLine.style.transform = 'translateY(10px)';
        logLine.style.transition = 'all 0.4s ease';

        logLine.innerHTML = `
            <span class="log-time">[${timeStr}]</span>
            <span class="log-msg">${randomMsg}</span>
        `;

        logFeed.appendChild(logLine);

        // Animate entrance
        setTimeout(() => {
            logLine.style.opacity = '1';
            logLine.style.transform = 'translateY(0)';
        }, 50);

        // Keep maximum logs to 5 lines to avoid stack overflow
        const children = logFeed.querySelectorAll('.log-line');
        if (children.length > 5) {
            children[0].style.opacity = '0';
            children[0].style.transform = 'translateY(-10px)';
            setTimeout(() => children[0].remove(), 400);
        }
    }, 4500);

    // ==========================================
    // 5. Feature 3: Live Social Cheers
    // ==========================================
    const cheerBtns = document.querySelectorAll('.cheer-btn');
    cheerBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const emoji = btn.textContent;
            // Get the main video wrapper to append emojis to
            const container = btn.closest('.cam-viewport-wrapper');
            
            // Generate 3-5 emojis per click
            const numEmojis = Math.floor(Math.random() * 3) + 3; 
            
            for (let i = 0; i < numEmojis; i++) {
                setTimeout(() => {
                    const floatingEmoji = document.createElement('div');
                    floatingEmoji.className = 'floating-emoji';
                    floatingEmoji.textContent = emoji;
                    
                    // Random horizontal offset (wider spread)
                    const offset = Math.random() * 60 - 30;
                    floatingEmoji.style.right = `calc(25px + ${offset}px)`;
                    
                    // Randomize animation duration for a natural effect
                    const duration = 1.5 + Math.random();
                    floatingEmoji.style.animation = `floatUp ${duration}s ease-out forwards`;
                    
                    container.appendChild(floatingEmoji);
                    
                    // Remove after animation finishes
                    setTimeout(() => {
                        floatingEmoji.remove();
                    }, duration * 1000);
                }, i * 150); // Stagger the spawn time
            }
        });
    });

});
