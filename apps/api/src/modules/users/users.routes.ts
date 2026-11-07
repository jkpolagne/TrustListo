import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { userScope } from '../../lib/scope';
import { requireRole } from '../../middleware/auth';
import { notFoundError } from '../../middleware/errorHandler';

export const usersRouter = Router();

// Never select passwordHash.
export const publicUserFields = {
  id: true,
  role: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  isActive: true,
  managerId: true,
  brokerId: true,
  referralCode: true,
  createdAt: true,
  credentials: { select: { id: true, type: true, status: true, expiresAt: true } },
} as const;

// §5.2: CompanyAdmin full, Broker read, Sales Manager read own team, Sales Person none.
usersRouter.use(requireRole('COMPANY_ADMIN', 'BROKER', 'SALES_MANAGER'));

usersRouter.get('/', async (req, res) => {
  const users = await prisma.user.findMany({
    where: userScope(req.user!),
    select: publicUserFields,
    orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
  });
  res.json({ data: users });
});

usersRouter.get('/:id', async (req, res) => {
  const id = z.string().parse(req.params.id);
  const user = await prisma.user.findFirst({
    where: { AND: [{ id }, userScope(req.user!)] },
    select: publicUserFields,
  });
  if (!user) throw notFoundError();
  res.json(user);
});
