import express from 'express';
import {
  getMarketingOverview,
  getTemplates, createTemplate, updateTemplate,
  getCampaigns, createCampaign, updateCampaign, launchCampaign,
  getIntegrations, updateIntegrations,
  getCallLogs, createCallLog,
  getFollowups, createFollowup,
  getBroadcasts, createBroadcast, sendBroadcast,
  getInbox, createInboxMessage, updateInboxMessage,
  getChats, initiateChat, sendChatMessage,
  getNotifications, createNotification, updateNotification
} from '../controllers/marketingController.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

router.get('/overview', requireAuth, getMarketingOverview);

router.get('/templates', requireAuth, getTemplates);
router.post('/templates', requireAuth, createTemplate);
router.put('/templates/:id', requireAuth, updateTemplate);

router.get('/campaigns', requireAuth, getCampaigns);
router.post('/campaigns', requireAuth, createCampaign);
router.put('/campaigns/:id', requireAuth, updateCampaign);
router.post('/campaigns/:id/launch', requireAuth, launchCampaign);

router.get('/integrations', requireAuth, getIntegrations);
router.put('/integrations', requireAuth, updateIntegrations);

router.get('/call-logs', requireAuth, getCallLogs);
router.post('/call-logs', requireAuth, createCallLog);

router.get('/followups', requireAuth, getFollowups);
router.post('/followups', requireAuth, createFollowup);

router.get('/broadcasts', requireAuth, getBroadcasts);
router.post('/broadcasts', requireAuth, createBroadcast);
router.post('/broadcasts/:id/send', requireAuth, sendBroadcast);

router.get('/inbox', requireAuth, getInbox);
router.post('/inbox', requireAuth, createInboxMessage);
router.put('/inbox/:id', requireAuth, updateInboxMessage);

router.get('/chats', requireAuth, getChats);
router.post('/chats', requireAuth, initiateChat);
router.post('/chats/:id/messages', requireAuth, sendChatMessage);

router.get('/notifications', requireAuth, getNotifications);
router.post('/notifications', requireAuth, createNotification);
router.put('/notifications/:id', requireAuth, updateNotification);

export default router;
