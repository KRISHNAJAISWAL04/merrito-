import * as db from '../supabase.js';
import { assertRequired } from '../validate.js';

export const getCounselors = async (req, res) => {
  try {
    const counselors = await db.getCounselors();
    const leads = await db.getLeads({});
    const enriched = counselors.map(c => {
      const assigned = leads.filter(l => l.counselor_id === c.id).length;
      const converted = leads.filter(l => l.counselor_id === c.id && (l.stage === 'admitted' || l.stage === 'enrolled')).length;
      const active = leads.filter(l => l.counselor_id === c.id && !['admitted', 'enrolled'].includes(l.stage)).length;
      return { ...c, leads_assigned: assigned, conversions: converted, active_leads: active };
    });
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCounselor = async (req, res) => {
  try {
    const counselor = await db.getCounselor(req.params.id);
    if (!counselor) return res.status(404).json({ error: 'Counselor not found' });
    res.json(counselor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCounselor = async (req, res) => {
  try {
    assertRequired(req.body, ['name']);
    const counselor = await db.createCounselor(req.body);
    res.status(201).json(counselor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateCounselor = async (req, res) => {
  try {
    const updated = await db.updateCounselor(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(error.message === 'Counselor not found' ? 404 : 400).json({ error: error.message });
  }
};

export const deleteCounselor = async (req, res) => {
  try {
    await db.deleteCounselor(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
