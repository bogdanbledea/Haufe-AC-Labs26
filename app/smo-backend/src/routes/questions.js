import express from 'express';
import supabase from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';
import logger from '../logger.js';

const router = express.Router();

// GET /questions?tag=react
router.get('/', async (req, res) => {
  const { tag } = req.query;

  let query = supabase
    .from('questions')
    .select(`
      id, title, is_solved, vote_count, created_at,
      author:profiles!author_id(id, username),
      question_tags(tag:tags(name)),
      answers(count)
    `)
    .order('created_at', { ascending: false });

  if (tag) {
    const { data: taggedIds } = await supabase
      .from('question_tags')
      .select('question_id, tags!inner(name)')
      .eq('tags.name', tag);

    const ids = taggedIds?.map((t) => t.question_id) ?? [];
    if (ids.length === 0) return res.json({ questions: [] });
    query = query.in('id', ids);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const questions = data.map((q) => ({
    ...q,
    answer_count: q.answers?.[0]?.count ?? 0,
    answers: undefined,
  }));

  return res.json({ questions });
});

// GET /questions/:id — full detail with answers and comments
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const [{ data: question, error: qErr }, { data: answers, error: aErr }] = await Promise.all([
    supabase
      .from('questions')
      .select('*, author:profiles!author_id(id, username), question_tags(tag:tags(name))')
      .eq('id', id)
      .single(),
    supabase
      .from('answers')
      .select('*, author:profiles!author_id(id, username)')
      .eq('question_id', id)
      .order('is_accepted', { ascending: false })
      .order('vote_count', { ascending: false }),
  ]);

  if (qErr) return res.status(404).json({ error: 'Question not found' });
  if (aErr) return res.status(500).json({ error: aErr.message });

  const answerIds = answers?.map((a) => a.id) ?? [];
  const { data: comments } = await supabase
    .from('comments')
    .select('*, author:profiles!author_id(username)')
    .in('target_id', [id, ...answerIds])
    .order('created_at');

  const questionComments = comments?.filter(
    (c) => c.target_id === id && c.target_type === 'question'
  ) ?? [];

  const answersWithComments = answers?.map((a) => ({
    ...a,
    comments: comments?.filter((c) => c.target_id === a.id && c.target_type === 'answer') ?? [],
  })) ?? [];

  return res.json({
    question: { ...question, comments: questionComments, answers: answersWithComments },
  });
});

// POST /questions
router.post('/', requireAuth, async (req, res) => {
  const { title, description, tags = [] } = req.body;

  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ error: 'title and description are required' });
  }

  const { data: question, error } = await supabase
    .from('questions')
    .insert({
      title: title.trim(),
      description: description.trim(),
      author_id: req.user.id,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create question', { error: error.message, userId: req.user.id });
    return res.status(500).json({ error: error.message });
  }

  if (tags.length > 0) {
    const tagNames = [...new Set(tags.map((t) => t.toLowerCase().trim()))].filter(Boolean);

    for (const name of tagNames) {
      const { data: tag } = await supabase
        .from('tags')
        .upsert({ name }, { onConflict: 'name' })
        .select()
        .single();

      if (tag) {
        await supabase
          .from('question_tags')
          .upsert({ question_id: question.id, tag_id: tag.id });
      }
    }
  }

  logger.info('Question created', { questionId: question.id, userId: req.user.id, tags });
  return res.status(201).json({ question });
});

// DELETE /questions/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  const { data: question } = await supabase
    .from('questions')
    .select('author_id')
    .eq('id', id)
    .single();

  if (!question) return res.status(404).json({ error: 'Question not found' });
  if (question.author_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (error) {
    logger.error('Failed to delete question', { error: error.message, questionId: id });
    return res.status(500).json({ error: error.message });
  }

  logger.info('Question deleted', { questionId: id, userId: req.user.id });
  return res.json({ ok: true });
});

export default router;
