import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8000;
const JWT_SECRET = crypto.randomBytes(32).toString('hex'); // Secure random key per server boot

// Initialize Native SQLite Database
const db = new DatabaseSync(path.join(__dirname, 'database.sqlite'));

// Create Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar TEXT,
        role TEXT DEFAULT 'user',
        is_verified INTEGER DEFAULT 0,
        verification_code TEXT,
        reset_code TEXT,
        is_banned INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS restaurants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        cuisine TEXT,
        image_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        restaurant_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        is_hidden INTEGER DEFAULT 0,
        is_reported INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        UNIQUE(user_id, restaurant_id)
    );

    CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id INTEGER UNIQUE NOT NULL,
        food_quality INTEGER CHECK(food_quality BETWEEN 1 AND 5),
        taste INTEGER CHECK(taste BETWEEN 1 AND 5),
        hygiene INTEGER CHECK(hygiene BETWEEN 1 AND 5),
        delivery_speed INTEGER CHECK(delivery_speed BETWEEN 1 AND 5),
        packaging INTEGER CHECK(packaging BETWEEN 1 AND 5),
        overall_experience INTEGER CHECK(overall_experience BETWEEN 1 AND 5),
        average_rating REAL,
        FOREIGN KEY(review_id) REFERENCES reviews(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS helpful_votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        review_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(review_id) REFERENCES reviews(id) ON DELETE CASCADE,
        UNIQUE(user_id, review_id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        restaurant_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
        UNIQUE(user_id, restaurant_id)
    );
`);

// Seed Data
// Check and insert Admin
const adminCheck = db.prepare("SELECT * FROM users WHERE email = ?").get("admin@livekitchen.com");
if (!adminCheck) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync("Admin@123password", salt, 1000, 64, 'sha512').toString('hex');
    const pwdHash = `${salt}:${hash}`;
    db.prepare(`
        INSERT INTO users (name, email, password_hash, role, is_verified)
        VALUES ('System Admin', 'admin@livekitchen.com', ?, 'admin', 1)
    `).run(pwdHash);
}

// Seed Restaurants if empty
const restaurantCount = db.prepare("SELECT COUNT(*) as count FROM restaurants").get();
if (restaurantCount.count === 0) {
    const insertRestaurant = db.prepare(`
        INSERT INTO restaurants (name, cuisine, image_url) VALUES (?, ?, ?)
    `);
    insertRestaurant.run("LiveKitchen - Connaught Place", "North Indian, Tandoori & Italian", "assets/images/res1.jpg");
    insertRestaurant.run("LiveKitchen - Indiranagar", "Continental, Pizzas & Pastas", "assets/images/res2.jpg");
    insertRestaurant.run("LiveKitchen - Powai Hub", "Gourmet Salads, Desserts & Artisan Pizzas", "assets/images/res3.jpg");
}

// Helper: Password hashing
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
    const [salt, hash] = storedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
}

// Helper: Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[m]);
}

// Middleware
app.use(express.json());
app.use(cookieParser());

// Rate Limiting Store (In-Memory)
const loginAttempts = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_LOCK_TIME = 15 * 60 * 1000; // 15 mins

function checkRateLimit(req, res, next) {
    const key = req.body.email || req.ip;
    const record = loginAttempts.get(key);

    if (record) {
        if (record.count >= RATE_LIMIT_MAX && Date.now() < record.lockUntil) {
            const minutesLeft = Math.ceil((record.lockUntil - Date.now()) / 60000);
            return res.status(429).json({ error: `Too many login attempts. Locked out. Please try again after ${minutesLeft} minute(s).` });
        }
        if (Date.now() > record.lockUntil) {
            loginAttempts.delete(key);
        }
    }
    next();
}

function logFailedAttempt(key) {
    let record = loginAttempts.get(key);
    if (!record) {
        record = { count: 0, lockUntil: 0 };
    }
    record.count++;
    if (record.count >= RATE_LIMIT_MAX) {
        record.lockUntil = Date.now() + RATE_LIMIT_LOCK_TIME;
    }
    loginAttempts.set(key, record);
}

// Auth Verification Middleware
function authenticateToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Access Denied. Please log in." });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Fetch user status
        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.id);
        if (!user) return res.status(401).json({ error: "User not found." });
        if (user.is_banned === 1) return res.status(403).json({ error: "Your account is banned." });
        
        req.user = user;
        next();
    } catch (e) {
        res.clearCookie('token');
        return res.status(403).json({ error: "Session expired. Please log in again." });
    }
}

function authenticateAdmin(req, res, next) {
    authenticateToken(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: "Access Denied. Admin privilege required." });
        }
        next();
    });
}

// Protected HTML Page Redirection Middleware (before static files serving)
app.use((req, res, next) => {
    const filePath = req.path;
    const token = req.cookies.token;

    if (filePath.endsWith('profile.html')) {
        if (!token) return res.redirect('/auth.html?redirect=profile.html');
        try {
            jwt.verify(token, JWT_SECRET);
        } catch (e) {
            res.clearCookie('token');
            return res.redirect('/auth.html?redirect=profile.html');
        }
    }

    if (filePath.endsWith('admin.html')) {
        if (!token) return res.redirect('/auth.html?redirect=admin.html');
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = db.prepare("SELECT role FROM users WHERE id = ?").get(decoded.id);
            if (!user || user.role !== 'admin') {
                return res.redirect('/index.html');
            }
        } catch (e) {
            res.clearCookie('token');
            return res.redirect('/auth.html?redirect=admin.html');
        }
    }
    next();
});

// Serve Static Files
app.use(express.static(path.join(__dirname)));

// ==========================================
// API ROUTES
// ==========================================

// 1. Register User
app.post('/api/auth/register', (req, res) => {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
        return res.status(400).json({ error: "All fields are required." });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match." });
    }

    // Password validation: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ error: "Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character." });
    }

    // Check if unique email
    const emailCheck = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (emailCheck) {
        return res.status(400).json({ error: "Email address already registered." });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
    const password_hash = hashPassword(password);
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    try {
        const result = db.prepare(`
            INSERT INTO users (name, email, password_hash, avatar, is_verified)
            VALUES (?, ?, ?, ?, 1)
        `).run(name, email, password_hash, defaultAvatar);
        
        const userId = result.lastInsertRowid;
        const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);

        // Sign JWT instantly and log in the user
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '2h' });

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 2 * 60 * 60 * 1000, // 2 hours
            sameSite: 'lax',
            secure: false
        });

        return res.status(201).json({
            message: "Registration successful! Logged in automatically.",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                is_verified: user.is_verified
            }
        });
    } catch (e) {
        return res.status(500).json({ error: "Database error during registration." });
    }
});

// 2. Login User
app.post('/api/auth/login', checkRateLimit, (req, res) => {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
        logFailedAttempt(email);
        return res.status(400).json({ error: "Invalid email or password." });
    }

    if (user.is_banned === 1) {
        return res.status(403).json({ error: "Your account is banned by the administrator." });
    }

    const match = verifyPassword(password, user.password_hash);
    if (!match) {
        logFailedAttempt(email);
        return res.status(400).json({ error: "Invalid email or password." });
    }

    // Login successful: Reset login attempts
    loginAttempts.delete(email);

    // Sign JWT
    const cookieAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000; // 30 days or 2 hours
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: rememberMe ? '30d' : '2h' });

    res.cookie('token', token, {
        httpOnly: true,
        maxAge: cookieAge,
        sameSite: 'lax',
        secure: false // Set to true if running over HTTPS
    });

    return res.json({
        message: "Login successful!",
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            is_verified: user.is_verified
        }
    });
});

// 3. Verify Email
app.post('/api/auth/verify-email', (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: "Email and verification code are required." });
    }

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) return res.status(400).json({ error: "User not found." });

    if (user.verification_code === code) {
        db.prepare("UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?").run(user.id);
        return res.json({ message: "Email verified successfully! You can now access protected features." });
    } else {
        return res.status(400).json({ error: "Invalid verification code." });
    }
});

// 4. Request Forgot Password
app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required." });

    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (!user) {
        // Return success response to avoid email enumeration attack
        return res.json({ message: "If the email exists, a password reset code was sent (check console logs)." });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    db.prepare("UPDATE users SET reset_code = ? WHERE id = ?").run(resetCode, user.id);

    console.log(`\n========================================\n[SIMULATION EMAIL] Password Reset Code for ${email}: ${resetCode}\n========================================\n`);

    return res.json({ message: "Reset code sent successfully! Check console logs.", email });
});

// 5. Reset Password
app.post('/api/auth/reset-password', (req, res) => {
    const { email, code, password, confirmPassword } = req.body;

    if (!email || !code || !password || !confirmPassword) {
        return res.status(400).json({ error: "All fields are required." });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match." });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ error: "Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character." });
    }

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || user.reset_code !== code) {
        return res.status(400).json({ error: "Invalid email or reset code." });
    }

    const password_hash = hashPassword(password);
    db.prepare("UPDATE users SET password_hash = ?, reset_code = NULL WHERE id = ?").run(password_hash, user.id);

    return res.json({ message: "Password reset successful! You can now log in with your new password." });
});

// 6. Get Profile Info
app.get('/api/auth/profile', authenticateToken, (req, res) => {
    // Stats calculation
    const reviewStats = db.prepare("SELECT COUNT(*) as count FROM reviews WHERE user_id = ?").get(req.user.id);
    const orderCount = Math.floor(Math.random() * 20) + 5; // Simulation: random user orders

    const favorites = db.prepare(`
        SELECT r.name, r.id FROM favorites f
        JOIN restaurants r ON f.restaurant_id = r.id
        WHERE f.user_id = ?
    `).all(req.user.id);

    return res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
        role: req.user.role,
        is_verified: req.user.is_verified,
        created_at: req.user.created_at,
        reviews_count: reviewStats.count,
        orders_count: orderCount,
        favorites
    });
});

// 7. Edit Profile Info
app.post('/api/auth/profile/edit', authenticateToken, (req, res) => {
    const { name, password, newPassword, confirmPassword } = req.body;

    if (!name) return res.status(400).json({ error: "Name cannot be empty." });

    if (password) {
        // Wants to update password
        const match = verifyPassword(password, req.user.password_hash);
        if (!match) return res.status(400).json({ error: "Incorrect current password." });

        if (!newPassword || newPassword !== confirmPassword) {
            return res.status(400).json({ error: "New passwords do not match." });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ error: "Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character." });
        }

        const password_hash = hashPassword(newPassword);
        db.prepare("UPDATE users SET name = ?, password_hash = ? WHERE id = ?").run(name, password_hash, req.user.id);
    } else {
        // Just name update
        db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, req.user.id);
    }

    return res.json({ message: "Profile updated successfully!" });
});

// 8. Logout User
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    return res.json({ message: "Logged out successfully." });
});

// ==========================================
// RESTAURANT RATING ENDPOINTS
// ==========================================

// Get All Restaurants (with ratings)
app.get('/api/restaurants', (req, res) => {
    try {
        const restaurants = db.prepare("SELECT * FROM restaurants").all();

        const formatted = restaurants.map(r => {
            // Get stats
            const stats = db.prepare(`
                SELECT 
                    COUNT(*) as count,
                    AVG(overall_experience) as avg_overall,
                    AVG(food_quality) as avg_quality,
                    AVG(taste) as avg_taste,
                    AVG(hygiene) as avg_hygiene,
                    AVG(delivery_speed) as avg_speed,
                    AVG(packaging) as avg_pkg,
                    AVG(average_rating) as avg_total
                FROM reviews rev
                JOIN ratings rat ON rev.id = rat.review_id
                WHERE rev.restaurant_id = ? AND rev.is_hidden = 0
            `).get(r.id);

            // Rating distribution
            const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            const ratingsList = db.prepare(`
                SELECT CAST(average_rating AS INTEGER) as rat_val, COUNT(*) as count 
                FROM reviews rev
                JOIN ratings rat ON rev.id = rat.review_id
                WHERE rev.restaurant_id = ? AND rev.is_hidden = 0
                GROUP BY rat_val
            `).all(r.id);

            ratingsList.forEach(item => {
                const val = Math.round(item.rat_val);
                if (val >= 1 && val <= 5) distribution[val] = item.count;
            });

            return {
                id: r.id,
                name: r.name,
                cuisine: r.cuisine,
                image_url: r.image_url,
                reviews_count: stats.count || 0,
                rating: stats.avg_total ? Number(stats.avg_total.toFixed(1)) : 0,
                categories: {
                    overall: stats.avg_overall ? Number(stats.avg_overall.toFixed(1)) : 0,
                    food_quality: stats.avg_quality ? Number(stats.avg_quality.toFixed(1)) : 0,
                    taste: stats.avg_taste ? Number(stats.avg_taste.toFixed(1)) : 0,
                    hygiene: stats.avg_hygiene ? Number(stats.avg_hygiene.toFixed(1)) : 0,
                    delivery_speed: stats.avg_speed ? Number(stats.avg_speed.toFixed(1)) : 0,
                    packaging: stats.avg_pkg ? Number(stats.avg_pkg.toFixed(1)) : 0
                },
                distribution
            };
        });

        return res.json(formatted);
    } catch (e) {
        return res.status(500).json({ error: "Failed to fetch restaurants." });
    }
});

// Toggle Favorite Restaurant
app.post('/api/restaurants/:id/favorite', authenticateToken, (req, res) => {
    const restaurantId = parseInt(req.params.id);
    const existing = db.prepare("SELECT * FROM favorites WHERE user_id = ? AND restaurant_id = ?").get(req.user.id, restaurantId);

    if (existing) {
        db.prepare("DELETE FROM favorites WHERE id = ?").run(existing.id);
        return res.json({ message: "Removed from favorites.", isFavorite: false });
    } else {
        db.prepare("INSERT INTO favorites (user_id, restaurant_id) VALUES (?, ?)").run(req.user.id, restaurantId);
        return res.json({ message: "Added to favorites!", isFavorite: true });
    }
});

// Get Reviews of a Restaurant (Paginated)
app.get('/api/reviews', (req, res) => {
    const restaurantId = parseInt(req.query.restaurantId);
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    const token = req.cookies.token;
    let userId = null;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
        } catch (e) {}
    }

    try {
        const totalRows = db.prepare("SELECT COUNT(*) as count FROM reviews WHERE restaurant_id = ? AND is_hidden = 0").get(restaurantId);
        const totalPages = Math.ceil(totalRows.count / limit);

        const reviews = db.prepare(`
            SELECT 
                r.id, r.title, r.description, r.created_at,
                u.name as user_name, u.avatar as user_avatar, u.role as user_role, u.is_verified as user_verified,
                rat.overall_experience, rat.food_quality, rat.taste, rat.hygiene, rat.delivery_speed, rat.packaging, rat.average_rating
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN ratings rat ON r.id = rat.review_id
            WHERE r.restaurant_id = ? AND r.is_hidden = 0
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `).all(restaurantId, limit, offset);

        const formatted = reviews.map(rev => {
            const helpfulCount = db.prepare("SELECT COUNT(*) as count FROM helpful_votes WHERE review_id = ?").get(rev.id).count;
            const hasVotedHelpful = userId ? (db.prepare("SELECT 1 FROM helpful_votes WHERE user_id = ? AND review_id = ?").get(userId, rev.id) ? true : false) : false;

            return {
                id: rev.id,
                title: escapeHtml(rev.title),
                description: escapeHtml(rev.description),
                created_at: rev.created_at,
                user: {
                    name: escapeHtml(rev.user_name),
                    avatar: rev.user_avatar,
                    role: rev.user_role,
                    is_verified: rev.user_verified === 1
                },
                ratings: {
                    overall: rev.overall_experience,
                    food_quality: rev.food_quality,
                    taste: rev.taste,
                    hygiene: rev.hygiene,
                    delivery_speed: rev.delivery_speed,
                    packaging: rev.packaging,
                    average: Number(rev.average_rating.toFixed(1))
                },
                helpful_count: helpfulCount,
                has_voted_helpful: hasVotedHelpful
            };
        });

        // Add user's own review if present for editing
        let userReview = null;
        if (userId) {
            const rev = db.prepare(`
                SELECT r.id, r.title, r.description, rat.overall_experience, rat.food_quality, rat.taste, rat.hygiene, rat.delivery_speed, rat.packaging
                FROM reviews r
                JOIN ratings rat ON r.id = rat.review_id
                WHERE r.user_id = ? AND r.restaurant_id = ?
            `).get(userId, restaurantId);

            if (rev) {
                userReview = {
                    id: rev.id,
                    title: escapeHtml(rev.title),
                    description: escapeHtml(rev.description),
                    ratings: {
                        overall: rev.overall_experience,
                        food_quality: rev.food_quality,
                        taste: rev.taste,
                        hygiene: rev.hygiene,
                        delivery_speed: rev.delivery_speed,
                        packaging: rev.packaging
                    }
                };
            }
        }

        return res.json({
            reviews: formatted,
            pagination: {
                page,
                totalPages,
                totalReviews: totalRows.count
            },
            userReview
        });
    } catch (e) {
        return res.status(500).json({ error: "Failed to fetch reviews." });
    }
});

// Add Review
app.post('/api/reviews/add', authenticateToken, (req, res) => {
    const { restaurantId, title, description, ratings } = req.body;

    if (!req.user.is_verified) {
        return res.status(403).json({ error: "Please verify your email address to submit reviews." });
    }

    if (!restaurantId || !title || !description || !ratings) {
        return res.status(400).json({ error: "All fields and ratings are required." });
    }

    if (description.length > 500) {
        return res.status(400).json({ error: "Review details exceed 500 character limit." });
    }

    // Check ratings keys
    const categories = ['overall', 'food_quality', 'taste', 'hygiene', 'delivery_speed', 'packaging'];
    for (const cat of categories) {
        const val = parseInt(ratings[cat]);
        if (isNaN(val) || val < 1 || val > 5) {
            return res.status(400).json({ error: `Invalid rating value for ${cat}. Must be between 1 and 5.` });
        }
    }

    // Check if user already reviewed this restaurant
    const exist = db.prepare("SELECT id FROM reviews WHERE user_id = ? AND restaurant_id = ?").get(req.user.id, restaurantId);
    if (exist) {
        return res.status(400).json({ error: "You have already submitted a review for this location. You can edit your existing review instead." });
    }

    try {
        // Transaction emulation via serial operations
        const result = db.prepare(`
            INSERT INTO reviews (user_id, restaurant_id, title, description)
            VALUES (?, ?, ?, ?)
        `).run(req.user.id, restaurantId, title, description);
        const reviewId = result.lastInsertRowid;

        const avg = (ratings.overall + ratings.food_quality + ratings.taste + ratings.hygiene + ratings.delivery_speed + ratings.packaging) / 6;

        db.prepare(`
            INSERT INTO ratings (review_id, overall_experience, food_quality, taste, hygiene, delivery_speed, packaging, average_rating)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(reviewId, ratings.overall, ratings.food_quality, ratings.taste, ratings.hygiene, ratings.delivery_speed, ratings.packaging, avg);

        return res.status(201).json({ message: "Review submitted successfully!" });
    } catch (e) {
        return res.status(500).json({ error: "Failed to submit review." });
    }
});

