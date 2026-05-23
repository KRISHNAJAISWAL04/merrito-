import express from 'express';
import { getFormTemplates, createFormTemplate, getCampaigns, createCampaign } from '../controllers/formController.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = express.Router();

router.get('/form-templates', requireAuth, getFormTemplates);
router.post('/form-templates', requireAdmin, createFormTemplate);
router.get('/campaigns', requireAuth, getCampaigns);
router.post('/campaigns', requireAdmin, createCampaign);

export default router;
