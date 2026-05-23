import express from 'express';
import { getActivities } from '../controllers/activityController.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

router.get('/', requireAuth, getActivities);

export default router;
