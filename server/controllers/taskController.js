import * as db from '../supabase.js';

export const getTasks = async (req, res) => {
  try {
    const { lead_id, status } = req.query;
    const tasks = await db.getTasks({ lead_id, status });

    const leads = await db.getLeads();
    const leadMap = Object.fromEntries(leads.map(l => [l.id, l]));

    const enriched = tasks.map(t => ({
      ...t,
      lead_name: leadMap[t.lead_id] ? `${leadMap[t.lead_id].first_name} ${leadMap[t.lead_id].last_name}` : 'Unknown Lead'
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createTask = async (req, res) => {
  try {
    const task = await db.createTask(req.validatedData);
    
    // Create activity for the task creation
    const lead = await db.getLead(task.lead_id);
    if (lead) {
      await db.createActivity({
        lead_id: task.lead_id,
        type: 'task_added',
        message: `New task added: ${task.title} (Due: ${new Date(task.due_date).toLocaleDateString()})`
      });
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const task = await db.updateTask(req.params.id, req.body);
    
    if (req.body.status === 'completed') {
      await db.createActivity({
        lead_id: task.lead_id,
        type: 'task_completed',
        message: `Task completed: ${task.title}`
      });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    await db.deleteTask(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
