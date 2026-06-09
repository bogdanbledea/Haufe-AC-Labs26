import supabase from '../supabase.js';
import logger from '../logger.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    logger.warn(`Auth failed: missing header on ${req.method} ${req.path}`);
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    logger.warn(`Auth failed: invalid token on ${req.method} ${req.path}`);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}