// Edit Review
app.post('/api/reviews/edit', authenticateToken, (req, res) => {
    const { reviewId, title, description, ratings } = req.body;

    if (!reviewId || !title || !description || !ratings) {
        return res.status(400).json({ error: "All fields are required." });
    }

    if (description.length > 500) {
        return res.status(400).json({ error: "Review details exceed 500 character limit." });
    }

    const review = db.prepare("SELECT * FROM reviews WHERE id = ?").get(reviewId);
    if (!review) return res.status(404).json({ error: "Review not found." });
    if (review.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized access." });
    }

    try {
        db.prepare("UPDATE reviews SET title = ?, description = ? WHERE id = ?").run(title, description, reviewId);
        
        const avg = (ratings.overall + ratings.food_quality + ratings.taste + ratings.hygiene + ratings.delivery_speed + ratings.packaging) / 6;
        db.prepare(`
            UPDATE ratings SET 
                overall_experience = ?, food_quality = ?, taste = ?, hygiene = ?, delivery_speed = ?, packaging = ?, average_rating = ?
            WHERE review_id = ?
        `).run(ratings.overall, ratings.food_quality, ratings.taste, ratings.hygiene, ratings.delivery_speed, ratings.packaging, avg, reviewId);

        return res.json({ message: "Review updated successfully!" });
    } catch (e) {
        return res.status(500).json({ error: "Failed to update review." });
    }
});

