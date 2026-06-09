import 'dotenv/config';
import app from './app.js';
import logger from './logger.js';

const PORT = process.env.PORT || 3000;

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    logger.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

app.listen(PORT, () => {
  logger.info(`smo-backend running on port ${PORT}`);
  if (!process.env.SMO_AI_URL) {
    logger.warn('SMO_AI_URL not set — using default http://localhost:3100');
  }
});
