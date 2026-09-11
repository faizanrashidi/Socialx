"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageRouter = void 0;
const express_1 = require("express");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const crypto_1 = __importDefault(require("crypto"));
const auth_middleware_1 = require("../common/auth.middleware");
exports.storageRouter = (0, express_1.Router)();
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin',
    },
});
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'socialx-media';
exports.storageRouter.post('/upload-url', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { contentType, fileExtension } = req.body;
        if (!contentType || !contentType.startsWith('image/') && !contentType.startsWith('video/')) {
            return res.status(400).json({ error: 'Valid image or video contentType required' });
        }
        const ext = fileExtension || (contentType.includes('png') ? 'png' : contentType.includes('mp4') ? 'mp4' : 'jpg');
        const key = `uploads/${req.user.userId}/${Date.now()}-${crypto_1.default.randomBytes(8).toString('hex')}.${ext}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });
        // 15 min expiry for signed upload
        const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: 900 });
        const publicUrl = process.env.S3_PUBLIC_URL
            ? `${process.env.S3_PUBLIC_URL}/${key}`
            : `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
        return res.json({ uploadUrl, key, publicUrl });
    }
    catch (error) {
        console.error('Storage URL error:', error);
        return res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});
