import express from 'express';
import { chatWithAsha } from '../controllers/aiController.js';

const router = express.Router();

router.post('/chat', chatWithAsha);

export default router;
