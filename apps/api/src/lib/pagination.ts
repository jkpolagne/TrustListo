import { z } from 'zod';

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function paging(q: unknown) {
  const { page, pageSize } = pageQuery.parse(q);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
