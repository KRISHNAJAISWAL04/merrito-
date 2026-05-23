import * as db from '../supabase.js';
import {
  loginUser,
  loginWithSupabaseAccessToken,
  signupStudent
} from '../auth.js';

export const login = async (req, res) => {
  try {
    const { email, password, branch } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const result = await loginUser(email, password, branch);
    if (!result) {
      return res.status(401).json({
        error: db.USE_SUPABASE
          ? 'Invalid credentials. Contact admin to create your account.'
          : 'Invalid email or password'
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const supabaseLogin = async (req, res) => {
  try {
    const access_token = req.body?.access_token;
    if (!access_token) return res.status(400).json({ error: 'access_token required' });
    const result = await loginWithSupabaseAccessToken(access_token);
    if (!result) return res.status(401).json({ error: 'Invalid or expired Supabase session' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const me = (req, res) => {
  res.json(req.user);
};

export const signup = async (req, res) => {
  try {
    const { email, password, name, phone, branch } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Name, email and password required' });
    const result = await signupStudent(email, password, name, phone, branch || 'bareilly');
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
