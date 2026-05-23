import express from 'express';
import { getProfile, updateProfile, getDocuments, uploadDocument } from '../controllers/portalController.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

router.get('/profile', requireAuth, getProfile);
router.put('/profile', requireAuth, updateProfile);
router.get('/documents', requireAuth, getDocuments);
router.post('/documents', requireAuth, uploadDocument);

export default router;
