import express from 'express';
import * as pipelineController from '../controllers/pipelineController.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

router.get('/', requireAuth, pipelineController.getPipeline);

export default router;
