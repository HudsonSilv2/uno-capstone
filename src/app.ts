import express from 'express';
import cors from 'cors';
import { errorMiddleware } from './middlewares/error.middleware';
import { apiTrackerMiddleware } from './middlewares/api-tracker.middleware';

import routes from './routes';
import statsRoutes from './routes/stats.routes';

const app = express();

/*
  The front-end runs on a different origin (Vite dev server), so the browser
  needs CORS to be explicitly allowed. CORS_ORIGIN accepts a comma-separated
  list; when it is not set, the local Vite ports are allowed by default.
*/
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(apiTrackerMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use('/stats', statsRoutes);
app.use('/api', routes);

app.use(errorMiddleware);

export default app;

