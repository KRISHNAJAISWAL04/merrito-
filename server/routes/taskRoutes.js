import express from 'express';
import * as taskController from '../controllers/taskController.js';
import { validate, taskSchema } from '../middlewares/validate.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', taskController.getTasks);
router.post('/', validate(taskSchema), taskController.createTask);
router.patch('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

export default router;
