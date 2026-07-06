/* ==========================================================================
   Live Kitchen Web Application - Premium JavaScript
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. Navigation & Mobile Menu Menu Toggle
    // ==========================================
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mainNav = document.getElementById('main-nav');
    
    if (mobileMenuBtn && mainNav) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            mainNav.classList.toggle('active');
        });
        
        // Close menu when a link is clicked
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuBtn.classList.remove('active');
                mainNav.classList.remove('active');
            });
        });
    }

    // Sliding Navigation Link Indicator & Mouse Hover slide animations
    const navLinksList = document.querySelectorAll('#main-nav .nav-link:not(.portal-link)');
    const navIndicator = document.querySelector('#main-nav .nav-indicator');

    function updateNavIndicator() {
        const activeLink = document.querySelector('#main-nav .nav-link.active');
        if (activeLink && navIndicator) {
            navIndicator.style.width = `${activeLink.offsetWidth}px`;
            navIndicator.style.left = `${activeLink.offsetLeft}px`;
        }
    }

    navLinksList.forEach(link => {
        link.addEventListener('mouseenter', () => {
            if (navIndicator) {
                navIndicator.style.width = `${link.offsetWidth}px`;
                navIndicator.style.left = `${link.offsetLeft}px`;
            }
        });
    });

    const navBar = document.getElementById('main-nav');
    if (navBar) {
        navBar.addEventListener('mouseleave', () => {
            updateNavIndicator();
        });
    }

    // Scroll active link highlighting & Timeline progress updates
    const sections = document.querySelectorAll('section');
    const timelineContainer = document.querySelector('.timeline-container');
    const timelineProgress = document.querySelector('.timeline-progress');
    const timelineItems = document.querySelectorAll('.timeline-item');

    function updateScrollAnimations() {
        // 1. Scrollspy Link Highlighting
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (window.scrollY >= (sectionTop - 120)) {
                current = section.getAttribute('id');
            }
        });

        navLinksList.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });

        updateNavIndicator();

        // 2. Timeline Scroll-Driven Progress Bar & Card Activations
        if (timelineContainer && timelineProgress) {
            const rect = timelineContainer.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            const startTrigger = viewportHeight * 0.75;
            const endTrigger = viewportHeight * 0.25;
            
            const elementHeight = rect.height;
            const scrolledDistance = startTrigger - rect.top;
            const totalScrollableDistance = elementHeight - (startTrigger - endTrigger);
            
            let progress = (scrolledDistance / totalScrollableDistance) * 100;
            progress = Math.max(0, Math.min(100, progress));
            
            timelineProgress.style.height = `${progress}%`;
            
            timelineItems.forEach(item => {
                const itemRect = item.getBoundingClientRect();
                if (itemRect.top <= viewportHeight * 0.65) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
    }

    window.addEventListener('scroll', updateScrollAnimations);
    window.addEventListener('resize', updateNavIndicator);
    
    // Initial run to set active elements immediately
    setTimeout(() => {
        updateScrollAnimations();
    }, 100);


    // ==========================================
    // 2. Hero Canvas Animation (Scroll-scrub & Playback)
    // ==========================================
    const canvas = document.getElementById('animation-canvas');
    const ctx = canvas.getContext('2d');
    const preloader = document.getElementById('canvas-preloader');
    const preloaderText = document.getElementById('preloader-text');
    const frameIndicator = document.getElementById('canvas-frame-indicator');
    const playBtn = document.getElementById('canvas-play-btn');
    const watchDemoBtn = document.getElementById('hero-watch-demo-btn');
    
    const totalFrames = 100;
    const images = [];
    let loadedCount = 0;
    let isPlaying = false;
    let currentFrame = 0;
    let animationFrameId = null;

    // Canvas size setup
    function setupCanvasSize() {
        // High DPI displays
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    
    // Draw specific frame
    function drawFrame(index) {
        if (!images[index] || !images[index].complete) return;
        
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(images[index], 0, 0, rect.width, rect.height);
        
        // Update frame counter
        const padIndex = String(index + 1).padStart(3, '0');
        if (frameIndicator) {
            frameIndicator.textContent = `Frame: ${padIndex}/100`;
        }
    }

    // Preload frames
    function preloadFrames() {
        setupCanvasSize();
        
        // Build image frame list
        for (let i = 1; i <= totalFrames; i++) {
            const img = new Image();
            const actualFrameNum = (i * 3) - 2;
            const frameNum = String(actualFrameNum).padStart(3, '0');
            img.onload = () => {
                loadedCount++;
                const percentage = Math.round((loadedCount / totalFrames) * 100);
                if (preloaderText) {
                    preloaderText.textContent = `Loading Animation Frames (${percentage}%)...`;
                }
                
                if (loadedCount === totalFrames) {
                    // Preloading complete
                    if (preloader) {
                        preloader.style.opacity = '0';
                        setTimeout(() => {
                            preloader.style.display = 'none';
                        }, 500);
                    }
                    drawFrame(0);
                    initializeScrollScrub();
                }
            };
            img.onerror = () => {
                // Fallback if frames fail to load (e.g. invalid path)
                loadedCount++;
                if (loadedCount === totalFrames) {
                    if (preloader) preloader.style.display = 'none';
                    drawFallbackCanvas();
                }
            };
            img.src = `assets/animation/ezgif-frame-${frameNum}.jpg`;
            images.push(img);
        }
    }

    // Drawing a nice animated background fallback if frame files don't load
    function drawFallbackCanvas() {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Outfit';
        ctx.fillStyle = '#ff6b08';
        ctx.fillText('LiveKitchen Interactive Cooking Stream', 20, 40);
        ctx.fillStyle = '#888';
        ctx.fillText('Cooking Demo Stream active on scroll', 20, 70);
    }

    // Select scrollytelling overlay content blocks
    const introContent = document.getElementById('hero-intro-content');
    const storyContent = document.getElementById('hero-story-content');
    const endingContent = document.getElementById('hero-ending-content');

    // Controls text visibility based on current scroll position
    function updateTextOverlay(scrollFraction) {
        if (!introContent || !storyContent || !endingContent) return;
        
        // Intro Content (Phase 1)
        if (scrollFraction < 0.22) {
            introContent.className = "hero-overlay-content block-intro active";
        } else if (scrollFraction >= 0.22 && scrollFraction < 0.32) {
            introContent.className = "hero-overlay-content block-intro exit";
        } else {
            introContent.className = "hero-overlay-content block-intro";
        }
        
        // Story Content (Phase 2 - Paneer Falling)
        if (scrollFraction < 0.32) {
            storyContent.className = "hero-overlay-content block-story enter-prep";
        } else if (scrollFraction >= 0.32 && scrollFraction < 0.52) {
            storyContent.className = "hero-overlay-content block-story active";
        } else if (scrollFraction >= 0.52 && scrollFraction < 0.62) {
            storyContent.className = "hero-overlay-content block-story exit";
        } else {
            storyContent.className = "hero-overlay-content block-story";
        }

        // Ending Content (Phase 3 - Fully Cooked Paneer)
        if (scrollFraction < 0.62) {
            endingContent.className = "hero-overlay-content block-ending enter-prep";
        } else if (scrollFraction >= 0.62 && scrollFraction < 0.85) {
            endingContent.className = "hero-overlay-content block-ending active";
        } else if (scrollFraction >= 0.85 && scrollFraction < 0.95) {
            endingContent.className = "hero-overlay-content block-ending exit";
        } else {
            endingContent.className = "hero-overlay-content block-ending";
        }
    }

    // Autoplay logic
    function playAnimation() {
        if (!isPlaying) return;
        
        currentFrame = (currentFrame + 1) % totalFrames;
        drawFrame(currentFrame);
        
        // Artificially update text overlays during autoplay
        updateTextOverlay(currentFrame / totalFrames);
        
        animationFrameId = requestAnimationFrame(playAnimation);
    }

    function togglePlayback() {
        isPlaying = !isPlaying;
        if (isPlaying) {
            if (playBtn) playBtn.textContent = 'Pause';
            playAnimation();
        } else {
            if (playBtn) playBtn.textContent = 'Play';
            cancelAnimationFrame(animationFrameId);
        }
    }

    if (playBtn) {
        playBtn.addEventListener('click', togglePlayback);
    }
    if (watchDemoBtn) {
        watchDemoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'live.html';
        });
    }

    // Scroll scrubbing logic
    function initializeScrollScrub() {
        const heroSection = document.getElementById('hero');
        if (!heroSection) return;

        // Initialize starting active states
        updateTextOverlay(0);
        
        window.addEventListener('scroll', () => {
            if (isPlaying) return; // Don't scrub if autoplay is active
            
            const rect = heroSection.getBoundingClientRect();
            const heroTop = window.scrollY + rect.top;
            const heroHeight = heroSection.offsetHeight;
            
            // Calculate progress relative to container limits
            const relativeScroll = window.scrollY - heroTop;
            const maxScroll = heroHeight - window.innerHeight;
            
            if (maxScroll <= 0) return;
            
            let scrollFraction = relativeScroll / maxScroll;
            scrollFraction = Math.max(0, Math.min(1, scrollFraction));
            
            const frameIndex = Math.min(
                totalFrames - 1,
                Math.floor(scrollFraction * totalFrames)
            );
            
            currentFrame = frameIndex;
            
            requestAnimationFrame(() => {
                drawFrame(frameIndex);
                updateTextOverlay(scrollFraction);
            });
        });
    }

    preloadFrames();
    window.addEventListener('resize', setupCanvasSize);


    // ==========================================
    // 3. Tab panels switching for USP Section
    // ==========================================
    const uspCards = document.querySelectorAll('.usp-card');
    const viewerPanels = document.querySelectorAll('.viewer-panel');

    uspCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove active classes
            uspCards.forEach(c => c.classList.remove('active'));
            viewerPanels.forEach(p => p.classList.remove('active'));

            // Add active class to clicked card
            card.classList.add('active');
            
            // Get panel target
            const targetId = card.getAttribute('data-target');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });


    // ==========================================
    // 4. Customize Everything Recipe Customizer
    // ==========================================
    const spiceBtns = document.querySelectorAll('.spice-btn');
    const cheeseCheck = document.getElementById('pref-cheese');
    const onionCheck = document.getElementById('pref-onion');
    const garlicCheck = document.getElementById('pref-garlic');
    const oilSelect = document.getElementById('pref-oil');
    const specialText = document.getElementById('pref-special');
    const specCard = document.getElementById('recipe-spec-card');

    let currentSpice = 'Medium';
    
    spiceBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            spiceBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSpice = btn.textContent.trim().split(' ')[0];
            updateRecipeSpec();
        });
    });

    function updateRecipeSpec() {
        if (!specCard) return;
        
        let specs = [];
        specs.push(`${currentSpice} Spice`);
        specs.push(cheeseCheck && cheeseCheck.checked ? 'Extra Cheese 🧀' : 'Standard Cheese');
        
        let exclusions = [];
        if (onionCheck && onionCheck.checked) exclusions.push('No Onion 🧅');
        if (garlicCheck && garlicCheck.checked) exclusions.push('No Garlic 🧄');
        if (exclusions.length > 0) {
            specs.push(exclusions.join(', '));
        }
        
        if (oilSelect) {
            const oilText = oilSelect.options[oilSelect.selectedIndex].text.split(' ')[0];
            specs.push(`${oilText} Oil`);
        }
        
        if (specialText && specialText.value.trim() !== '') {
            specs.push(`"${specialText.value.trim()}"`);
        }
        
        specCard.textContent = specs.join(' • ');
    }

    [cheeseCheck, onionCheck, garlicCheck, oilSelect].forEach(elem => {
        if (elem) elem.addEventListener('change', updateRecipeSpec);
    });
    if (specialText) {
        specialText.addEventListener('input', updateRecipeSpec);
    }


    // ==========================================
    // 5. Smart Order Tracker Simulation
    // ==========================================
    const simBtn = document.getElementById('trigger-tracker-sim');
    const trackerSteps = document.querySelectorAll('.tracker-step');
    const trackerBar = document.getElementById('tracker-bar');
    
    let trackerTimeout = null;

    function resetTracker() {
        trackerSteps.forEach(step => {
            step.classList.remove('active', 'completed');
        });
        if (trackerBar) trackerBar.style.width = '0%';
        if (trackerTimeout) clearTimeout(trackerTimeout);
    }

    function runTrackerSimulation() {
        resetTracker();
        
        // Step 1: Placed
        setStepState('step-placed', 'active', '10%');
        
        // Step 2: Cooking
        trackerTimeout = setTimeout(() => {
            setStepState('step-placed', 'completed');
            setStepState('step-cooking', 'active', '35%');
            
            // Switch USP view to Cooking panel to showcase stream simulation!
            document.querySelector('.usp-card[data-target="panel-live-cooking"]').click();
        }, 2500);

        // Step 3: Plating
        trackerTimeout = setTimeout(() => {
            setStepState('step-cooking', 'completed');
            setStepState('step-plating', 'active', '65%');
        }, 5500);

        // Step 4: Ready
        trackerTimeout = setTimeout(() => {
            setStepState('step-plating', 'completed');
            setStepState('step-ready', 'active', '85%');
        }, 8000);

        // Step 5: Delivered
        trackerTimeout = setTimeout(() => {
            setStepState('step-ready', 'completed');
            setStepState('step-delivered', 'active', '100%');
        }, 11000);
    }

    function setStepState(stepId, state, barWidth = null) {
        const step = document.getElementById(stepId);
        if (step) {
            if (state === 'active') {
                step.classList.add('active');
            } else if (state === 'completed') {
                step.classList.add('completed');
            }
        }
        if (barWidth && trackerBar) {
            trackerBar.style.width = barWidth;
        }
    }

    if (simBtn) {
        simBtn.addEventListener('click', runTrackerSimulation);
    }
    
    // Order Now Hero trigger
    const heroOrderBtn = document.getElementById('hero-order-now-btn');
    if (heroOrderBtn) {
        heroOrderBtn.addEventListener('click', () => {
            window.location.href = 'menu.html';
        });
    }


    // ==========================================
    // 6. Countdown clock in metrics (CCTV Stream Panel)
    // ==========================================
    let secondsLeft = 252;
    setInterval(() => {
        if (secondsLeft > 0) secondsLeft--;
        const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
        const s = String(secondsLeft % 60).padStart(2, '0');
        const countDisplay = document.getElementById('stream-countdown');
        if (countDisplay) countDisplay.textContent = `${m}:${s}`;
    }, 1000);


    // ==========================================
    // 7. Cooking Memories Save Simulation
    // ==========================================
    const saveMemoryBtn = document.getElementById('btn-save-memory');
    const memoryToast = document.getElementById('memory-save-toast');

    if (saveMemoryBtn && memoryToast) {
        saveMemoryBtn.addEventListener('click', () => {
            saveMemoryBtn.disabled = true;
            saveMemoryBtn.querySelector('span').textContent = 'Compiling stream...';
            
            setTimeout(() => {
                saveMemoryBtn.querySelector('span').textContent = 'Saving highlight video...';
            }, 1200);

            setTimeout(() => {
                saveMemoryBtn.disabled = false;
                saveMemoryBtn.querySelector('span').textContent = '📸 Compile & Save Memory';
                memoryToast.style.display = 'block';
                setTimeout(() => {
                    memoryToast.style.display = 'none';
                }, 6000);
            }, 2600);
        });
    }





    // ==========================================
    // 9. Interactive Map Mockup
    // ==========================================
    const mapZoomIn = document.getElementById('map-zoom-in');
    const mapZoomOut = document.getElementById('map-zoom-out');
    const mapStreets = document.querySelector('.map-streets');
    
    let currentZoom = 1.0;
    
    if (mapZoomIn && mapStreets) {
        mapZoomIn.addEventListener('click', () => {
            currentZoom = Math.min(2.0, currentZoom + 0.15);
            mapStreets.style.transform = `scale(${currentZoom})`;
        });
    }
    if (mapZoomOut && mapStreets) {
        mapZoomOut.addEventListener('click', () => {
            currentZoom = Math.max(0.7, currentZoom - 0.15);
            mapStreets.style.transform = `scale(${currentZoom})`;
        });
    }


    // ==========================================
    // 10. Reviews Testimonial Slider
    // ==========================================
    const reviewTrack = document.getElementById('review-track');
    const prevBtn = document.getElementById('review-prev');
    const nextBtn = document.getElementById('review-next');
    const reviewCards = document.querySelectorAll('.review-card');
    
    let currentSlide = 0;
    const totalSlides = reviewCards.length;

    function goToSlide(index) {
        currentSlide = (index + totalSlides) % totalSlides;
        if (reviewTrack) {
            reviewTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
        }
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            goToSlide(currentSlide - 1);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            goToSlide(currentSlide + 1);
        });
    }

    // Auto-advance reviews
    let slideTimer = setInterval(() => {
        goToSlide(currentSlide + 1);
    }, 6500);

    // Reset timer on manual click
    [prevBtn, nextBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                clearInterval(slideTimer);
                slideTimer = setInterval(() => {
                    goToSlide(currentSlide + 1);
                }, 8000);
            });
        }
    });


    // ==========================================
    // 11. FAQ Accordion Toggle
    // ==========================================
    const faqToggles = document.querySelectorAll('.faq-toggle');

    faqToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const faqItem = toggle.parentNode;
            const isActive = faqItem.classList.contains('active');

            // Close all active items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });

            // Open clicked item if it was closed
            if (!isActive) {
                faqItem.classList.add('active');
            }
        });
    });

    // ==========================================
    // 12. "See how transparent cooking works" CTA Feature
    // ==========================================
    const seeWorksBtn = document.getElementById('cta-see-works');
    if (seeWorksBtn) {
        seeWorksBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Create toast if it doesn't exist
            const toast = document.createElement('div');
            toast.className = 'custom-toast-alert';
            toast.textContent = 'Feature will be available soon';
            document.body.appendChild(toast);

            // Slide In
            setTimeout(() => toast.classList.add('active'), 50);

            // Fade out
            setTimeout(() => {
                toast.classList.remove('active');
                setTimeout(() => toast.remove(), 400);
            }, 3000);
        });
    }

    // ==========================================
    // Feature 3: Live Social Cheers
    // ==========================================
    const cheerBtns = document.querySelectorAll('.cheer-btn');
    cheerBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const emoji = btn.textContent;
            // Get the main video wrapper to append emojis to
            const container = btn.closest('.chef-stream-window');
            
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
