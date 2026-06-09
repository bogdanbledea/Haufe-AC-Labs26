import express from 'express';
import supabase from '../supabase.js';
import logger from '../logger.js';

const router = express.Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'email, password and username are required' });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'username must be at least 3 characters' });
  }

  // Check username is not taken before creating the auth user
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.trim())
    .single();

  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return res.status(400).json({ error: authError.message });
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    username: username.trim(),
  });

  if (profileError) {
    // Roll back the auth user to avoid zombie accounts
    await supabase.auth.admin.deleteUser(authData.user.id);
    return res.status(500).json({ error: 'Failed to create profile' });
  }

  // Sign in immediately to return a token
  const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return res.status(500).json({ error: 'Registered but could not sign in automatically' });
  }

  logger.info(`User registered`, { username: username.trim(), email });
  return res.status(201).json({
    token: session.session.access_token,
    refreshToken: session.session.refresh_token,
    user: { id: authData.user.id, email, username: username.trim() },
  });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', data.user.id)
    .single();

  logger.info(`User logged in`, { username: profile?.username, email });
  return res.json({
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: { id: data.user.id, email: data.user.email, username: profile?.username },
  });
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session) {
    return res.status(401).json({ error: 'Token refresh failed' });
  }

  return res.json({
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
});

export default router;
