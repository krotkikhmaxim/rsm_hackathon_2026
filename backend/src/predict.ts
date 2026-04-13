import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const getSeason = (month: number) => {
  if (month >= 3 && month <= 5) return 'весна';
  if (month >= 6 && month <= 8) return 'лето';
  if (month >= 9 && month <= 11) return 'осень';
  return 'зима';
};

router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { enterprise_code } = req.body;

    if (!enterprise_code) {
      return res.status(400).json({ error: 'Не указан код предприятия' });
    }

    const profile = await prisma.enterpriseProfile.findUnique({
      where: { enterprise_code: String(enterprise_code) },
    });

    if (!profile) {
      return res.status(404).json({ error: `Компания с кодом ${enterprise_code} не найдена в базе` });
    }

    const now = new Date();
    const mlPayload = {
      enterprise_type: profile.type,
      host_count: profile.host_count,
      region: profile.region,
      hour: now.getHours(),
      day_of_week: now.getDay() === 0 ? 7 : now.getDay(),
      month: now.getMonth() + 1,
    };

    const mlResponse = await axios.post(`${ML_URL}/predict`, mlPayload);
    const prediction = mlResponse.data;

    await prisma.predictionLog.create({
      data: {
        request_id: crypto.randomUUID(),
        enterprise_code: profile.enterprise_code,
        probability: prediction.probability,
        predicted_threat: prediction.threat_code,
        predicted_object: prediction.target_object,
        season: getSeason(mlPayload.month),
        day_of_week: mlPayload.day_of_week,
        hour: mlPayload.hour,
      },
    });

    return res.json({
      status: 'success',
      data: {
        enterprise: profile,
        prediction,
      },
    });
  } catch (error: any) {
    console.error('[Predict API Error]:', error?.response?.data || error.message || error);
    return res.status(500).json({ error: 'Ошибка при формировании прогноза' });
  }
});

export default router;
