/* ==========================================================================
   Live Kitchen - Menu JS Code
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
            console.error("Failed to parse cart data", e);
        }

        const totalItems = cart.length;
        cartLink.textContent = `Billing (${totalItems})`;

        // Also update the sidebar if it exists
        if (typeof renderCartSidebar === 'function') {
            renderCartSidebar(cart);
        }
    }

    // Call on load
    updateCartIndicator();


    // ==========================================
    // 2. Menu Category Filters
    // ==========================================
    const tabBtns = document.querySelectorAll('.cat-tab-btn');
    const menuCards = document.querySelectorAll('.menu-item-card');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.getAttribute('data-category');

            menuCards.forEach(card => {
                if (category === 'all' || card.getAttribute('data-category') === category) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // ==========================================
    // 2.5 Dietary Filters
    // ==========================================
    const dietChips = document.querySelectorAll('.diet-chip');
    dietChips.forEach(chip => {
        chip.addEventListener('click', () => {
            dietChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            const filter = chip.getAttribute('data-filter');
            
            menuCards.forEach(card => {
                if (filter === 'all') {
                    card.classList.remove('filtered-out');
                } else {
                    const diets = card.getAttribute('data-diet');
                    if (diets && diets.includes(filter)) {
                        card.classList.remove('filtered-out');
                    } else {
                        card.classList.add('filtered-out');
                    }
                }
            });
        });
    });


    // ==========================================
    // 3. Customizer Event Handlers & State
    // ==========================================
    const emptyState = document.getElementById('customizer-empty-state');
    const contentState = document.getElementById('customizer-content-state');
    
    const customItemName = document.getElementById('custom-item-name');
    const customItemPrice = document.getElementById('custom-item-price');
    const customLiveSpec = document.getElementById('custom-live-spec');

    // Controls
    const spiceBtns = document.querySelectorAll('.spice-btn');
    const exCheese = document.getElementById('ex-cheese');
    const exOnion = document.getElementById('ex-onion');
    const exGarlic = document.getElementById('ex-garlic');
    const exOil = document.getElementById('ex-oil');
    const exInstructions = document.getElementById('ex-instructions');
    const btnSaveCustom = document.getElementById('btn-save-custom-item');

    let activeItem = null; // { id, name, price }
    let selectedSpice = 'Medium';

    // Click Customize on Menu Card
    const customizeBtns = document.querySelectorAll('.customize-trigger-btn');
    customizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.menu-item-card');
            const itemId = card.getAttribute('data-id');
            const itemName = card.getAttribute('data-name');
            const itemPrice = card.getAttribute('data-price');

            activeItem = { id: itemId, name: itemName, price: parseFloat(itemPrice) };

            // Update Panel Heading
            if (customItemName) customItemName.textContent = itemName;
            if (customItemPrice) customItemPrice.textContent = `$${itemPrice}`;

            // Reset states
            selectedSpice = 'Medium';
            spiceBtns.forEach(b => {
                b.classList.remove('active');
                if (b.getAttribute('data-val') === 'Medium') b.classList.add('active');
            });

            if (exCheese) exCheese.checked = false;
            if (exOnion) exOnion.checked = false;
            if (exGarlic) exGarlic.checked = false;
            if (exOil) exOil.value = 'olive';
            if (exInstructions) exInstructions.value = '';

            // Toggle Panel View
            if (emptyState) emptyState.style.display = 'none';
            if (contentState) contentState.style.display = 'block';

            updateLiveSpecText();
            
            // Scroll customizer panel into view on mobile
            if (window.innerWidth <= 1024) {
                document.querySelector('.menu-customizer-panel').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Handle spice selector clicks
    spiceBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            spiceBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedSpice = btn.getAttribute('data-val');
            updateLiveSpecText();
        });
    });

    // Update spec text on control triggers
    function updateLiveSpecText() {
        if (!customLiveSpec) return;

        let specs = [];
        specs.push(`${selectedSpice} Spice`);
        specs.push(exCheese && exCheese.checked ? 'Extra Cheese 🧀' : 'Standard Cheese');
        
        let exclusions = [];
        if (exOnion && exOnion.checked) exclusions.push('No Onion 🧅');
        if (exGarlic && exGarlic.checked) exclusions.push('No Garlic 🧄');
        if (exclusions.length > 0) {
            specs.push(exclusions.join(', '));
        }

        if (exOil) {
            const oilText = exOil.options[exOil.selectedIndex].text.split(' ')[0];
            specs.push(`${oilText} Oil`);
        }

        if (exInstructions && exInstructions.value.trim() !== '') {
            specs.push(`"${exInstructions.value.trim()}"`);
        }

        customLiveSpec.textContent = specs.join(' • ');

        // Feature 1 & 2: Update Macros & Carbon Footprint
        if (activeItem) {
            // Base macros (approximate)
            let baseCals = 500, basePro = 15, baseCarb = 50, baseFat = 20;
            let baseCO2 = 1.2; // Base carbon footprint in kg CO2e

            if (activeItem.name.includes("Pizza")) {
                baseCals = 850; basePro = 35; baseCarb = 90; baseFat = 30; baseCO2 = 1.8;
            } else if (activeItem.name.includes("Pasta")) {
                baseCals = 650; basePro = 25; baseCarb = 85; baseFat = 22; baseCO2 = 1.1;
            } else if (activeItem.name.includes("Salad")) {
                baseCals = 350; basePro = 12; baseCarb = 20; baseFat = 25; baseCO2 = 0.5;
            } else if (activeItem.name.includes("Tiramisu")) {
                baseCals = 450; basePro = 8; baseCarb = 55; baseFat = 25; baseCO2 = 0.9;
            }

            // Adjustments
            if (exCheese && exCheese.checked) {
                baseCals += 120; basePro += 8; baseFat += 10;
                baseCO2 += 0.8; // Dairy has high carbon footprint
            }
            if (exOil) {
                const oil = exOil.value;
                if (oil === 'low') {
                    baseCals -= 80; baseFat -= 9;
                    baseCO2 -= 0.1;
                } else if (oil === 'butter') {
                    baseCals += 50; baseFat += 6;
                    baseCO2 += 0.4; // Dairy butter adds footprint
                }
            }

            const elCal = document.getElementById('mac-cal');
            const elPro = document.getElementById('mac-pro');
            const elCrb = document.getElementById('mac-crb');
            const elFat = document.getElementById('mac-fat');
            const elEco = document.getElementById('eco-badge');
            
            if (elCal) {
                elCal.textContent = baseCals;
                elPro.textContent = basePro;
                elCrb.textContent = baseCarb;
                elFat.textContent = baseFat;

                if (elEco) {
                    elEco.innerHTML = `🍃 ${baseCO2.toFixed(1)}kg CO₂e`;
                    // Visual cue based on sustainability
                    if (baseCO2 < 1.0) {
                        elEco.style.color = '#4dff88';
                        elEco.style.borderColor = 'rgba(60,255,120,0.3)';
                        elEco.style.background = 'rgba(60,255,120,0.15)';
                    } else if (baseCO2 < 2.0) {
                        elEco.style.color = '#ffcc00';
                        elEco.style.borderColor = 'rgba(255,204,0,0.3)';
                        elEco.style.background = 'rgba(255,204,0,0.15)';
                    } else {
                        elEco.style.color = '#ff4d4d';
                        elEco.style.borderColor = 'rgba(255,77,77,0.3)';
                        elEco.style.background = 'rgba(255,77,77,0.15)';
                    }
                }

                // Animate change
                [elCal, elPro, elCrb, elFat, elEco].forEach(el => {
                    if (!el) return;
                    el.style.transition = 'all 0.2s ease';
                    el.style.transform = 'scale(1.2)';
                    el.style.color = 'var(--primary)';
                    setTimeout(() => {
                        el.style.transform = 'scale(1)';
                        el.style.color = '#fff';
                    }, 200);
                });
            }
        }
    }

    [exCheese, exOnion, exGarlic, exOil].forEach(elem => {
        if (elem) elem.addEventListener('change', updateLiveSpecText);
    });
    if (exInstructions) {
        exInstructions.addEventListener('input', updateLiveSpecText);
    }

    // Toast feedback function
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'custom-toast-alert';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Slide In
        setTimeout(() => toast.classList.add('active'), 50);

        // Fade out
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, 3200);
    }


    // ==========================================
    // 4. Cart Add Actions (Direct and Customized)
    // ==========================================
    
    // Add Item Helper
    function addItemToLocalStorage(item) {
        let cart = [];
        try {
            const cartData = localStorage.getItem('live_kitchen_cart');
            if (cartData) cart = JSON.parse(cartData);
        } catch (e) {
            console.error("Cart error", e);
        }

        cart.push(item);
        localStorage.setItem('live_kitchen_cart', JSON.stringify(cart));
        updateCartIndicator();
    }

    // Direct Add Button (No Customization)
    const addDirectBtns = document.querySelectorAll('.add-direct-btn');
    addDirectBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.menu-item-card');
            const itemId = card.getAttribute('data-id');
            const itemName = card.getAttribute('data-name');
            const itemPrice = card.getAttribute('data-price');

            const cartItem = {
                id: itemId,
                name: itemName,
                price: parseFloat(itemPrice),
                spice: 'Medium',
                cheese: false,
                onion: false,
                garlic: false,
                oil: 'Extra Virgin Olive Oil',
                special: ''
            };

            addItemToLocalStorage(cartItem);
            showToast(`🛒 ${itemName} added to Cart!`);
        });
    });

    // Customized Confirm button
    if (btnSaveCustom) {
        btnSaveCustom.addEventListener('click', () => {
            if (!activeItem) return;

            const cartItem = {
                id: activeItem.id,
                name: activeItem.name,
                price: activeItem.price,
                spice: selectedSpice,
                cheese: exCheese ? exCheese.checked : false,
                onion: exOnion ? exOnion.checked : false,
                garlic: exGarlic ? exGarlic.checked : false,
                oil: exOil ? exOil.options[exOil.selectedIndex].text : 'Extra Virgin Olive Oil',
                special: exInstructions ? exInstructions.value.trim() : ''
            };

            addItemToLocalStorage(cartItem);
            showToast(`🌟 Custom ${activeItem.name} added to Cart!`);

            // Reset Panel
            if (emptyState) emptyState.style.display = 'flex';
            if (contentState) contentState.style.display = 'none';
            activeItem = null;
        });
    }

    // ==========================================
    // 5. Cart Sidebar Modal Logic
    // ==========================================
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartBtn = document.getElementById('nav-billing-link');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const cartContainer = document.getElementById('cart-items-container');
    const cartTotalAmount = document.getElementById('cart-total-amount');
    
    if (cartBtn && cartSidebar) {
        cartBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent navigating to billing.html
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
            updateCartIndicator(); // Refresh cart data
        });
    }

    // Ensure closing cart when clicking outside or button
    if (cartOverlay) cartOverlay.addEventListener('click', closeCartSidebar);
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCartSidebar);


    // ==========================================
    // Feature 3: Share Custom Recipe QR
    // ==========================================
    const btnShareRecipe = document.getElementById('btn-share-recipe');
    const qrModal = document.getElementById('qr-modal');
    const qrClose = document.getElementById('qr-close');
    const qrSpecText = document.getElementById('qr-spec-text');

    if (btnShareRecipe && qrModal) {
        btnShareRecipe.addEventListener('click', () => {
            if (customLiveSpec) {
                qrSpecText.textContent = `Recipe Code: ${customLiveSpec.textContent}`;
            }
            qrModal.classList.add('active');
        });
        
        qrClose.addEventListener('click', () => {
            qrModal.classList.remove('active');
        });
        
        qrModal.addEventListener('click', (e) => {
            if (e.target === qrModal) qrModal.classList.remove('active');
        });
    }

    // ==========================================
    // Feature 4: Live Station Surge Pricing
    // ==========================================
    const categories = ['pizza', 'pasta', 'salad', 'dessert'];
    const multipliers = [1.1, 0.9]; // 10% surge, 10% discount

    // Run every 15 seconds to simulate dynamic pricing
    setInterval(() => {
        // Reset all to base price
        menuCards.forEach(card => {
            card.classList.remove('surge-active', 'discount-active');
            const basePrice = parseFloat(card.getAttribute('data-price'));
            const priceTag = card.querySelector('.item-price');
            if (priceTag) priceTag.textContent = `$${basePrice.toFixed(2)}`;
        });

        // Pick random category and multiplier
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const mult = multipliers[Math.floor(Math.random() * multipliers.length)];
        const isSurge = mult > 1;

        menuCards.forEach(card => {
            if (card.getAttribute('data-category') === cat) {
                const basePrice = parseFloat(card.getAttribute('data-price'));
                const newPrice = basePrice * mult;
                const priceTag = card.querySelector('.item-price');
                if (priceTag) {
                    priceTag.textContent = `$${newPrice.toFixed(2)}`;
                }
                
                if (isSurge) {
                    card.classList.add('surge-active');
                } else {
                    card.classList.add('discount-active');
                }
            }
        });

        const status = isSurge ? 'High Demand Surge (+10%)' : 'Low Queue Discount (-10%)';
        showToast(`📊 Live Tracker: ${cat.toUpperCase()} Station - ${status}`);
        
    }, 15000);

    function closeCartSidebar() {
        if (cartSidebar) cartSidebar.classList.remove('active');
        if (cartOverlay) cartOverlay.classList.remove('active');
    }

    window.renderCartSidebar = function(cart) {
        if (!cartContainer || !cartTotalAmount) return;
        
        cartContainer.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            cartContainer.innerHTML = '<div class="empty-cart-msg">Your cart is currently empty.</div>';
        } else {
            cart.forEach((item, index) => {
                total += item.price;
                
                let extras = [];
                if (item.spice && item.spice !== 'Medium') extras.push(`${item.spice} Spice`);
                if (item.cheese) extras.push('Extra Cheese');
                
                let desc = extras.length > 0 ? extras.join(', ') : 'Standard Prep';

                const row = document.createElement('div');
                row.className = 'cart-item-row';
                row.innerHTML = `
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>${desc}</p>
                    </div>
                    <div>
                        <span class="cart-item-price">$${item.price.toFixed(2)}</span>
                        <button class="cart-remove-btn" data-index="${index}">✖</button>
                    </div>
                `;
                cartContainer.appendChild(row);
            });
        }
        cartTotalAmount.textContent = `$${total.toFixed(2)}`;

        // Attach remove events
        const removeBtns = cartContainer.querySelectorAll('.cart-remove-btn');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                cart.splice(idx, 1);
                localStorage.setItem('live_kitchen_cart', JSON.stringify(cart));
                updateCartIndicator();
            });
        });
    }
    
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            window.location.href = 'billing.html';
        });
    }

});