// Delete Review
app.post('/api/reviews/delete', authenticateToken, (req, res) => {
    const { reviewId } = req.body;

    if (!reviewId) return res.status(400).json({ error: "Review ID is required." });

    const review = db.prepare("SELECT * FROM reviews WHERE id = ?").get(reviewId);
    if (!review) return res.status(404).json({ error: "Review not found." });
    if (review.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Unauthorized access." });
    }

    try {
        db.prepare("DELETE FROM reviews WHERE id = ?").run(reviewId);
        return res.json({ message: "Review deleted successfully!" });
    } catch (e) {
        return res.status(500).json({ error: "Failed to delete review." });
    }
});

// Toggle Helpful Vote on Review
app.post('/api/reviews/:id/helpful', authenticateToken, (req, res) => {
    const reviewId = parseInt(req.params.id);

    const vote = db.prepare("SELECT * FROM helpful_votes WHERE user_id = ? AND review_id = ?").get(req.user.id, reviewId);

    if (vote) {
        db.prepare("DELETE FROM helpful_votes WHERE id = ?").run(vote.id);
        return res.json({ message: "Helpful vote removed.", voted: false });
    } else {
        db.prepare("INSERT INTO helpful_votes (user_id, review_id) VALUES (?, ?)").run(req.user.id, reviewId);
        return res.json({ message: "Review marked as helpful!", voted: true });
    }
});

