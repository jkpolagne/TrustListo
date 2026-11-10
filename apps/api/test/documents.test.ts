// M4: document pipeline → broker review → badges (SPEC §8, §15 M4 acceptance).
// Uses real OCR (Tesseract) on the mock documents, so these tests take ~30 s.
import { afterAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { closeOcr } from '../src/modules/docai/ocr';
import { processDocument } from '../src/modules/docai/pipeline';
import { whenIdle } from '../src/modules/docai/queue';
import type { DocFlag, Extracted } from '../src/modules/docai/types';
import * as mock from '../prisma/seed-docs/mockDocs';
import { signIn } from './helpers';

vi.setConfig({ testTimeout: 60_000 }); // OCR of several documents per test

afterAll(async () => {
  await closeOcr();
  await prisma.$disconnect();
});

const DAY = 86_400_000;
const isoIn = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
const codes = (flags: unknown) => (flags as DocFlag[]).map((f) => f.code).sort();

/** A fresh project with one unit in Bicol Prime, so other tests' data isn't disturbed. */
async function freshProject(name: string) {
  const firm = await prisma.firm.findFirstOrThrow({ where: { name: { contains: 'Bicol' } } });
  const developer = await prisma.developer.create({
    data: { firmId: firm.id, name: `${name} Land Corp.` },
  });
  const project = await prisma.project.create({
    data: { firmId: firm.id, developerId: developer.id, name, locationText: 'Naga City' },
  });
  const unit = await prisma.property.create({
    data: {
      firmId: firm.id,
      source: 'DEVELOPER',
      projectId: project.id,
      title: `${name} unit`,
      slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Date.now()}`,
      type: 'LOT',
      price: 1_000_000,
    },
  });
  return { project, unit, developer };
}

async function uploadLts(projectId: string, file: Buffer, filename = 'lts.png') {
  const admin = await signIn('admin@bicolprime.test');
  const res = await admin.agent
    .post(`/api/v1/catalog/projects/${projectId}/lts`)
    .set(admin.csrfHeader)
    .attach('file', file, filename);
  return { admin, res };
}

describe('License to Sell: upload → AI → broker approves → units verified', () => {
  it('reads the license, and approval grants LTS_VERIFIED to the units', async () => {
    const { project, unit } = await freshProject('Mabini Heights');
    const png = await mock.licenseToSell({
      ltsNumber: 'LTS-R5-2026-0777',
      project: 'Mabini Heights',
      developer: 'Mabini Heights Land Corp.',
      location: 'Naga City',
      issued: isoIn(-30),
      validUntil: isoIn(900),
    });
    const { admin, res } = await uploadLts(project.id, png);
    expect(res.status).toBe(201);
    expect(res.body.reviewStatus).toBe('PENDING_AI');

    // A second upload while one waits is refused.
    const again = await uploadLts(project.id, png);
    expect(again.res.status).toBe(409);

    await whenIdle();
    const status = await admin.agent.get(`/api/v1/documents/${res.body.id}`);
    expect(status.status).toBe(200);
    expect(status.body.aiStatus).toBe('DONE');
    expect(status.body.detectedType).toBe('LICENSE_TO_SELL');
    expect(status.body.reviewStatus).toBe('READY_FOR_REVIEW');
    const fields = status.body.extracted as Extracted;
    expect(fields.ltsNumber?.value).toBe('LTS-R5-2026-0777');
    expect(fields.expiryDate?.value).toBe(isoIn(900));

    // Only the broker decides (rule 1).
    expect(
      (
        await admin.agent
          .post(`/api/v1/reviews/documents/${res.body.id}/approve`)
          .set(admin.csrfHeader)
          .send({})
      ).status,
    ).toBe(403);

    const broker = await signIn('broker@bicolprime.test');
    const queue = await broker.agent.get('/api/v1/reviews/queue');
    expect(queue.body.documents.map((d: { id: string }) => d.id)).toContain(res.body.id);

    const detail = await broker.agent.get(`/api/v1/reviews/documents/${res.body.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.ocrText).toContain('LICENSE TO SELL');
    expect(detail.body.owner.title).toBe('Mabini Heights');

    // The broker corrects the number; the correction is kept next to the AI's reading.
    const approve = await broker.agent
      .post(`/api/v1/reviews/documents/${res.body.id}/approve`)
      .set(broker.csrfHeader)
      .send({ fields: { ltsNumber: 'LTS-R5-2026-0778' } });
    expect(approve.status).toBe(200);
    expect(approve.body.badges).toEqual(['LTS_VERIFIED']);

    const after = await prisma.project.findUniqueOrThrow({ where: { id: project.id } });
    expect(after.ltsStatus).toBe('APPROVED');
    expect(after.ltsNumber).toBe('LTS-R5-2026-0778');
    expect(after.ltsDocumentId).toBe(res.body.id);
    expect(after.ltsExpiresAt?.toISOString().slice(0, 10)).toBe(isoIn(900));
    const badge = await prisma.propertyBadge.findUnique({
      where: { propertyId_type: { propertyId: unit.id, type: 'LTS_VERIFIED' } },
    });
    expect(badge?.validUntil?.toISOString().slice(0, 10)).toBe(isoIn(900));

    const doc = await prisma.document.findUniqueOrThrow({ where: { id: res.body.id } });
    const ex = doc.extracted as Extracted;
    expect(ex.ltsNumber).toMatchObject({
      value: 'LTS-R5-2026-0778',
      edited: true,
      aiValue: 'LTS-R5-2026-0777',
    });
    const log = await prisma.auditLog.findFirst({
      where: { entityType: 'Document', entityId: doc.id, action: 'DOCUMENT_APPROVED' },
    });
    expect(JSON.stringify(log?.after)).toContain('LTS-R5-2026-0778');
  });

  it('flags an expired license, which cannot be approved, only rejected', async () => {
    const { project } = await freshProject('Old Town Estates');
    const pdf = mock.licenseToSellPdf({
      ltsNumber: 'LTS-R5-2019-0001',
      project: 'Old Town Estates',
      developer: 'Old Town Estates Land Corp.',
      location: 'Naga City',
      issued: isoIn(-2000),
      validUntil: isoIn(-40),
    });
    const { res } = await uploadLts(project.id, pdf, 'lts.pdf');
    expect(res.status).toBe(201);
    await whenIdle();

    const doc = await prisma.document.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(doc.reviewStatus).toBe('NEEDS_ATTENTION');
    expect(codes(doc.flags)).toContain('LTS_EXPIRED');
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).ltsStatus).toBe(
      'NEEDS_ATTENTION',
    );

    const broker = await signIn('broker@bicolprime.test');
    const noNote = await broker.agent
      .post(`/api/v1/reviews/documents/${doc.id}/approve`)
      .set(broker.csrfHeader)
      .send({});
    expect(noNote.body.error.code).toBe('OVERRIDE_NOTE_REQUIRED');
    const withNote = await broker.agent
      .post(`/api/v1/reviews/documents/${doc.id}/approve`)
      .set(broker.csrfHeader)
      .send({ overrideNote: 'Renewal is in process' });
    expect(withNote.body.error.code).toBe('EXPIRED');

    const reject = await broker.agent
      .post(`/api/v1/reviews/documents/${doc.id}/reject`)
      .set(broker.csrfHeader)
      .send({ reason: 'Expired. Upload the renewed license.' });
    expect(reject.status).toBe(200);
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).ltsStatus).toBe(
      'REJECTED',
    );
  });
});

