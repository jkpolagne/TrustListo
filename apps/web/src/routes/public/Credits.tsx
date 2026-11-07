import { PublicLayout } from '../../components/public/PublicLayout';

// Mirrors apps/api/prisma/seed-photos/CREDITS.md. Attribution is required by the licenses.
const photos = [
  [
    'Alecza Unit',
    'https://commons.wikimedia.org/wiki/File:Alecza_Unit.jpg',
    'BRIA Home Inc.',
    'CC BY-SA 4.0',
    'https://creativecommons.org/licenses/by-sa/4.0',
  ],
  [
    'Bettina Unit',
    'https://commons.wikimedia.org/wiki/File:Bettina_Unit.jpg',
    'BRIA Home Inc.',
    'CC BY-SA 4.0',
    'https://creativecommons.org/licenses/by-sa/4.0',
  ],
  [
    'JC Jimenez U12',
    'https://commons.wikimedia.org/wiki/File:JC_Jimenez_U12.JPG',
    'JJ Carpio',
    'CC BY-SA 4.0',
    'https://creativecommons.org/licenses/by-sa/4.0',
  ],
  [
    '2 Storey House, Cabanatuan',
    'https://commons.wikimedia.org/wiki/File:2_Storey_House_-_Cabanatuan.jpg',
    'Captainmorlypogi1959',
    'CC BY-SA 4.0',
    'https://creativecommons.org/licenses/by-sa/4.0',
  ],
  [
    'Oakwood Row Houses',
    'https://commons.wikimedia.org/wiki/File:Oakwood_Row_Houses.JPG',
    'T3n60',
    'CC BY-SA 3.0',
    'https://creativecommons.org/licenses/by-sa/3.0',
  ],
  [
    'Cebu Business Park Condominium',
    'https://commons.wikimedia.org/wiki/File:Cebu_Business_Park_Condominium_(09-09-2022).jpg',
    'PaulGorduiz106',
    'CC BY-SA 4.0',
    'https://creativecommons.org/licenses/by-sa/4.0',
  ],
  [
    'Eusebio BLISS IV',
    'https://commons.wikimedia.org/wiki/File:Eusebio_BLISS_IV.jpg',
    'Lawrence Ruiz',
    'CC BY-SA 4.0',
    'https://creativecommons.org/licenses/by-sa/4.0',
  ],
  [
    'Zone en lotissement à Azaguié-Blida',
    "https://commons.wikimedia.org/wiki/File:Visite_d'une_zone_en_lotissement_%C3%A0_Azagui%C3%A9-Blida_10.jpg",
    'Kod B',
    'CC BY-SA 4.0',
    'https://creativecommons.org/licenses/by-sa/4.0',
  ],
] as const;

export function Credits() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Photo credits</h1>
        <p className="mt-3 leading-relaxed text-graphite">
          The demo listings use openly licensed photos from Wikimedia Commons. They are illustrative
          only and don't show the actual units listed. Each was resized and converted to WebP; the
          modified versions are shared under the same license.
        </p>
        <ul className="mt-8 divide-y divide-line rounded-2xl border border-line">
          {photos.map(([title, url, author, license, licenseUrl]) => (
            <li
              key={url}
              className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3.5 text-sm"
            >
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold hover:underline"
              >
                {title}
              </a>
              <span className="text-muted">
                {author},{' '}
                <a
                  href={licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  {license}
                </a>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </PublicLayout>
  );
}
