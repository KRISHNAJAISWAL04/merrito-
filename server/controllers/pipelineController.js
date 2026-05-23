import * as db from '../supabase.js';

export const getPipeline = async (req, res) => {
  try {
    const filterCounselorId = req.user.role === 'counselor' ? req.user.counselor_id : undefined;
    const leads = await db.getLeads({ counselor_id: filterCounselorId });
    const counselors = await db.getCounselors();
    const courses = await db.getCourses();

    const counselorMap = Object.fromEntries(counselors.map(c => [c.id, c]));
    const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));

    const stages = ['enquiry', 'counseling_scheduled', 'counseling_done', 'application_submitted', 'documents_verified', 'admitted', 'enrolled'];
    const pipeline = {};
    stages.forEach(stage => {
      pipeline[stage] = leads
        .filter(l => l.stage === stage)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .map(l => ({
          ...l,
          name: `${l.first_name} ${l.last_name}`,
          counselor_name: counselorMap[l.counselor_id]?.name || 'Unassigned',
          course_name: courseMap[l.course_id]?.name || 'N/A'
        }));
    });

    res.json(pipeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
