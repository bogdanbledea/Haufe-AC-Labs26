import express from 'express';
import supabase from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// POST /votes
// body: { target_id, target_type: 'question' | 'answer', value: 1 | -1 }
router.post('/', requireAuth, async (req, res) => {
  const { target_id, target_type, value } = req.body;

  if (!target_id || !target_type || value === undefined) {
    return res.status(400).json({ error: 'target_id, target_type and value are required' });
  }
  if (!['question', 'answer'].includes(target_type)) {
    return res.status(400).json({ error: 'target_type must be question or answer' });
  }
  if (value !== 1 && value !== -1) {
    return res.status(400).json({ error: 'value must be 1 or -1' });
  }

  const table = target_type === 'question' ? 'questions' : 'answers';
  const rpcName = target_type === 'question' ? 'increment_question_votes' : 'increment_answer_votes';
  const rpcArg = target_type === 'question' ? 'q_id' : 'a_id';

  // Check for an existing vote from this user on this target
  const { data: existing } = await supabase
    .from('votes')
    .select('id, value')
    .eq('user_id', req.user.id)
    .eq('target_id', target_id)
    .single();

  if (existing) {
    if (existing.value === value) {
      // Same vote again — toggle off (remove the vote)
      await supabase.from('votes').delete().eq('id', existing.id);
      await supabase.rpc(rpcName, { [rpcArg]: target_id, delta: -value });
    } else {
      // Opposite vote — flip it
      await supabase.from('votes').update({ value }).eq('id', existing.id);
      await supabase.rpc(rpcName, { [rpcArg]: target_id, delta: value * 2 });
    }
  } else {
    // New vote
    await supabase.from('votes').insert({ user_id: req.user.id, target_id, target_type, value });
    await supabase.rpc(rpcName, { [rpcArg]: target_id, delta: value });
  }

  const { data: updated } = await supabase
    .from(table)
    .select('vote_count')
    .eq('id', target_id)
    .single();

  return res.json({ vote_count: updated?.vote_count ?? 0 });
});

export default router;
