/* ==========================================================================
   Live Kitchen - Checkout & Receipt Billing JS Code
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


    const mainGrid = document.getElementById('checkout-main-grid');
    const emptyMsg = document.getElementById('cart-empty-message');
    const itemsHolder = document.getElementById('cart-items-holder');
    const paymentSidebar = document.getElementById('checkout-payment-sidebar');

    const labelSubtotal = document.getElementById('bill-subtotal');
    const labelTax = document.getElementById('bill-tax');
    const labelTotal = document.getElementById('bill-total');

    let cart = [];
    let appliedDiscount = 0;
    let couponCodeApplied = '';

    // ==========================================
    // 1. Navigation Cart Indicator Update
    // ==========================================
    function updateCartIndicator() {
        const cartLink = document.getElementById('nav-billing-link');
        if (cartLink) {
            cartLink.textContent = `Billing (${cart.length})`;
        }
    }


    // ==========================================
    // 2. Render Cart Items & Totals
    // ==========================================
    function loadCartFromStorage() {
        try {
            const cartData = localStorage.getItem('live_kitchen_cart');
            if (cartData) {
                cart = JSON.parse(cartData);
            } else {
                cart = [];
            }
        } catch (e) {
            console.error("Cart load failed", e);
            cart = [];
        }
    }

    function renderCart() {
        loadCartFromStorage();
        updateCartIndicator();

        if (cart.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'block';
            if (itemsHolder) itemsHolder.style.display = 'none';
            if (paymentSidebar) paymentSidebar.style.display = 'none';
            return;
        }

        // Hide empty state, show grid
        if (emptyMsg) emptyMsg.style.display = 'none';
        if (itemsHolder) {
            itemsHolder.style.display = 'flex';
            itemsHolder.style.flexDirection = 'column';
            itemsHolder.style.gap = '1rem';
            itemsHolder.innerHTML = ''; // clear
        }
        if (paymentSidebar) paymentSidebar.style.display = 'block';

        // Render cards
        cart.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'cart-item-row';
            
            // Build custom specs string
            let specs = [];
            specs.push(`${item.spice} Spice`);
            if (item.cheese) specs.push('Extra Cheese 🧀');
            if (item.onion) specs.push('No Onion 🚫');
            if (item.garlic) specs.push('No Garlic 🚫');
            if (item.oil) specs.push(item.oil.split(' ')[0] + ' Oil');
            if (item.special) specs.push(`"${item.special}"`);

            card.innerHTML = `
                <div class="cart-item-details">
                    <h5>${item.name}</h5>
                    <p class="cart-item-specs">${specs.join(' • ')}</p>
                </div>
                <div class="cart-item-price-action">
                    <span class="cart-price">₹${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <button class="cart-remove-btn" data-index="${index}">Remove</button>
                </div>
            `;
            
            if (itemsHolder) itemsHolder.appendChild(card);
        });

        // Set remove button event handlers
        const removeBtns = document.querySelectorAll('.cart-remove-btn');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.getAttribute('data-index'));
                removeCartItem(idx);
            });
        });

        calculateBillTotals();
    }

    function removeCartItem(index) {
        cart.splice(index, 1);
        localStorage.setItem('live_kitchen_cart', JSON.stringify(cart));
        renderCart();
        showToast("🗑️ Item removed from cart.");
    }

    function calculateBillTotals() {
        let subtotal = 0;
        cart.forEach(item => subtotal += item.price);

        appliedDiscount = 0;
        if (couponCodeApplied === 'WELCOME10') {
            appliedDiscount = subtotal * 0.10;
        } else if (couponCodeApplied === 'LIVETRUST') {
            appliedDiscount = subtotal * 0.15;
        } else if (couponCodeApplied === 'CHEF20') {
            appliedDiscount = subtotal * 0.20;
        }

        const netSubtotal = subtotal - appliedDiscount;
        const cgst = netSubtotal * 0.025;
        const sgst = netSubtotal * 0.025;
        const surcharge = 200.00;
        const hygieneFee = 96.00;
        const total = netSubtotal + cgst + sgst + surcharge + hygieneFee;

        if (labelSubtotal) labelSubtotal.textContent = '₹' + subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        const labelDiscountRow = document.getElementById('bill-discount-row');
        const labelCouponName = document.getElementById('bill-coupon-name');
        const labelDiscount = document.getElementById('bill-discount');
        
        if (appliedDiscount > 0) {
            if (labelDiscountRow) labelDiscountRow.style.display = 'flex';
            if (labelCouponName) labelCouponName.textContent = couponCodeApplied;
            if (labelDiscount) labelDiscount.textContent = '-₹' + appliedDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
            if (labelDiscountRow) labelDiscountRow.style.display = 'none';
        }

        const labelCgst = document.getElementById('bill-cgst');
        const labelSgst = document.getElementById('bill-sgst');
        if (labelCgst) labelCgst.textContent = '₹' + cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (labelSgst) labelSgst.textContent = '₹' + sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (labelTotal) labelTotal.textContent = '₹' + total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Coupon Apply Listener
    const couponInput = document.getElementById('coupon-code-input');
    const btnApplyCoupon = document.getElementById('btn-apply-coupon');
    const msgCouponStatus = document.getElementById('coupon-status-msg');

    if (btnApplyCoupon && couponInput) {
        btnApplyCoupon.addEventListener('click', () => {
            const code = couponInput.value.trim().toUpperCase();
            if (!code) {
                showToast("⚠️ Please enter a coupon code.");
                return;
            }

            if (code === 'WELCOME10' || code === 'LIVETRUST' || code === 'CHEF20') {
                couponCodeApplied = code;
                calculateBillTotals();
                showToast(`🎉 Coupon ${code} applied successfully!`);
                if (msgCouponStatus) {
                    msgCouponStatus.style.display = 'block';
                    msgCouponStatus.style.color = '#4dff88';
                    msgCouponStatus.textContent = `Coupon ${code} applied successfully!`;
                }
            } else {
                showToast("⚠️ Invalid coupon code.");
                if (msgCouponStatus) {
                    msgCouponStatus.style.display = 'block';
                    msgCouponStatus.style.color = '#ff4d4d';
                    msgCouponStatus.textContent = "Invalid coupon code.";
                }
            }
        });
    }

    renderCart();


    // ==========================================
    // 3. Payment & Receipt Generator
    // ==========================================
    const payForm = document.getElementById('checkout-pay-form');
    const receiptPane = document.getElementById('receipt-success-pane');
    
    // Receipt Labels
    const recTxnId = document.getElementById('rec-transaction-id');
    const recTimestamp = document.getElementById('rec-timestamp');
    const recItemsHolder = document.getElementById('rec-items-holder');
    const recSubtotal = document.getElementById('rec-subtotal');
    const recTotal = document.getElementById('rec-total');
    const recChefName = document.getElementById('rec-chef-name');
    const recChefStation = document.getElementById('rec-chef-station');

    const chefsList = [
        { name: "Chef Sanjay Kumar", station: "Prep Station 1 - Pasta & Skillet" },
        { name: "Chef Maria Rodriguez", station: "Prep Station 2 - Artisanal Wood Oven" },
        { name: "Chef Liam O'Connor", station: "Prep Station 3 - Pastry & Desserts" }
    ];

    if (payForm) {
        payForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (cart.length === 0) {
                showToast("⚠️ Your cart is empty.");
                return;
            }

            const customerName = document.getElementById('pay-name').value;
            const chosenStation = document.getElementById('pay-station').value;

            // Loader animation trigger on button
            const payBtn = payForm.querySelector('button[type="submit"]');
            const originalBtnText = payBtn.textContent;
            payBtn.disabled = true;
            payBtn.textContent = "Authorizing transaction...";

            setTimeout(() => {
                payBtn.textContent = "Securing glass camera feeds...";
            }, 1200);

            setTimeout(() => {
                // Determine assigned chef
                let assignedChef = chefsList[0]; // Sanjay default
                if (chosenStation === 'Chef Maria') {
                    assignedChef = chefsList[1];
                } else if (chosenStation === 'Chef Liam') {
                    assignedChef = chefsList[2];
                } else if (chosenStation === 'auto') {
                    // Random assign
                    assignedChef = chefsList[Math.floor(Math.random() * chefsList.length)];
                }

                // Fill Receipt Paper Details
                const txnNum = Math.floor(Math.random() * 9000) + 1000;
                if (recTxnId) recTxnId.textContent = `TXN: #LL-${txnNum}-2026`;
                
                const time = new Date();
                if (recTimestamp) recTimestamp.textContent = `Date: ${time.toISOString().split('T')[0]} ${time.toLocaleTimeString()}`;

                if (recItemsHolder) {
                    recItemsHolder.innerHTML = '';
                    cart.forEach(item => {
                        const line = document.createElement('div');
                        line.className = 'rec-item-line';
                        line.innerHTML = `
                            <span>${item.name} (${item.spice} Spice)</span>
                            <span>₹${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        `;
                        recItemsHolder.appendChild(line);
                    });
                }

                let subtotal = 0;
                cart.forEach(item => subtotal += item.price);
                
                let recDiscountAmount = 0;
                if (couponCodeApplied === 'WELCOME10') {
                    recDiscountAmount = subtotal * 0.10;
                } else if (couponCodeApplied === 'LIVETRUST') {
                    recDiscountAmount = subtotal * 0.15;
                } else if (couponCodeApplied === 'CHEF20') {
                    recDiscountAmount = subtotal * 0.20;
                }

                const netSubtotal = subtotal - recDiscountAmount;
                const cgst = netSubtotal * 0.025;
                const sgst = netSubtotal * 0.025;
                const surcharge = 200.00;
                const hygieneFee = 96.00;
                const totalCharge = netSubtotal + cgst + sgst + surcharge + hygieneFee;

                if (recSubtotal) recSubtotal.textContent = '₹' + subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                
                const recDiscountRow = document.getElementById('rec-discount-row');
                const recDiscount = document.getElementById('rec-discount');
                if (recDiscountAmount > 0) {
                    if (recDiscountRow) recDiscountRow.style.display = 'flex';
                    if (recDiscount) recDiscount.textContent = '-₹' + recDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                } else {
                    if (recDiscountRow) recDiscountRow.style.display = 'none';
                }

                const recCgst = document.getElementById('rec-cgst');
                const recSgst = document.getElementById('rec-sgst');
                if (recCgst) recCgst.textContent = '₹' + cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                if (recSgst) recSgst.textContent = '₹' + sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                if (recTotal) recTotal.textContent = '₹' + totalCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                if (recChefName) recChefName.textContent = assignedChef.name;
                if (recChefStation) recChefStation.textContent = assignedChef.station;

                // Toggle views
                if (mainGrid) mainGrid.style.display = 'none';
                if (receiptPane) receiptPane.style.display = 'block';

                // Save simulation reservation state
                localStorage.setItem('live_kitchen_last_receipt', JSON.stringify({
                    chefName: assignedChef.name,
                    station: assignedChef.station,
                    items: cart,
                    total: totalCharge,
                    txn: `LL-${txnNum}-2026`
                }));

                // Clear Cart
                localStorage.removeItem('live_kitchen_cart');
                cart = [];
                updateCartIndicator();

                showToast("🎉 Transaction finalized. Live feed secure!");
                
                // Scroll to top to view receipt cleanly
                window.scrollTo({ top: 0, behavior: 'smooth' });

            }, 2600);
        });
    }


    // ==========================================
    // 4. Download Memory Highlight Animation
    // ==========================================
    const downloadReelBtn = document.getElementById('btn-mock-download-reel');
    if (downloadReelBtn) {
        downloadReelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            downloadReelBtn.disabled = true;
            downloadReelBtn.textContent = "🎬 Compiling highlight frames...";

            setTimeout(() => {
                downloadReelBtn.textContent = "📦 Packaging MP4 highlight...";
            }, 1200);

            setTimeout(() => {
                downloadReelBtn.disabled = false;
                downloadReelBtn.textContent = "📸 Download Memory Highlight";
                showToast("⬇️ Memory highlight compilation downloaded: kitchen-memory-4819.mp4 (Simulated)");
            }, 2600);
        });
    }


    // Helper: Toast alerts alert
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


    // ==========================================
    // Feature 2: Provenance Tracker Modal
    // ==========================================
    const btnTraceProvenance = document.getElementById('btn-trace-provenance');
    const provenanceModal = document.getElementById('provenance-modal');
    const provClose = document.getElementById('prov-close');

    if (btnTraceProvenance && provenanceModal) {
        btnTraceProvenance.addEventListener('click', () => {
            provenanceModal.classList.add('active');
        });
        
        provClose.addEventListener('click', () => {
            provenanceModal.classList.remove('active');
        });
        
        // Close on outside click
        provenanceModal.addEventListener('click', (e) => {
            if (e.target === provenanceModal) {
                provenanceModal.classList.remove('active');
            }
        });
    }

});
