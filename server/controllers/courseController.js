import * as db from '../supabase.js';
import { assertRequired } from '../validate.js';

export const getCourses = async (req, res) => {
  try {
    const courses = await db.getCourses();
    const leads = await db.getLeads({});
    const enriched = courses.map(c => ({ ...c, lead_count: leads.filter(l => l.course_id === c.id).length }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCourse = async (req, res) => {
  try {
    assertRequired(req.body, ['name']);
    const course = await db.createCourse(req.body);
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const course = await db.updateCourse(req.params.id, req.body);
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    await db.deleteCourse(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
