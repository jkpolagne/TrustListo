import { randomInt } from 'node:crypto';
import argon2 from 'argon2';
import { Router } from 'express';
import { z } from 'zod';
import { audit } from '../../lib/audit';
import { prisma } from '../../lib/prisma';
import { firmScope, userScope } from '../../lib/scope';
import { objectKey, putObject } from '../../lib/storage';
import { requireDocumentFile, singleFile } from '../../lib/upload';
import { requireRole } from '../../middleware/auth';
import { HttpError, notFoundError } from '../../middleware/errorHandler';
import { queueDocument } from '../docai/pipeline';

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
  credentials: {
    select: {
      id: true,
      type: true,
      status: true,
      expiresAt: true,
      numberEntered: true,
      rejectReason: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  },
} as const;

// §5.2: CompanyAdmin full, Broker read, Sales Manager read own team, Sales Person none.
usersRouter.use(requireRole('COMPANY_ADMIN', 'BROKER', 'SALES_MANAGER'));
const adminOnly = requireRole('COMPANY_ADMIN');

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

// ───────────── Create / edit consultants (CompanyAdmin) ─────────────

const CONSULTANT_ROLES = ['BROKER', 'SALES_MANAGER', 'SALES_PERSON'] as const;
type ConsultantRole = (typeof CONSULTANT_ROLES)[number];

/**
 * Hierarchy rule (SPEC §5.1): a salesperson must have an active sales manager, and a sales
 * manager must have an active broker, both in the same firm.
 */
async function checkHierarchy(
  firmId: string,
  role: ConsultantRole,
  managerId: string | null | undefined,
  brokerId: string | null | undefined,
): Promise<{ managerId: string | null; brokerId: string | null }> {
  if (role === 'SALES_PERSON') {
    const ok =
      managerId &&
      (await prisma.user.findFirst({
        where: { id: managerId, firmId, role: 'SALES_MANAGER', isActive: true },
      }));
    if (!ok)
      throw new HttpError(400, 'MANAGER_REQUIRED', 'Choose an active sales manager in your firm.');
    return { managerId, brokerId: null };
  }
  if (role === 'SALES_MANAGER') {
    const ok =
      brokerId &&
      (await prisma.user.findFirst({
        where: { id: brokerId, firmId, role: 'BROKER', isActive: true },
      }));
    if (!ok) throw new HttpError(400, 'BROKER_REQUIRED', 'Choose an active broker in your firm.');
    return { managerId: null, brokerId };
  }
  return { managerId: null, brokerId: null };
}

/** e.g. "Joy Ocampo" → JOCAMPO, then JOCAMPO2… if taken. */
async function uniqueReferralCode(firstName: string, lastName: string): Promise<string> {
  const base = `${firstName[0] ?? ''}${lastName}`
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
  for (let n = 1; ; n++) {
    const code = n === 1 ? base : `${base}${n}`;
    if (!(await prisma.user.findUnique({ where: { referralCode: code } }))) return code;
  }
}

/** Readable one-time password; the consultant changes it after first sign-in. */
function temporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  for (;;) {
    const pw = Array.from({ length: 12 }, () => alphabet[randomInt(alphabet.length)]).join('');
    if (/[A-Za-z]/.test(pw) && /[0-9]/.test(pw)) return pw;
  }
}

const name = z.string().trim().min(1).max(80);
const createBody = z.object({
  role: z.enum(CONSULTANT_ROLES),
  firstName: name,
  lastName: name,
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(30).optional(),
  managerId: z.string().optional(),
  brokerId: z.string().optional(),
});

usersRouter.post('/', adminOnly, async (req, res) => {
  const body = createBody.parse(req.body);
  const { firmId } = firmScope(req.user!);
  const links = await checkHierarchy(firmId, body.role, body.managerId, body.brokerId);

  if (await prisma.user.findUnique({ where: { email: body.email } })) {
    throw new HttpError(409, 'EMAIL_TAKEN', 'Someone already uses this email.');
  }

  const password = temporaryPassword();
  const user = await prisma.user.create({
    data: {
      firmId,
      role: body.role,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      ...links,
      referralCode: await uniqueReferralCode(body.firstName, body.lastName),
      passwordHash: await argon2.hash(password),
    },
    select: publicUserFields,
  });
  await audit(req, {
    action: 'USER_CREATED',
    entityType: 'User',
    entityId: user.id,
    after: { role: user.role, managerId: user.managerId, brokerId: user.brokerId },
  });
  // Shown once to the admin to hand over. Never stored in plain text or logged.
  res.status(201).json({ user, temporaryPassword: password });
});

const patchBody = z
  .object({
    firstName: name,
    lastName: name,
    phone: z.string().trim().max(30).nullable(),
    isActive: z.boolean(),
    managerId: z.string().nullable(),
    brokerId: z.string().nullable(),
  })
  .partial();

