import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';

import predictRouter from './predict';
import analyticsRouter from './analytics';
import threatsRouter from './threats';
import enterprisesRouter from './enterprises';
import recommendationsRouter from './recommendations';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const API_PREFIX = '/api/v1';
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.get(`${API_PREFIX}/health`, async (_req: Request, res: Response) => {
  let mlStatus = 'unknown';

  try {
    const mlRes = await axios.get(`${ML_URL}/health`, { timeout: 5000 });
    mlStatus = mlRes.data?.status || 'ok';
  } catch (err) {
    console.warn('ML Service healthcheck failed:', (err as Error).message);
    mlStatus = 'unavailable';
  }

  res.status(200).json({
    status: 'ok',
    message: 'Node.js Backend работает',
    ml_service: mlStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use(`${API_PREFIX}/predict`, predictRouter);
app.use(`${API_PREFIX}/analytics`, analyticsRouter);
app.use(`${API_PREFIX}/threats`, threatsRouter);
app.use(`${API_PREFIX}/enterprises`, enterprisesRouter);
app.use(`${API_PREFIX}/recommendations`, recommendationsRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: process.env.NODE_ENV !== 'production' ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
  console.log(`ML Service URL: ${ML_URL}`);
});