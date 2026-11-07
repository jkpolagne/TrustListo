import { PrismaClient } from '@prisma/client';
import '../env'; // make sure DATABASE_URL is loaded

export const prisma = new PrismaClient();
