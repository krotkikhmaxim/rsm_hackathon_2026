import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/analytics — KPI и статистика
router.get('/', async (_req: Request, res: Response): Promise<any> => {
  try {
    const [totalPredictions, totalEnterprises, avgResult, topThreats, byHorizon, recentPredictions] =
      await Promise.all([
        prisma.predictionLog.count(),
        prisma.enterpriseProfile.count(),
        prisma.predictionLog.aggregate({ _avg: { probability: true } }),
        prisma.predictionLog.groupBy({
          by: ['predicted_threat'],
          _count: { predicted_threat: true },
          _avg: { probability: true },
          orderBy: { _count: { predicted_threat: 'desc' } },
          take: 6,
        }),
        prisma.predictionLog.groupBy({
          by: ['horizon'],
          _count: { horizon: true },
        }),
        prisma.predictionLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            request_id: true,
            enterprise_code: true,
            predicted_threat: true,
            probability: true,
            horizon: true,
            targetDate: true,
            createdAt: true,
          },
        }),
      ]);

    return res.json({
      status: 'success',
      data: {
        total_predictions: totalPredictions,
        avg_probability: avgResult._avg.probability || 0,
        total_enterprises: totalEnterprises,
        top_threats: topThreats.map((t) => ({
          threat_name: t.predicted_threat,
          count: t._count.predicted_threat,
          avg_probability: t._avg.probability || 0,
        })),
        by_horizon: byHorizon.map((h) => ({
          horizon: h.horizon || 'unknown',
          count: h._count.horizon,
        })),
        recent_predictions: recentPredictions.map((p) => ({
          ...p,
          prediction_date: p.targetDate?.toISOString() || null,
        })),
      },
    });
  } catch (error: any) {
    console.error('[Analytics API Error]:', error.message);
    return res.status(500).json({ error: 'Ошибка при сборе аналитики' });
  }
});

export default router;
