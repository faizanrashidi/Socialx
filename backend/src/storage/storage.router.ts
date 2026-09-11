import { Router, Response } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { authenticateToken, AuthRequest } from '../common/auth.middleware';

export const storageRouter = Router();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: !!process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'socialx-media';

storageRouter.post('/upload-url', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { contentType, fileExtension } = req.body;

    if (!contentType || !contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      return res.status(400).json({ error: 'Valid image or video contentType required' });
    }

    const ext = fileExtension || (contentType.includes('png') ? 'png' : contentType.includes('mp4') ? 'mp4' : 'jpg');
    const key = `uploads/${req.user!.userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // 15 min expiry for signed upload
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    const publicUrl = process.env.S3_PUBLIC_URL
      ? `${process.env.S3_PUBLIC_URL}/${key}`
      : `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

    return res.json({ uploadUrl, key, publicUrl });
  } catch (error: any) {
    console.error('Storage URL error:', error);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});