usersRouter.patch('/:id', adminOnly, async (req, res) => {
  const body = patchBody.parse(req.body);
  const { firmId } = firmScope(req.user!);
  const target = await prisma.user.findFirst({ where: { id: String(req.params.id), firmId } });
  if (!target) throw notFoundError();
  if (!CONSULTANT_ROLES.includes(target.role as ConsultantRole)) {
    throw new HttpError(403, 'FORBIDDEN', 'Company admins are managed by TrustListo support.');
  }
  const role = target.role as ConsultantRole;

  if (body.isActive === false) {
    const activeReports = await prisma.user.count({
      where: { isActive: true, OR: [{ managerId: target.id }, { brokerId: target.id }] },
    });
    if (activeReports > 0) {
      throw new HttpError(
        409,
        'HAS_ACTIVE_TEAM',
        `${activeReports} active team member${activeReports === 1 ? ' reports' : 's report'} to this person. Reassign them first.`,
      );
    }
  }

  // Re-check the reporting line whenever it changes or someone comes back. Always validated,
  // so a managerId from another firm can never be written.
  const hierarchyTouched = 'managerId' in body || 'brokerId' in body || body.isActive === true;
  const links = hierarchyTouched
    ? await checkHierarchy(
        firmId,
        role,
        'managerId' in body ? body.managerId : target.managerId,
        'brokerId' in body ? body.brokerId : target.brokerId,
      )
    : {};

  const data = { ...body, ...links };
  const before = Object.fromEntries(
    Object.keys(data).map((k) => [k, target[k as keyof typeof target] as unknown]),
  );
  const updated = await prisma.user.update({
    where: { id: target.id },
    data,
    select: publicUserFields,
  });
  const after = Object.fromEntries(
    Object.keys(data).map((k) => [k, updated[k as keyof typeof updated] as unknown]),
  );

  const action =
    body.isActive === false && target.isActive
      ? 'USER_DEACTIVATED'
      : body.isActive === true && !target.isActive
        ? 'USER_REACTIVATED'
        : 'USER_UPDATED';
  await audit(req, {
    action,
    entityType: 'User',
    entityId: target.id,
    before: JSON.parse(JSON.stringify(before)),
    after: JSON.parse(JSON.stringify(after)),
  });
  res.json(updated);
});

// ───────────── Credential upload (CompanyAdmin) ─────────────

const credentialBody = z.object({
  type: z.enum(['PRC_LICENSE', 'DHSUD_REGISTRATION']),
  numberEntered: z.string().trim().min(3, 'Enter the license or registration number.').max(40),
});

usersRouter.post('/:id/credentials', adminOnly, singleFile('file'), async (req, res) => {
  const body = credentialBody.parse(req.body);
  const file = requireDocumentFile(req.file);
  const { firmId } = firmScope(req.user!);
  const target = await prisma.user.findFirst({
    where: { id: String(req.params.id), firmId, role: { in: [...CONSULTANT_ROLES] } },
  });
  if (!target) throw notFoundError();

  const storageKey = objectKey(firmId, 'credentials', target.id, file.mime);
  await putObject(storageKey, file.buffer, file.mime);

  const credential = await prisma.$transaction(async (tx) => {
    const cred = await tx.credential.create({
      data: { firmId, userId: target.id, type: body.type, numberEntered: body.numberEntered },
    });
    const doc = await tx.document.create({
      data: {
        firmId,
        ownerType: 'CREDENTIAL',
        ownerId: cred.id,
        declaredType: body.type === 'PRC_LICENSE' ? 'PRC_ID' : 'DHSUD_CERT',
        storageKey,
        mimeType: file.mime,
        sizeBytes: file.size,
        sha256: file.sha256,
        uploadedById: req.user!.id,
      },
    });
    await audit(
      req,
      {
        action: 'CREDENTIAL_UPLOADED',
        entityType: 'Credential',
        entityId: cred.id,
        after: { userId: target.id, type: body.type, documentId: doc.id },
      },
      tx,
    );
    return tx.credential.update({ where: { id: cred.id }, data: { documentId: doc.id } });
  });

  queueDocument(credential.documentId!);
  res.status(201).json(credential);
});

/**
 * New referral code (SPEC §10.7), e.g. after a link was shared somewhere it shouldn't be.
 * Initials plus 4 random characters; old links stop routing to this consultant.
 */
usersRouter.post('/:id/referral-code', adminOnly, async (req, res) => {
  const { firmId } = firmScope(req.user!);
  const target = await prisma.user.findFirst({
    where: { id: String(req.params.id), firmId, role: { in: ['SALES_MANAGER', 'SALES_PERSON'] } },
  });
  if (!target) throw notFoundError();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alikes (0/O, 1/I)
  let code = '';
  do {
    code = `${target.firstName[0] ?? 'X'}${target.lastName[0] ?? 'X'}`.toUpperCase();
    for (let i = 0; i < 4; i++) code += alphabet[randomInt(alphabet.length)];
  } while (await prisma.user.findUnique({ where: { referralCode: code } }));
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { referralCode: code } });
    await audit(
      req,
      {
        action: 'REFERRAL_CODE_REGENERATED',
        entityType: 'User',
        entityId: target.id,
        before: { referralCode: target.referralCode },
        after: { referralCode: code },
      },
      tx,
    );
  });
  res.json({ referralCode: code });
});
