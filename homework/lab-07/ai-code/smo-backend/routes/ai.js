const express = require('express');
const smoAi = require('../services/smoAi');

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

module.exports = router;