// Report Review
app.post('/api/reviews/:id/report', authenticateToken, (req, res) => {
    const reviewId = parseInt(req.params.id);

    try {
        db.prepare("UPDATE reviews SET is_reported = 1 WHERE id = ?").run(reviewId);
        return res.json({ message: "Review reported successfully. Our admins will investigate." });
    } catch (e) {
        return res.status(500).json({ error: "Failed to report review." });
    }
});

// ==========================================
// ADMIN ENDPOINTS
// ==========================================

// Get Admin Dashboard Stats
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    const reviewCount = db.prepare("SELECT COUNT(*) as count FROM reviews").get().count;
    const reportedCount = db.prepare("SELECT COUNT(*) as count FROM reviews WHERE is_reported = 1").get().count;
    const averageRating = db.prepare("SELECT AVG(average_rating) as avg FROM ratings").get().avg || 0;

    return res.json({
        users: userCount,
        reviews: reviewCount,
        reported: reportedCount,
        averageRating: Number(averageRating.toFixed(1))
    });
});

// Get User list for admin
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
    const users = db.prepare("SELECT id, name, email, role, is_verified, is_banned, created_at FROM users").all();
    return res.json(users);
});

// Ban/Unban User
app.post('/api/admin/users/:id/ban', authenticateAdmin, (req, res) => {
    const userId = parseInt(req.params.id);
    const targetUser = db.prepare("SELECT role, is_banned FROM users WHERE id = ?").get(userId);

    if (!targetUser) return res.status(404).json({ error: "User not found." });
    if (targetUser.role === 'admin') return res.status(400).json({ error: "Cannot ban an administrator." });

    const newBanState = targetUser.is_banned === 1 ? 0 : 1;
    db.prepare("UPDATE users SET is_banned = ? WHERE id = ?").run(newBanState, userId);

    return res.json({ message: newBanState === 1 ? "User banned successfully." : "User unbanned successfully." });
});

