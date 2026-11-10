/**
 * Mock documents for Module 1 (SPEC §8.8, §17): fictional people, a SPECIMEN watermark, and
 * layouts modelled on the real Philippine documents so OCR and extraction get realistic input.
 * NEVER put real IDs, titles or personal data in the repo.
 *
 * Rendered from SVG with sharp, so the seed, the tests and the evaluation set all use the
 * same generator. `scanify` turns a clean render into something closer to a phone photo.
 */
import sharp from 'sharp';

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

type Line = {
  text: string;
  size?: number;
  bold?: boolean;
  center?: boolean;
  /** Extra space above this line, in px. */
  gap?: number;
  x?: number;
};

const SERIF = "'Times New Roman', 'Liberation Serif', serif";
const SANS = "Arial, 'Liberation Sans', sans-serif";

function page(
  lines: Line[],
  opts: { width: number; height: number; font?: string; tint?: string; border?: boolean },
): string {
  const { width, height } = opts;
  let y = 70;
  const body = lines
    .map((l) => {
      const size = l.size ?? 24;
      y += (l.gap ?? 0) + size * 1.55;
      const x = l.center ? width / 2 : (l.x ?? 80);
      return `<text x="${x}" y="${y}" font-size="${size}" ${l.bold ? 'font-weight="bold"' : ''} ${
        l.center ? 'text-anchor="middle"' : ''
      }>${esc(l.text)}</text>`;
    })
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${opts.tint ?? '#fbfaf6'}"/>
  ${opts.border === false ? '' : `<rect x="24" y="24" width="${width - 48}" height="${height - 48}" fill="none" stroke="#6b6b6b" stroke-width="3" rx="6"/>`}
  <g font-family="${opts.font ?? SERIF}" fill="#1a1a1a">${body}</g>
  <text x="${width / 2}" y="${height - 40}" font-family="${SANS}" font-size="18" fill="#9a2a2a" text-anchor="middle">SPECIMEN - TrustListo demo data - not a real document</text>
  <text x="${width / 2}" y="${height / 2}" font-family="${SANS}" font-size="${Math.round(width / 9)}" font-weight="bold" fill="#c00" fill-opacity="0.07" text-anchor="middle" transform="rotate(-18 ${width / 2} ${height / 2})">SPECIMEN</text>
</svg>`;
}

const png = (svg: string) => sharp(Buffer.from(svg)).png().toBuffer();

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

const peso = (n: number) =>
  `P ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ───────────── Listing documents (individual seller) ─────────────

export type TitleInput = {
  titleNumber: string;
  owner: string;
  ownerDescription?: string;
  lotNumber: string;
  block?: string;
  areaSqm: number;
  barangay: string;
  entered: string; // ISO date
  /** Memorandum entries, e.g. { no: '4521', text: 'REAL ESTATE MORTGAGE in favor of …' }. */
  entries: { no: string; text: string }[];
};

export function landTitle(t: TitleInput) {
  const lines: Line[] = [
    { text: 'Republic of the Philippines', center: true, size: 22 },
    { text: 'LAND REGISTRATION AUTHORITY', center: true, size: 24, bold: true },
    { text: 'Registry of Deeds for the City of Naga', center: true, size: 22 },
    { text: 'TRANSFER CERTIFICATE OF TITLE', center: true, size: 38, bold: true, gap: 20 },
    { text: `TCT No. ${t.titleNumber}`, center: true, size: 28, bold: true },
    {
      text: 'IT IS HEREBY CERTIFIED that a certain land situated in',
      gap: 24,
    },
    { text: `Barangay ${t.barangay}, Naga City, Camarines Sur, bounded and described as follows:` },
    {
      text: `Lot No. ${t.lotNumber}${t.block ? `, Block ${t.block}` : ''}, containing an area of ${t.areaSqm.toLocaleString('en-US')} square meters, more or less,`,
      gap: 10,
    },
    { text: 'is registered in accordance with the Property Registration Decree in the name of' },
    {
      text: `Registered owner: ${t.owner}, ${t.ownerDescription ?? 'Filipino, of legal age'}`,
      bold: true,
      gap: 10,
    },
    { text: `Entered at Naga City, Philippines, on ${longDate(t.entered)}.`, gap: 10 },
    { text: 'MEMORANDUM OF ENCUMBRANCES', center: true, bold: true, size: 26, gap: 40 },
    ...(t.entries.length
      ? t.entries.map((e) => ({ text: `Entry No. ${e.no} - ${e.text}`, size: 22, gap: 8 }))
      : [{ text: 'No annotations.', size: 22, gap: 8 }]),
    { text: 'Register of Deeds', gap: 60, x: 900 },
  ];
  return png(page(lines, { width: 1400, height: 1500 }));
}

export type TaxDecInput = {
  tdNumber: string;
  owner: string;
  barangay: string;
  lotNumber: string;
  areaSqm: number;
  marketValue: number;
  assessedValue: number;
  effectivity: number;
  improvements?: string;
};

export function taxDeclaration(t: TaxDecInput) {
  const lines: Line[] = [
    { text: 'Republic of the Philippines', center: true, size: 22 },
    { text: 'Province of Camarines Sur - City of Naga', center: true, size: 22 },
    { text: 'OFFICE OF THE CITY ASSESSOR', center: true, size: 24, bold: true },
    { text: 'TAX DECLARATION OF REAL PROPERTY', center: true, size: 36, bold: true, gap: 20 },
    { text: `ARP No.: ${t.tdNumber}`, gap: 24, bold: true },
    { text: `Owner: ${t.owner}`, gap: 10 },
    { text: `Owner's Address: Barangay ${t.barangay}, Naga City` },
    { text: `Location of Property: Barangay ${t.barangay}, Naga City`, gap: 10 },
    { text: `Lot No.: ${t.lotNumber}` },
    { text: `Area: ${t.areaSqm.toLocaleString('en-US')} sq. m.` },
    { text: `Kind of Property: ${t.improvements ?? 'Land - Residential'}`, gap: 10 },
    { text: `Market Value: ${peso(t.marketValue)}` },
    { text: `Assessed Value: ${peso(t.assessedValue)}`, bold: true },
    { text: `Effectivity of Assessment: ${t.effectivity}`, gap: 10 },
    { text: 'City Assessor', gap: 60, x: 950 },
  ];
  return png(page(lines, { width: 1400, height: 1050 }));
}

export type RptInput = {
  orNumber: string;
  date: string; // ISO
  payor: string;
  tdNumber: string;
  period: string; // e.g. "1st-4th Qtr 2026"
  basic: number;
};

export function rptReceipt(r: RptInput) {
  const lines: Line[] = [
    { text: 'Republic of the Philippines', center: true, size: 20 },
    { text: 'CITY OF NAGA - OFFICE OF THE CITY TREASURER', center: true, size: 22, bold: true },
    { text: 'OFFICIAL RECEIPT', center: true, size: 34, bold: true, gap: 14 },
    { text: 'REAL PROPERTY TAX', center: true, size: 26, bold: true },
    { text: `O.R. No. ${r.orNumber}`, gap: 24, bold: true },
    { text: `Date: ${longDate(r.date)}` },
    { text: `Received from: ${r.payor}`, gap: 10 },
    { text: `TD/ARP No.: ${r.tdNumber}` },
    { text: `Period covered: ${r.period}` },
    { text: `Basic tax: ${peso(r.basic)}`, gap: 10 },
    { text: `SEF: ${peso(r.basic)}` },
    { text: `Total amount paid: ${peso(r.basic * 2)}`, bold: true, gap: 6 },
    { text: 'Collecting Officer', gap: 50, x: 780 },
  ];
  return png(page(lines, { width: 1150, height: 1000, font: SANS }));
}

export type IdInput = {
  kind: 'drivers' | 'philsys';
  last: string;
  given: string;
  middle: string;
  idNumber: string;
  birth: string; // ISO
  expiry?: string; // ISO, driver's license only
};

export function validId(i: IdInput) {
  const lines: Line[] =
    i.kind === 'drivers'
      ? [
          { text: 'REPUBLIC OF THE PHILIPPINES', size: 20, bold: true, x: 60 },
          { text: 'LAND TRANSPORTATION OFFICE', size: 20, x: 60 },
          { text: "DRIVER'S LICENSE", size: 32, bold: true, x: 60, gap: 6 },
          { text: 'Last Name, First Name, Middle Name', size: 18, x: 60, gap: 18 },
          { text: `${i.last}, ${i.given} ${i.middle}`, size: 28, bold: true, x: 60 },
          { text: `License No.: ${i.idNumber}`, size: 24, x: 60, gap: 14 },
          { text: `Date of Birth: ${i.birth.replace(/-/g, '/')}`, size: 24, x: 60 },
          { text: `Expiration Date: ${i.expiry ?? ''}`, size: 24, x: 60 },
        ]
      : [
          { text: 'REPUBLIKA NG PILIPINAS', size: 20, bold: true, x: 60 },
          { text: 'Philippine Identification Card', size: 26, bold: true, x: 60 },
          { text: `PCN: ${i.idNumber}`, size: 24, x: 60, gap: 14 },
          { text: 'Apelyido / Last Name:', size: 18, x: 60, gap: 10 },
          { text: i.last, size: 28, bold: true, x: 60 },
          { text: 'Mga Pangalan / Given Names:', size: 18, x: 60 },
          { text: i.given, size: 28, bold: true, x: 60 },
          { text: 'Gitnang Apelyido / Middle Name:', size: 18, x: 60 },
          { text: i.middle, size: 28, bold: true, x: 60 },
          { text: `Petsa ng Kapanganakan / Date of Birth: ${longDate(i.birth)}`, size: 20, x: 60 },
        ];
  return png(page(lines, { width: 1100, height: 720, font: SANS, tint: '#f1f4f7' }));
}

// ───────────── Developer listing ─────────────

export type LtsInput = {
  ltsNumber: string;
  project: string;
  developer: string;
  location: string;
  issued: string; // ISO
  validUntil: string; // ISO
};

function ltsLines(l: LtsInput): Line[] {
  return [
    { text: 'Republic of the Philippines', center: true, size: 22 },
    {
      text: 'DEPARTMENT OF HUMAN SETTLEMENTS AND URBAN DEVELOPMENT',
      center: true,
      size: 24,
      bold: true,
    },
    { text: 'Bicol Regional Office', center: true, size: 22 },
    { text: 'LICENSE TO SELL', center: true, size: 40, bold: true, gap: 24 },
    { text: `License to Sell No.: ${l.ltsNumber}`, gap: 24, bold: true },
    { text: `Name of Project: ${l.project}`, gap: 10 },
    { text: `Developer: ${l.developer}` },
    { text: `Location: ${l.location}` },
    {
      text: 'Having complied with the requirements of P.D. 957, as amended, the developer is',
      gap: 20,
    },
    { text: 'hereby licensed to sell lots/units in the above project, subject to the conditions' },
    { text: 'stated at the back hereof.' },
    { text: `Date Issued: ${longDate(l.issued)}`, gap: 20 },
    { text: `Valid until: ${longDate(l.validUntil)}`, bold: true },
    { text: 'Regional Director', gap: 60, x: 950 },
  ];
}

export function licenseToSell(l: LtsInput) {
  return png(page(ltsLines(l), { width: 1400, height: 1150 }));
}

/** The same License to Sell as a one-page PDF (exercises the rasterize step). */
export function licenseToSellPdf(l: LtsInput): Buffer {
  return textPdf(
    ltsLines(l).map((x) => ({
      text: x.text,
      size: Math.round((x.size ?? 24) / 2.2),
      bold: x.bold,
      gap: (x.gap ?? 0) / 2.2,
    })),
  );
}

// ───────────── Consultant credentials ─────────────

export type PrcInput = {
  last: string;
  first: string;
  middle: string;
  registrationNumber: string;
  registered: string; // ISO
  validUntil: string; // ISO
  profession?: string;
};

export function prcId(p: PrcInput) {
  const lines: Line[] = [
    { text: 'REPUBLIC OF THE PHILIPPINES', size: 20, bold: true, x: 60 },
    { text: 'PROFESSIONAL REGULATION COMMISSION', size: 26, bold: true, x: 60 },
    { text: 'Professional Identification Card', size: 20, x: 60 },
    { text: 'Last Name:', size: 18, x: 60, gap: 18 },
    { text: p.last, size: 28, bold: true, x: 60 },
    { text: 'First Name:', size: 18, x: 60 },
    { text: p.first, size: 28, bold: true, x: 60 },
    { text: 'Middle Name:', size: 18, x: 60 },
    { text: p.middle, size: 28, bold: true, x: 60 },
    { text: `Registration No.: ${p.registrationNumber}`, size: 24, x: 60, gap: 10 },
    { text: `Registration Date: ${p.registered.replace(/-/g, '/')}`, size: 22, x: 60 },
    { text: `Valid Until: ${p.validUntil.replace(/-/g, '/')}`, size: 24, bold: true, x: 60 },
    { text: `Profession: ${p.profession ?? 'REAL ESTATE BROKER'}`, size: 22, x: 60 },
  ];
  return png(page(lines, { width: 1100, height: 900, font: SANS, tint: '#f3f6f2' }));
}

export type DhsudInput = {
  name: string;
  registrationNumber: string;
  issued: string; // ISO
  validUntil: string; // ISO
};

export function dhsudCert(d: DhsudInput) {
  const lines: Line[] = [
    { text: 'Republic of the Philippines', center: true, size: 22 },
    {
      text: 'DEPARTMENT OF HUMAN SETTLEMENTS AND URBAN DEVELOPMENT',
      center: true,
      size: 24,
      bold: true,
    },
    { text: 'CERTIFICATE OF REGISTRATION', center: true, size: 38, bold: true, gap: 24 },
    { text: `Certificate of Registration No.: ${d.registrationNumber}`, gap: 24, bold: true },
    { text: 'This is to certify that', gap: 20 },
    { text: d.name.toUpperCase(), size: 34, bold: true, center: true, gap: 10 },
    { text: 'has been registered as a REAL ESTATE SALESPERSON under R.A. 9646', gap: 14 },
    { text: 'and its implementing rules and regulations.' },
    { text: `Issued on: ${longDate(d.issued)}`, gap: 20 },
    { text: `Valid until: ${longDate(d.validUntil)}`, bold: true },
    { text: 'Regional Director', gap: 50, x: 950 },
  ];
  return png(page(lines, { width: 1400, height: 1000 }));
}

// ───────────── Helpers ─────────────

/**
 * Makes a clean render look like a quick phone photo of a paper document: slightly
 * rotated, soft focus, uneven exposure and JPEG compression.
 */
export async function scanify(image: Buffer, seed = 1): Promise<Buffer> {
  const angle = ((seed * 37) % 5) * 0.4 - 0.8; // -0.8° … +0.8°
  const meta = await sharp(image).metadata();
  const w = meta.width!;
  const h = meta.height!;
  // Deterministic speckle noise so the evaluation is repeatable.
  const noise = Buffer.alloc(w * h);
  let s = seed * 9973;
  for (let i = 0; i < noise.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    noise[i] = s % 100 < 3 ? 120 : 255;
  }
  const speckle = await sharp(noise, { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toBuffer();
  return sharp(image)
    .composite([{ input: speckle, blend: 'multiply' }])
    .rotate(angle, { background: '#d9d6cf' })
    .blur(0.7)
    .modulate({ brightness: 0.93 })
    .jpeg({ quality: 55 })
    .toBuffer();
}

/** Minimal valid PDF with one page of Helvetica text lines. */
export function textPdf(
  lines: { text: string; size: number; bold?: boolean; gap?: number }[],
): Buffer {
  const pdfEsc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  let y = 800;
  const ops = lines
    .map((l) => {
      y -= l.size * 1.6 + (l.gap ?? 0);
      return `BT /${l.bold ? 'F2' : 'F1'} ${l.size} Tf 50 ${y.toFixed(1)} Td (${pdfEsc(l.text)}) Tj ET`;
    })
    .join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(ops)} >>\nstream\n${ops}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

// ───────────── Buyer payments ─────────────

export type PaymentReceiptInput = {
  orNumber: string;
  date: string; // ISO
  payor: string;
  amount: number;
  issuer: string; // developer or firm
  purpose: string; // e.g. "Reservation fee, Camella Naga Ella Model"
};

/** A developer's acknowledgement receipt for a buyer payment (prefills the payment form). */
export function paymentReceipt(r: PaymentReceiptInput) {
  const lines: Line[] = [
    { text: r.issuer.toUpperCase(), center: true, size: 26, bold: true },
    { text: 'Naga City, Camarines Sur', center: true, size: 20 },
    { text: 'ACKNOWLEDGEMENT RECEIPT', center: true, size: 34, bold: true, gap: 16 },
    { text: `A.R. No. ${r.orNumber}`, gap: 24, bold: true },
    { text: `Date: ${longDate(r.date)}` },
    { text: `Received from: ${r.payor}`, gap: 10 },
    { text: `For: ${r.purpose}` },
    { text: `Amount paid: ${peso(r.amount)}`, bold: true, gap: 10, size: 28 },
    { text: 'Received by: Cashier', gap: 50, x: 780 },
  ];
  return png(page(lines, { width: 1150, height: 820, font: SANS }));
}

// ───────────── Developer commission transmittals ─────────────

export type TransmittalInput = {
  developer: string;
  firm: string;
  date: string; // ISO
  buyer: string;
  unit: string;
  tranche: string;
  amount: number;
};

/** A developer's commission transmittal to the firm (SPEC §8.3, §10.4). */
export function transmittal(t: TransmittalInput) {
  const lines: Line[] = [
    { text: t.developer.toUpperCase(), center: true, size: 26, bold: true },
    { text: 'COMMISSION TRANSMITTAL', center: true, size: 34, bold: true, gap: 14 },
    { text: `To: ${t.firm}`, gap: 24 },
    { text: `Date: ${longDate(t.date)}` },
    { text: `Buyer: ${t.buyer}`, gap: 10 },
    { text: `Unit: ${t.unit}` },
    { text: `Release: ${t.tranche}` },
    { text: `Commission amount: ${peso(t.amount)}`, bold: true, gap: 10, size: 28 },
    { text: 'Accounts Payable', gap: 50, x: 900 },
  ];
  return png(page(lines, { width: 1300, height: 900 }));
}
