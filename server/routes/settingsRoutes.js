import express from 'express';
import * as settingsController from '../controllers/settingsController.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = express.Router();

router.get('/', requireAuth, settingsController.getSettings);
router.put('/', requireAdmin, settingsController.updateSettings);

export default router;
