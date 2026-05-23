import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

router.get('/stats', requireAuth, dashboardController.getStats);

export default router;
