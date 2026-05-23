import express from 'express';
import * as courseController from '../controllers/courseController.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = express.Router();

router.get('/', requireAuth, courseController.getCourses);
router.post('/', requireAdmin, courseController.createCourse);
router.put('/:id', requireAdmin, courseController.updateCourse);
router.delete('/:id', requireAdmin, courseController.deleteCourse);

export default router;
