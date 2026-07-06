/* ==========================================================================
   Live Kitchen - Seating & Takeaway JS Code
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
            console.error("Cart retrieval failed", e);
        }
        cartLink.textContent = `Billing (${cart.length})`;
    }

    updateCartIndicator();


    // ==========================================
    // 2. Tab Toggles (Dine-in vs. Takeaway)
    // ==========================================
    const btnToggleDine = document.getElementById('btn-toggle-dine');
    const btnToggleTake = document.getElementById('btn-toggle-take');
    const dineSection = document.getElementById('booking-dine-section');
    const takeawaySection = document.getElementById('booking-takeaway-section');

    if (btnToggleDine && btnToggleTake && dineSection && takeawaySection) {
        btnToggleDine.addEventListener('click', () => {
            btnToggleDine.classList.add('active');
            btnToggleTake.classList.remove('active');
            dineSection.classList.add('active');
            takeawaySection.classList.remove('active');
        });

        btnToggleTake.addEventListener('click', () => {
            btnToggleDine.classList.remove('active');
            btnToggleTake.classList.add('active');
            dineSection.classList.remove('active');
            takeawaySection.classList.add('active');
        });
    }


    // ==========================================
    // 3. Date Default values (Tomorrow)
    // ==========================================
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const inputDineDate = document.getElementById('dine-date');
    const inputTakeDate = document.getElementById('take-date');
    if (inputDineDate) inputDineDate.value = tomorrowStr;
    if (inputTakeDate) inputTakeDate.value = tomorrowStr;


    // ==========================================
    // 4. Interactive Seating Layout Selector
    // ==========================================
    const tableNodes = document.querySelectorAll('.table-node');
    const summaryText = document.getElementById('dine-summary-text');
    let selectedTable = null;

    tableNodes.forEach(node => {
        node.addEventListener('click', () => {
            if (node.classList.contains('occupied')) {
                showToast("⚠️ This table is currently occupied by another diner.");
                return;
            }

            // Clear previous selection
            tableNodes.forEach(n => n.classList.remove('selected'));

            // Set new selection
            node.classList.add('selected');
            const tableId = node.getAttribute('data-table');
            const seats = node.getAttribute('data-seats');
            const isPremium = node.classList.contains('premium');
            const isWindow = node.classList.contains('window');

            selectedTable = { id: tableId, seats: parseInt(seats), isPremium, isWindow };

            // Update Summary Card
            if (summaryText) {
                let locationDesc = 'Standard Lounge';
                if (isPremium) locationDesc = 'Premium Glass Kitchen View 🔥';
                if (isWindow) locationDesc = 'Cozy Window View 🌇';
                
                summaryText.innerHTML = `
                    <strong>Table selected:</strong> ${tableId} (${seats} Seats)<br>
                    <strong>Location:</strong> ${locationDesc}
                `;
            }
        });
    });


    // ==========================================
    // 5. Form Submissions
    // ==========================================
    const dineForm = document.getElementById('dine-booking-form');
    const takeForm = document.getElementById('takeaway-booking-form');

    if (dineForm) {
        dineForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!selectedTable) {
                showToast("⚠️ Please select a table node from the transparent seating map.");
                return;
            }

            const partySize = document.getElementById('dine-party-size').value;
            const date = document.getElementById('dine-date').value;
            const time = document.getElementById('dine-time-slot').value;
            const special = document.getElementById('dine-requests').value;

            // Simulate booking validation
            if (parseInt(partySize) > selectedTable.seats) {
                showToast(`⚠️ Table ${selectedTable.id} has only ${selectedTable.seats} seats. Please select a larger table.`);
                return;
            }

            // Success toast
            showToast(`✨ Table ${selectedTable.id} Reserved! Date: ${date} at ${time}.`);
            
            // Save reservation info locally to simulate stateful app
            localStorage.setItem('live_kitchen_dine_booking', JSON.stringify({
                table: selectedTable.id,
                party: partySize,
                date: date,
                time: time,
                special: special
            }));

            // Reset form
            dineForm.reset();
            if (inputDineDate) inputDineDate.value = tomorrowStr;
            tableNodes.forEach(n => n.classList.remove('selected'));
            selectedTable = null;
            if (summaryText) summaryText.textContent = "Please select a table from the seating layout.";
        });
    }

    if (takeForm) {
        takeForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const time = document.getElementById('take-time').value;
            const date = document.getElementById('take-date').value;
            const vehicle = document.getElementById('take-vehicle').value;
            const phone = document.getElementById('take-phone').value;
            const speed = document.getElementById('take-speed').value;

            showToast(`🚀 Takeaway Valet Scheduled! Pickup on ${date} at ${time}.`);

            localStorage.setItem('live_kitchen_takeaway_booking', JSON.stringify({
                time, date, vehicle, phone, speed
            }));

            takeForm.reset();
            if (inputTakeDate) inputTakeDate.value = tomorrowStr;
        });
    }

    // Helper: Toast alert alert
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
