import express from 'express';
import * as smoAi from '../services/smoAi.js';
import supabase from '../supabase.js';
import logger from '../logger.js';
import { buildOrFilter, selectSearchTerms, mapQuestionSummaries } from '../lib/search.js';

const router = express.Router();

// Same shape GET /questions returns, so the frontend can render results identically.
const QUESTION_SELECT = `
  id, title, is_solved, vote_count, created_at,
  author:profiles!author_id(id, username),
  question_tags(tag:tags(name)),
  answers(count)
`;

// POST /ai/tags — proxy to smo-ai
router.post('/tags', async (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

  const result = await smoAi.suggestTags(title);
  if (result?.rateLimited) return res.status(429).json({ error: 'groq_rate_limited' });
  return res.json(result ?? { tags: [] });
});

// POST /ai/smart-search — expand the query via smo-ai, then search Supabase.
// Falls back to a plain search on the raw query if smo-ai is down or rate limited.
router.post('/smart-search', async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'query is required' });

  const result = await smoAi.smartSearch(query.trim());

  const { terms, usedFallback } = selectSearchTerms(query, result);
  if (usedFallback) {
    logger.warn('smart-search falling back to raw query', { query: query.trim() });
  }

  const orFilter = buildOrFilter(terms);
  if (!orFilter) return res.json({ questions: [] });

  const { data, error } = await supabase
    .from('questions')
    .select(QUESTION_SELECT)
    .or(orFilter)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('smart-search query failed', { error: error.message });
    return res.status(500).json({ error: error.message });
  }

  return res.json({ questions: mapQuestionSummaries(data) });
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
