import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';
import process from 'process';
import type { PredictRequest, MLServiceResponse } from './types';

const router = Router();
const prisma = new PrismaClient();
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function resolveThreat(params: {
  threatName?: string | null;
  threatCode?: string | null;
  threatCluster?: string | number | null;
}) {
  const { threatName, threatCode, threatCluster } = params;

  if (threatCode) {
    const byCode = await prisma.threat.findUnique({
      where: { code: String(threatCode) },
    });
    if (byCode) return byCode;
  }

  if (threatName) {
    const byName = await prisma.threat.findFirst({
      where: { name: String(threatName) },
    });
    if (byName) return byName;
  }

  if (threatCluster !== undefined && threatCluster !== null) {
    const byCluster = await prisma.threat.findFirst({
      where: { cluster: String(threatCluster) },
    });
    if (byCluster) return byCluster;
  }

  return null;
}

router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { enterprise_code, date, horizon } = req.body as PredictRequest;

    if (!enterprise_code) {
      return res.status(400).json({
        error: 'Не указан код предприятия (enterprise_code)',
      });
    }

    const profile = await prisma.enterpriseProfile.findUnique({
      where: { enterprise_code: String(enterprise_code) },
    });

    if (!profile) {
      return res.status(404).json({
        error: `Компания с кодом ${enterprise_code} не найдена`,
      });
    }

    const targetDate = date || new Date().toISOString().slice(0, 10);
    const targetHorizon = horizon || '7d';

    const mlPayload = {
      date: targetDate,
      horizon: targetHorizon,
      enterprise_type: profile.type,
      region: profile.region,
      host_count: profile.host_count,
    };

    const mlResponse = await axios.post<MLServiceResponse>(`${ML_URL}/internal/predict`, mlPayload);
    const mlData = mlResponse.data;

    const topThreat = mlData?.top_threat;
    if (!topThreat) {
      return res.status(502).json({
        error: 'ML сервис не вернул top_threat',
      });
    }

    const resolvedThreat = await resolveThreat({
      threatCode: topThreat.threatcode,
      threatName: topThreat.threatname,
      threatCluster: topThreat.threat_cluster,
    });

    if (!resolvedThreat) {
      return res.status(500).json({
        error: `Не удалось сопоставить угрозу: ${topThreat.threatname ?? 'unknown'}`,
      });
    }

    const requestId = crypto.randomUUID();

    const predictionLog = await prisma.predictionLog.create({
      data: {
        request_id: requestId,
        enterprise_code: profile.enterprise_code,
        probability: Number(topThreat.probability),
        predicted_threat: resolvedThreat.code,
        predicted_cluster: topThreat.threat_cluster != null
          ? String(topThreat.threat_cluster)
          : (resolvedThreat.cluster ?? null),
        predicted_object: topThreat.object ? String(topThreat.object) : null,
        horizon: targetHorizon,
        report_md: mlData.report_md ?? null,
        targetDate: new Date(targetDate),
        estimated_damage: profile.host_count * 10500,
      },
      include: {
        threat_details: {
          select: {
            code: true,
            name: true,
            cluster: true,
          },
        },
      },
    });

    return res.json({
      status: 'success',
      data: {
        request_id: requestId,
        top_threat: {
          ...topThreat,
          threatcode: resolvedThreat.code,
          threatname: resolvedThreat.name,
        },
        all_threats: mlData.all_threats,
        report_md: mlData.report_md,
        prediction_log: {
          id: predictionLog.id,
          predicted_threat: predictionLog.predicted_threat,
          predicted_cluster: predictionLog.predicted_cluster,
          probability: predictionLog.probability,
          createdAt: predictionLog.createdAt,
        },
        enterprise: {
          enterprise_code: profile.enterprise_code,
          type: profile.type,
          host_count: profile.host_count,
          region: profile.region,
        },
      },
    });
  } catch (error: any) {
    console.error('[Predict API Error]:', error?.response?.data || error.message || error);
    return res.status(500).json({ error: 'Ошибка при формировании прогноза' });
  }
});

router.get('/history', async (_req: Request, res: Response): Promise<any> => {
  try {
    const predictions = await prisma.predictionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        threat_details: {
          select: {
            code: true,
            name: true,
            cluster: true,
          },
        },
      },
    });

    return res.json({
      status: 'success',
      data: { predictions },
    });
  } catch (error: any) {
    console.error('[Predict History Error]:', error.message);
    return res.status(500).json({ error: 'Ошибка при загрузке истории' });
  }
});

router.get('/report/:requestId', async (req: Request, res: Response): Promise<any> => {
  try {
    const log = await prisma.predictionLog.findUnique({
      where: { request_id: String(req.params.requestId) },
      select: { report_md: true },
    });

    if (!log) {
      return res.status(404).json({ error: 'Прогноз не найден' });
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.send(log.report_md || '');
  } catch (error: any) {
    console.error('[Report Error]:', error.message);
    return res.status(500).json({ error: 'Ошибка' });
  }
});

export default router;