import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';
import type { PredictRequest, MLServiceResponse } from './types';

const router = Router();
const prisma = new PrismaClient();
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// POST /api/v1/predict — запрос прогноза
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { enterprise_code, date, horizon } = req.body as PredictRequest;

    if (!enterprise_code) {
      return res.status(400).json({ error: 'Не указан код предприятия (enterprise_code)' });
    }

    const profile = await prisma.enterpriseProfile.findUnique({
      where: { enterprise_code: String(enterprise_code) },
    });

    if (!profile) {
      return res.status(404).json({ error: `Компания с кодом ${enterprise_code} не найдена` });
    }

    const targetDate = date || new Date().toISOString().slice(0, 10);
    const targetHorizon = horizon || '7d';

    // Вызов ML-сервиса
    const mlPayload = {
      date: targetDate,
      horizon: targetHorizon,
      enterprise_type: profile.type,
      region: profile.region,
      host_count: profile.host_count,
    };

    const mlResponse = await axios.post<MLServiceResponse>(`${ML_URL}/internal/predict`, mlPayload);
    const mlData = mlResponse.data;

    const requestId = crypto.randomUUID();

    // Сохранение в лог
    await prisma.predictionLog.create({
      data: {
        request_id: requestId,
        enterprise_code: profile.enterprise_code,
        probability: mlData.top_threat.probability,
        predicted_threat: mlData.top_threat.threatname,
        predicted_cluster: String(mlData.top_threat.threat_cluster),
        horizon: targetHorizon,
        report_md: mlData.report_md,
        targetDate: new Date(targetDate),
        estimated_damage: profile.host_count * 10500,
      },
    });

    return res.json({
      status: 'success',
      data: {
        request_id: requestId,
        top_threat: mlData.top_threat,
        all_threats: mlData.all_threats,
        report_md: mlData.report_md,
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

// GET /api/v1/predict/history — история прогнозов
router.get('/history', async (_req: Request, res: Response): Promise<any> => {
  try {
    const predictions = await prisma.predictionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        request_id: true,
        enterprise_code: true,
        predicted_threat: true,
        probability: true,
        horizon: true,
        targetDate: true,
        createdAt: true,
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

// GET /api/v1/predict/report/:requestId — markdown отчёт
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
