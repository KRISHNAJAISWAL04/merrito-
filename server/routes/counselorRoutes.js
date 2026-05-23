import express from 'express';
import * as counselorController from '../controllers/counselorController.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = express.Router();

router.get('/', requireAuth, counselorController.getCounselors);
router.get('/:id', requireAuth, counselorController.getCounselor);
router.post('/', requireAdmin, counselorController.createCounselor);
router.put('/:id', requireAdmin, counselorController.updateCounselor);
router.delete('/:id', requireAdmin, counselorController.deleteCounselor);

export default router;
