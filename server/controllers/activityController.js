import * as db from '../supabase.js';
import { getUsers } from '../auth.js';
import { getDB } from '../db.js';

export const getActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const { lead_id } = req.query;
    const activities = await db.getActivities({ lead_id }, limit);
    const users = await getUsers();
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const dbData = getDB();
    const portalProfiles = dbData.portalProfiles || {};
    const enriched = activities.map(a => ({
      ...a,
      user_name: userMap[a.user_id]?.name || portalProfiles[a.user_id]?.name || (a.type === 'student_portal' ? 'Student' : 'System'),
      user_role: userMap[a.user_id]?.role || (portalProfiles[a.user_id] ? 'student' : (a.type === 'student_portal' ? 'student' : 'system'))
    }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
