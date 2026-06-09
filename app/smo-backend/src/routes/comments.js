import express from 'express';
import supabase from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /comments
// body: { target_id, target_type: 'question' | 'answer', body }
router.post('/', requireAuth, async (req, res) => {
  const { target_id, target_type, body } = req.body;

  if (!target_id || !target_type || !body?.trim()) {
    return res.status(400).json({ error: 'target_id, target_type and body are required' });
  }
  if (!['question', 'answer'].includes(target_type)) {
    return res.status(400).json({ error: 'target_type must be question or answer' });
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({ author_id: req.user.id, target_id, target_type, body: body.trim() })
    .select('*, author:profiles!author_id(username)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.status(201).json({ comment });
});

export default router;
