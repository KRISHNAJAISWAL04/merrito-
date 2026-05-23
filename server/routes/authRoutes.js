import express from 'express';
import * as authController from '../controllers/authController.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

router.post('/login', authController.login);
router.post('/supabase', authController.supabaseLogin);
router.get('/me', requireAuth, authController.me);
router.post('/signup', authController.signup);

export default router;
