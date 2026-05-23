import express from 'express';
import authRoutes from './authRoutes.js';
import leadRoutes from './leadRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import pipelineRoutes from './pipelineRoutes.js';
import courseRoutes from './courseRoutes.js';
import counselorRoutes from './counselorRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import applicationRoutes from './applicationRoutes.js';
import portalRoutes from './portalRoutes.js';
import userRoutes from './userRoutes.js';
import marketingRoutes from './marketingRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import formRoutes from './formRoutes.js';
import activityRoutes from './activityRoutes.js';
import taskRoutes from './taskRoutes.js';
import aiRoutes from './aiRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/leads', leadRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/pipeline', pipelineRoutes);
router.use('/courses', courseRoutes);
router.use('/counselors', counselorRoutes);
router.use('/settings', settingsRoutes);
router.use('/', applicationRoutes); // Handles /applications, /queries, /payments
router.use('/portal', portalRoutes);
router.use('/users', userRoutes);
router.use('/marketing', marketingRoutes);
router.use('/webhook', webhookRoutes);
router.use('/', formRoutes); // Handles /form-templates and /campaigns
router.use('/activities', activityRoutes);
router.use('/tasks', taskRoutes);
router.use('/ai', aiRoutes);

export default router;
