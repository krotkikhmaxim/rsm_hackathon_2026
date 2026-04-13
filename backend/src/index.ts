import express, { NextFunction, Request, Response } from 'express';

const predictRouter = require('./predict').default;
const analyticsRouter = require('./analytics').default;

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const API_PREFIX = '/api/v1';

app.use(express.json());

app.get(`${API_PREFIX}/health`, (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Node.js Backend работает',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use(`${API_PREFIX}/predict`, predictRouter);
app.use(`${API_PREFIX}/analytics`, analyticsRouter);

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
  });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
