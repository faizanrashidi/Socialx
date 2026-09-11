"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../common/prisma");
const auth_middleware_1 = require("../common/auth.middleware");
exports.authRouter = (0, express_1.Router)();
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'socialx_super_secret_access_jwt_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'socialx_super_secret_refresh_jwt_key_2026';
// Register
exports.authRouter.post('/register', async (req, res) => {
    try {
        const { email, username, password, displayName } = req.body;
        if (!email || !username || !password || !displayName) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const cleanUsername = username.trim().toLowerCase();
        if (cleanUsername.length < 3 || cleanUsername.length > 30) {
            return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
        }
        const existingUser = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [{ email: email.toLowerCase() }, { username: cleanUsername }],
            },
        });
        if (existingUser) {
            return res.status(409).json({ error: 'Email or username already in use' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.prisma.user.create({
            data: {
                email: email.toLowerCase(),
                username: cleanUsername,
                passwordHash,
                profile: {
                    create: {
                        displayName,
                        avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`,
                        bio: 'Hello! I am new to SocialX.',
                    },
                },
            },
            include: { profile: true },
        });
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username, role: user.role }, JWT_ACCESS_SECRET, { expiresIn: '15m' });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
        await prisma_1.prisma.session.create({
            data: {
                userId: user.id,
                refreshToken,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });
        return res.status(201).json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                profile: user.profile,
            },
            accessToken,
            refreshToken,
        });
    }
    catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});
// Login
exports.authRouter.post('/login', async (req, res) => {
    try {
        const { login, password } = req.body;
        if (!login || !password) {
            return res.status(400).json({ error: 'Username/email and password required' });
        }
        const normalized = login.trim().toLowerCase();
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [{ email: normalized }, { username: normalized }],
            },
            include: { profile: true },
        });
        if (!user || user.isSuspended) {
            return res.status(401).json({ error: 'Invalid credentials or account suspended' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username, role: user.role }, JWT_ACCESS_SECRET, { expiresIn: '15m' });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
        await prisma_1.prisma.session.create({
            data: {
                userId: user.id,
                refreshToken,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });
        return res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                profile: user.profile,
            },
            accessToken,
            refreshToken,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Login failed' });
    }
});
// Refresh Token
exports.authRouter.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken)
            return res.status(400).json({ error: 'Refresh token required' });
        const session = await prisma_1.prisma.session.findUnique({
            where: { refreshToken },
            include: { user: { include: { profile: true } } },
        });
        if (!session || session.expiresAt < new Date()) {
            return res.status(401).json({ error: 'Expired or invalid session' });
        }
        // Token rotation
        const newAccessToken = jsonwebtoken_1.default.sign({ userId: session.user.id, username: session.user.username, role: session.user.role }, JWT_ACCESS_SECRET, { expiresIn: '15m' });
        const newRefreshToken = jsonwebtoken_1.default.sign({ userId: session.user.id }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
        await prisma_1.prisma.session.update({
            where: { id: session.id },
            data: {
                refreshToken: newRefreshToken,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });
        return res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            user: {
                id: session.user.id,
                username: session.user.username,
                email: session.user.email,
                role: session.user.role,
                profile: session.user.profile,
            },
        });
    }
    catch (err) {
        return res.status(403).json({ error: 'Invalid refresh token' });
    }
});
// Current Authenticated User
exports.authRouter.get('/me', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user?.userId },
            include: { profile: true },
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        return res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            isPrivate: user.isPrivate,
            activityStatus: user.activityStatus,
            profile: user.profile,
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// Logout
exports.authRouter.post('/logout', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await prisma_1.prisma.session.deleteMany({ where: { refreshToken } });
        }
        return res.json({ success: true, message: 'Logged out successfully' });
    }
    catch (err) {
        return res.status(500).json({ error: 'Logout failed' });
    }
});
