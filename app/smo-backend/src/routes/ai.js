import express from 'express';
import * as smoAi from '../services/smoAi.js';
import supabase from '../supabase.js';

const router = express.Router();

// POST /ai/tags — proxy to smo-ai
router.post('/tags', async (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

  const result = await smoAi.suggestTags(title);
  if (result?.rateLimited) return res.status(429).json({ error: 'groq_rate_limited' });
  return res.json(result ?? { tags: [] });
});

// GET /ai/health — proxy to smo-ai
router.get('/health', async (_req, res) => {
  const result = await smoAi.health();
  return res.json(result ?? { ok: false });
});

// GET /ai/health — proxy to smo-ai
router.get('/health', async (_req, res) => {
  const result = await smoAi.health();
  return res.json(result ?? { ok: false });
});

// POST /ai/summarize — Fetch context, call AI wrapper, and cache results
router.post('/summarize', async (req, res) => {
  const { questionId } = req.body;

  if (!questionId) {
    return res.status(400).json({ error: 'questionId is required' });
  }

  try {
    // 1. Fetch Question and check the DB cache
    const { data: question, error: qErr } = await supabase
      .from('questions')
      .select('title, description, summary')
      .eq('id', questionId)
      .single();

    if (qErr || !question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Cache hit! Return immediately and save LLM token usage
    if (question.summary) {
      return res.json({ summary: question.summary });
    }

    // 2. Fetch the Top Answer (Prioritize accepted, then sort by highest vote count)
    const { data: answers } = await supabase
      .from('answers')
      .select('body')
      .eq('question_id', questionId)
      .order('is_accepted', { ascending: false })
      .order('vote_count', { ascending: false })
      .limit(1);

    const topAnswer = answers && answers.length > 0 ? answers[0].body : null;

    // 3. Fetch Top 3 Comments on the question for localized context
    const { data: comments } = await supabase
      .from('comments')
      .select('body')
      .eq('target_id', questionId)
      .eq('target_type', 'question')
      .order('created_at', { ascending: true })
      .limit(3);

    const topComments = comments && comments.length > 0 ? comments.map(c => c.body) : null;

    // 4. Fire request through the HTTP wrapper
    const result = await smoAi.getSummary(
      question.title, 
      question.description, 
      topAnswer, 
      topComments
    );

    // If the wrapper tells us it's down or caught an exception, fail gracefully with 503
    if (!result || result.isDown) {
      return res.status(503).json({ error: 'AI Service Temporarily Unavailable' });
    }

    if (result.rateLimited) {
      return res.status(429).json({ error: 'groq_rate_limited' });
    }

    // 5. Cache the successfully generated summary back to Supabase
    const { error: updateErr } = await supabase
      .from('questions')
      .update({ summary: result.summary })
      .eq('id', questionId);

    if (updateErr) {
      // Log it but don't break the user experience; still serve the summary.
      console.error('Failed to cache summary to database:', updateErr);
    }

    // 6. Return the finalized summary string to the frontend
    return res.json({ summary: result.summary });

  } catch (err) {
    console.error('Error handling /ai/summarize:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
