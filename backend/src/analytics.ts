import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response): Promise<any> => {
    try {
        const totalPredictions = await prisma.predictionLog.count();
        const topThreats = await prisma.predictionLog.groupBy({
            by: ['predicted_threat'],
            _count: { predicted_threat: true },
            orderBy: { _count: { predicted_threat: 'desc' } },
            take: 5
        });
        
        const seasonStats = await prisma.predictionLog.groupBy({
            by: ['season'],
            _count: { season: true }
        });

        return res.json({
            status: 'success',
            data: {
                total_predictions: totalPredictions,
                top_threats: topThreats,
                seasons: seasonStats
            }
        });

    } catch (error: any) {
        console.error('[Analytics API Error]:', error.message);
        return res.status(500).json({ error: 'Ошибка при сборе аналитики' });
    }
});

export default router;