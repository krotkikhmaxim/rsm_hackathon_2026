import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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
          include: {
            threat_details: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        }),
      ]);

    const threatCodes = topThreats.map((t) => t.predicted_threat);
    const threats = await prisma.threat.findMany({
      where: { code: { in: threatCodes } },
      select: { code: true, name: true },
    });

    const threatNameMap = new Map(threats.map((t) => [t.code, t.name]));

    return res.json({
      status: 'success',
      data: {
        total_predictions: totalPredictions,
        avg_probability: avgResult._avg.probability || 0,
        total_enterprises: totalEnterprises,
        top_threats: topThreats.map((t) => ({
          threat_code: t.predicted_threat,
          threat_name: threatNameMap.get(t.predicted_threat) || t.predicted_threat,
          count: t._count.predicted_threat,
          avg_probability: t._avg.probability || 0,
        })),
        by_horizon: byHorizon.map((h) => ({
          horizon: h.horizon || 'unknown',
          count: h._count.horizon,
        })),
        recent_predictions: recentPredictions.map((p) => ({
          request_id: p.request_id,
          enterprise_code: p.enterprise_code,
          predicted_threat: p.threat_details?.name || p.predicted_threat,
          probability: p.probability,
          horizon: p.horizon,
          prediction_date: p.targetDate?.toISOString() || null,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('[Analytics API Error]:', error.message);
    return res.status(500).json({ error: 'Ошибка при сборе аналитики' });
  }
});

export default router;