import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  branch: z.string().optional()
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  branch: z.string().optional()
});

export const leadSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(5, 'Valid phone number is required'),
  course_id: z.string().optional().nullable(),
  source: z.string().optional(),
  priority: z.string().optional(),
  city: z.string().optional(),
  counselor_id: z.string().optional().nullable()
});

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  lead_id: z.string().min(1, 'Lead ID is required'),
  due_date: z.string().min(1, 'Due date is required'),
  type: z.enum(['call', 'email', 'meeting', 'whatsapp', 'visit', 'other']).optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  notes: z.string().optional()
});

export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.validatedData = parsed;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message, details: error.errors });
    }
    next(error);
  }
};