// Hide/Show reported reviews
app.post('/api/admin/reviews/:id/hide', authenticateAdmin, (req, res) => {
    const reviewId = parseInt(req.params.id);
    const rev = db.prepare("SELECT is_hidden FROM reviews WHERE id = ?").get(reviewId);

    if (!rev) return res.status(404).json({ error: "Review not found." });

    const newHideState = rev.is_hidden === 1 ? 0 : 1;
    db.prepare("UPDATE reviews SET is_hidden = ?, is_reported = 0 WHERE id = ?").run(newHideState, reviewId);

    return res.json({ message: newHideState === 1 ? "Review hidden successfully." : "Review unhidden successfully." });
});

// Delete Review (Admin)
app.delete('/api/admin/reviews/:id', authenticateAdmin, (req, res) => {
    const reviewId = parseInt(req.params.id);
    try {
        db.prepare("DELETE FROM reviews WHERE id = ?").run(reviewId);
        return res.json({ message: "Review deleted permanently." });
    } catch (e) {
        return res.status(500).json({ error: "Failed to delete review." });
    }
});

// List of Reported/Hidden reviews for admin panel
app.get('/api/admin/reviews', authenticateAdmin, (req, res) => {
    const reviews = db.prepare(`
        SELECT 
            r.id, r.title, r.description, r.is_hidden, r.is_reported, r.created_at,
            u.name as user_name, u.email as user_email,
            res.name as restaurant_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        JOIN restaurants res ON r.restaurant_id = res.id
        ORDER BY r.is_reported DESC, r.created_at DESC
    `).all();
    return res.json(reviews);
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 LiveKitchen Premium Express Server is up!`);
    console.log(`🔗 Local Address: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
});
