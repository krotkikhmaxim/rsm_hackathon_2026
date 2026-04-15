import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/enterprises — список предприятий
router.get('/', async (_req: Request, res: Response): Promise<any> => {
  try {
    const enterprises = await prisma.enterpriseProfile.findMany({
      orderBy: { enterprise_code: 'asc' },
    });

    return res.json({
      status: 'success',
      data: { enterprises },
    });
  } catch (error: any) {
    console.error('[Enterprises API Error]:', error.message);
    return res.status(500).json({ error: 'Ошибка при загрузке предприятий' });
  }
});

// GET /api/v1/enterprises/:code — детали предприятия + история прогнозов
router.get('/:code', async (req: Request, res: Response): Promise<any> => {
  try {
    const enterprise = await prisma.enterpriseProfile.findUnique({
      where: { enterprise_code: String(req.params.code) },
      include: {
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!enterprise) {
      return res.status(404).json({ error: `Предприятие не найдено` });
    }

    return res.json({ status: 'success', data: enterprise });
  } catch (error: any) {
    console.error('[Enterprise Detail Error]:', error.message);
    return res.status(500).json({ error: 'Ошибка' });
  }
});

export default router;
