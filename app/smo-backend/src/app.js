import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import logger from './logger.js';

import authRoutes from './routes/auth.js';
import questionRoutes from './routes/questions.js';
import answerRoutes from './routes/answers.js';
import voteRoutes from './routes/votes.js';
import commentRoutes from './routes/comments.js';
import aiRoutes from './routes/ai.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan(':method :url :status :res[content-length] bytes - :response-time ms'));

app.use('/auth', authRoutes);
app.use('/questions', questionRoutes);
app.use('/', answerRoutes);       // mounts /questions/:id/answers and /answers/:id/accept
app.use('/votes', voteRoutes);
app.use('/comments', commentRoutes);
app.use('/ai', aiRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Global error handler — catches any unhandled error thrown in a route
app.use((err, req, res, _next) => {
  logger.error(`Unhandled error on ${req.method} ${req.path}`, { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
