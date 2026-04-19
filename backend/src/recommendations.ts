import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const threatId = req.query.threatId ? Number(req.query.threatId) : undefined;

    const recommendations = await prisma.recommendation.findMany({
      where: threatId ? { threatId } : {},
      include: {
        threat: {
          select: { code: true, name: true, cluster: true },
        },
      },
      orderBy: [{ threatId: 'asc' }, { priority: 'asc' }],
    });

    return res.json({
      status: 'success',
      data: { recommendations },
    });
  } catch (error: any) {
    console.error('[Recommendations API Error]:', error.message);
    return res.status(500).json({ error: 'Ошибка при загрузке рекомендаций' });
  }
});

export default router;