async function listingDocs(sellerName: string) {
  const req = await prisma.sellerListingRequest.findFirstOrThrow({ where: { sellerName } });
  const docs = await prisma.document.findMany({
    where: { ownerType: 'SELLER_REQUEST', ownerId: req.id },
    orderBy: { createdAt: 'asc' },
  });
  // The seed leaves them for the API to read at start-up; read them here instead.
  for (const d of docs) await processDocument(d.id);
  const read = await prisma.document.findMany({
    where: { ownerType: 'SELLER_REQUEST', ownerId: req.id },
  });
  const byType = Object.fromEntries(read.map((d) => [d.declaredType!, d]));
  const property = await prisma.property.findUniqueOrThrow({ where: { sellerRequestId: req.id } });
  return { req, byType, property };
}

describe('Seller listing documents (title, tax declaration, RPT receipt, ID)', () => {
  it('a clean set is ready for review, and approval earns the listing badges', async () => {
    const { byType, property } = await listingDocs('Maria Lourdes Santos');
    for (const t of ['LAND_TITLE', 'TAX_DECLARATION', 'RPT_RECEIPT', 'SELLER_ID']) {
      expect(byType[t]?.reviewStatus, `${t}: ${JSON.stringify(byType[t]?.flags)}`).toBe(
        'READY_FOR_REVIEW',
      );
    }
    const title = byType.LAND_TITLE!.extracted as Extracted;
    expect(title.titleNumber?.value).toBe('T-2018-04417');
    expect(title.areaSqm?.value).toBe('240');
    expect(title.encumbrances?.value).toBe('None found');

    // Firm isolation: another firm's broker can't see these documents.
    const other = await signIn('broker@bicolprime.test');
    expect(
      (await other.agent.get(`/api/v1/reviews/documents/${byType.LAND_TITLE!.id}`)).status,
    ).toBe(404);
    expect((await other.agent.get(`/api/v1/documents/${byType.LAND_TITLE!.id}/url`)).status).toBe(
      404,
    );

    const broker = await signIn('broker1@advench.test');
    for (const t of ['LAND_TITLE', 'TAX_DECLARATION', 'RPT_RECEIPT', 'SELLER_ID']) {
      const res = await broker.agent
        .post(`/api/v1/reviews/documents/${byType[t]!.id}/approve`)
        .set(broker.csrfHeader)
        .send({});
      expect(res.status, t).toBe(200);
    }
    const badges = await prisma.propertyBadge.findMany({ where: { propertyId: property.id } });
    expect(badges.map((b) => b.type).sort()).toEqual([
      'OWNERSHIP_VERIFIED',
      'TAX_CURRENT',
      'TITLE_CLEAN',
    ]);
    expect(badges.find((b) => b.type === 'TAX_CURRENT')?.validUntil?.getMonth()).toBe(11); // Dec 31

    // A decided document can't be decided again.
    const twice = await broker.agent
      .post(`/api/v1/reviews/documents/${byType.LAND_TITLE!.id}/reject`)
      .set(broker.csrfHeader)
      .send({ reason: 'changed my mind' });
    expect(twice.status).toBe(409);
  });

  it('flags the problem listing and withholds badges a broker override cannot earn', async () => {
    const { byType, property } = await listingDocs('Roberto Villanueva');
    expect(codes(byType.LAND_TITLE!.flags)).toEqual(['ENCUMBRANCE_FOUND', 'OWNER_MISMATCH']);
    expect(codes(byType.TAX_DECLARATION!.flags)).toEqual(['AREA_MISMATCH']);
    expect(codes(byType.RPT_RECEIPT!.flags)).toEqual(['TAX_DELINQUENT']);
    expect(codes(byType.SELLER_ID!.flags)).toEqual(['OWNER_MISMATCH']);
    for (const d of Object.values(byType)) expect(d.reviewStatus).toBe('NEEDS_ATTENTION');

    const broker = await signIn('broker@bicolprime.test');
    const title = byType.LAND_TITLE!.id;
    const noNote = await broker.agent
      .post(`/api/v1/reviews/documents/${title}/approve`)
      .set(broker.csrfHeader)
      .send({});
    expect(noNote.status).toBe(400);
    expect(noNote.body.error.code).toBe('OVERRIDE_NOTE_REQUIRED');
    for (const t of ['LAND_TITLE', 'SELLER_ID', 'RPT_RECEIPT']) {
      const res = await broker.agent
        .post(`/api/v1/reviews/documents/${byType[t]!.id}/approve`)
        .set(broker.csrfHeader)
        .send({ overrideNote: 'Seller is the heir; extrajudicial settlement on file.' });
      expect(res.status, t).toBe(200);
    }
    // Approved, but the facts don't support the badges: owner differs, mortgage open, tax unpaid.
    expect(await prisma.propertyBadge.count({ where: { propertyId: property.id } })).toBe(0);
    const log = await prisma.auditLog.findFirst({
      where: { entityId: title, action: 'DOCUMENT_APPROVED' },
    });
    expect(JSON.stringify(log?.after)).toContain('extrajudicial');
  });
});
