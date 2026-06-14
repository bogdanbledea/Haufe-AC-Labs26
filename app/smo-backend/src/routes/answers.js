import express from 'express';
import supabase from '../supabase.js';
import { requireAuth } from '../middleware/auth.js';
import logger from '../logger.js';

const router = express.Router();

/**
 * Funcție ajutătoare care apelează serviciul smo-ai pentru evaluarea răspunsului.
 * Include un timeout de 3.5 secunde pentru a asigura un comportament "fire-and-forget".
 */
async function fetchAIBadge(answerBody) {
  const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:3100';
  const aiSecret = process.env.SMO_AI_SECRET;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(`${aiUrl}/evaluate-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': aiSecret,
      },
      body: JSON.stringify({ body: answerBody }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Validăm ca valoarea primită să respecte contractul API stabilit
    if (data?.badge && ['helpful', 'needs-detail', 'off-topic'].includes(data.badge)) {
      return data.badge;
    }

    return null;
  } catch (error) {
    // Dacă serviciul AI pică (503) sau dă timeout, eșuează silențios și returnează null
    logger.error('AI Badge evaluation skipped or failed', { error: error.message });
    return null;
  }
}

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

  // 1. Salvăm mai întâi răspunsul în baza de date
  const { data: answer, error } = await supabase
    .from('answers')
    .insert({ question_id: questionId, author_id: req.user.id, body: body.trim() })
    .select('*, author:profiles!author_id(id, username)')
    .single();

  if (error) {
    logger.error('Failed to create answer', { error: error.message, questionId, userId: req.user.id });
    return res.status(500).json({ error: error.message });
  }

  // 2. Evaluăm textul primit folosind AI-ul
  const badge = await fetchAIBadge(body.trim());

  // Structura inițială a răspunsului trimis către frontend
  let finalAnswer = { ...answer, quality_badge: badge };

  // 3. Dacă AI-ul a returnat un badge valid, actualizăm înregistrarea în baza de date
  if (badge) {
    const { data: updatedAnswer, error: updateError } = await supabase
      .from('answers')
      .update({ quality_badge: badge })
      .eq('id', answer.id)
      .select('*, author:profiles!author_id(id, username)')
      .single();

    if (!updateError && updatedAnswer) {
      finalAnswer = { ...updatedAnswer, quality_badge: badge };
    } else {
      logger.error('Failed to update answer with AI badge in database', { error: updateError?.message });
    }
  }

  logger.info('Answer posted with AI quality badge evaluation', { 
    answerId: answer.id, 
    questionId, 
    userId: req.user.id,
    badge: badge || 'none/failed'
  });

  // 4. Returnăm răspunsul 201 cu obiectul actualizat și masivul comments gol
  return res.status(201).json({ answer: { ...finalAnswer, comments: [] } });
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