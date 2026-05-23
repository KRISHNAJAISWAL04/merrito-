import express from 'express';
import { captureLead } from '../controllers/webhookController.js';

const router = express.Router();

const buckets = new Map();

function rateLimit(req, res, next) {
  const key = `${req.ip || req.socket?.remoteAddress || 'local'}:${req.path}`;
  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, resetAt: now + 60_000 };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + 60_000;
  }
  bucket.count += 1;
  buckets.set(key, bucket);
  if (bucket.count > 30) return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  next();
}

function requireWebhookSecret(req, res, next) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) return next();
  const provided = req.headers['x-webhook-secret'] || req.query.secret;
  if (provided !== expected) return res.status(401).json({ error: 'Invalid webhook secret' });
  next();
}

router.post('/lead', rateLimit, requireWebhookSecret, captureLead);

export default router;
