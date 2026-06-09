import express from 'express';
import supabase from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';
import logger from '../logger.js';

const router = express.Router();

// POST /questions/:questionId/answers
router.post('/questions/:questionId/answers', requireAuth, async (req, res) => {
  const { questionId } = req.params;
  const { body } = req.body;

  if (!body?.trim()) {
    return res.status(400).json({ error: 'body is required' });
  }

  const { data: question } = await supabase
    .from('questions')
    .select('id')
    .eq('id', questionId)
    .single();

  if (!question) return res.status(404).json({ error: 'Question not found' });

  const { data: answer, error } = await supabase
    .from('answers')
    .insert({ question_id: questionId, author_id: req.user.id, body: body.trim() })
    .select('*, author:profiles!author_id(id, username)')
    .single();

  if (error) {
    logger.error('Failed to create answer', { error: error.message, questionId, userId: req.user.id });
    return res.status(500).json({ error: error.message });
  }

  logger.info('Answer posted', { answerId: answer.id, questionId, userId: req.user.id });
  return res.status(201).json({ answer: { ...answer, comments: [] } });
});

// PATCH /answers/:id/accept
router.patch('/answers/:id/accept', requireAuth, async (req, res) => {
  const { id } = req.params;

  const { data: answer } = await supabase
    .from('answers')
    .select('id, question_id')
    .eq('id', id)
    .single();

  if (!answer) return res.status(404).json({ error: 'Answer not found' });

  const { data: question } = await supabase
    .from('questions')
    .select('author_id')
    .eq('id', answer.question_id)
    .single();

  if (question?.author_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the question owner can accept an answer' });
  }

  // Unaccept any previously accepted answer for this question
  await supabase
    .from('answers')
    .update({ is_accepted: false })
    .eq('question_id', answer.question_id);

  const [{ error: aErr }, { error: qErr }] = await Promise.all([
    supabase.from('answers').update({ is_accepted: true }).eq('id', id),
    supabase.from('questions').update({ is_solved: true }).eq('id', answer.question_id),
  ]);

  if (aErr || qErr) {
    logger.error('Failed to accept answer', { answerId: id, error: (aErr || qErr)?.message });
    return res.status(500).json({ error: 'Failed to accept answer' });
  }

  logger.info('Answer accepted', { answerId: id, questionId: answer.question_id, userId: req.user.id });
  return res.json({ ok: true });
});

export default router;
