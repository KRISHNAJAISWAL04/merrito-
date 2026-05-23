import express from 'express';
import { listUsers, addUser, editUser, removeUser } from '../controllers/userController.js';
import { requireAdmin } from '../auth.js';

const router = express.Router();

router.get('/', requireAdmin, listUsers);
router.post('/', requireAdmin, addUser);
router.put('/:id', requireAdmin, editUser);
router.delete('/:id', requireAdmin, removeUser);

export default router;
