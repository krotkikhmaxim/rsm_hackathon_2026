import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const search = String(req.query.search || '');

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
            { code: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [threats, total] = await Promise.all([
      prisma.threat.findMany({
        where,
        include: { recommendations: { orderBy: { priority: 'asc' } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      prisma.threat.count({ where }),
    ]);

    return res.json({
      status: 'success',
      data: {
        items: threats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('[Threats API Error]:', error.message);
    return res.status(500).json({ error: 'Ошибка при загрузке угроз' });
  }
});

router.get('/:code', async (req: Request, res: Response): Promise<any> => {
  try {
    const threat = await prisma.threat.findUnique({
      where: { code: String(req.params.code) },
      include: { recommendations: { orderBy: { priority: 'asc' } } },
    });

    if (!threat) {
      return res.status(404).json({ error: 'Угроза не найдена' });
    }

    return res.json({ status: 'success', data: threat });
  } catch (error: any) {
    console.error('[Threat Detail Error]:', error.message);
    return res.status(500).json({ error: 'Ошибка' });
  }
});

export default router;