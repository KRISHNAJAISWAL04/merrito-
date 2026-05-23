import express from 'express';
import * as leadController from '../controllers/leadController.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = express.Router();

router.get('/', requireAuth, leadController.getLeads);
router.get('/export/csv', requireAuth, leadController.exportLeadsCSV);
router.get('/:id', requireAuth, leadController.getLead);
router.post('/', requireAuth, leadController.createLead);
router.put('/:id', requireAuth, leadController.updateLead);
router.delete('/:id', requireAdmin, leadController.deleteLead);
router.post('/bulk-delete', requireAdmin, leadController.bulkDeleteLeads);

// Webhook
router.post('/webhook', leadController.webhookLead);

export default router;
