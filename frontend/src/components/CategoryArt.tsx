import type { ReactNode } from 'react';

/**
 * Line-art illustrations in the brand's gold, used for a category that has no photo yet
 * (and no product with a photo). They are chosen from the category's slug/name, so even a
 * brand-new store looks finished. Uploading a photo (or adding products with photos) replaces them.
 */
type Kind = 'pot' | 'table' | 'tools' | 'tea' | 'clean' | 'decor' | 'default';

// Order matters: «أدوات المطبخ» contains «طبخ», so the specific groups are tested before the cookware group.
const RULES: [RegExp, Kind][] = [
  [/tea|coffee|شاي|قهوة|موكا|إبريق|ابريق/i, 'tea'],
  [/clean|تنظيف|عناية|منظف/i, 'clean'],
  [/decor|ديكور|زينة|مزهرية/i, 'decor'],
  [/tools|knives|baking|storage|أدوات|سكاكين|حلويات|خبز|حفظ|تخزين/i, 'tools'],
  [/tableware|plates|glass|cups|serving|مائدة|صحون|كؤوس|أكواب|تقديم|أطباق/i, 'table'],
  [/cookware|pots|pans|pressure|couscous|طبخ|طناجر|قدور|مقالي|كسكاس|ضغط/i, 'pot'],
];

export function kindOf(slug: string, name: string): Kind {
  const text = `${slug} ${name}`;
  return RULES.find(([re]) => re.test(text))?.[1] ?? 'default';
}

const ART: Record<Exclude<Kind, 'default'>, ReactNode> = {
  pot: (
    <>
      <path d="M26 56h68v26a20 20 0 0 1-20 20H46a20 20 0 0 1-20-20z" />
      <path d="M26 62H15a4 4 0 0 0 0 8h11M94 62h11a4 4 0 0 1 0 8H94" />
      <path d="M32 56c0-9 12-15 28-15s28 6 28 15" />
      <path d="M60 41v-7m-5 0h10" className="navy" />
      <path d="M46 28c-4-5 4-8 0-14M60 26c-4-5 4-8 0-14M74 28c-4-5 4-8 0-14" className="soft" />
      <path d="M40 76c3 8 10 14 20 14" className="soft" />
    </>
  ),
  table: (
    <>
      <circle cx="60" cy="60" r="32" />
      <circle cx="60" cy="60" r="21" className="navy" />
      <path d="M60 39a21 21 0 0 1 21 21" className="soft" />
      <path d="M14 32v20a6 6 0 0 0 6 6v32M10 32v16M18 32v16M26 32v16" />
      <path d="M106 32c-7 8-9 22-6 34h6zM103 66v22" />
    </>
  ),
  tea: (
    <>
      <path d="M30 54h50v16a25 25 0 0 1-50 0z" />
      <path d="M80 60h6a9 9 0 0 1 0 18h-8" />
      <path d="M22 100h66" className="navy" />
      <path d="M42 40c-4-5 4-8 0-13M55 40c-4-5 4-8 0-13M68 40c-4-5 4-8 0-13" className="soft" />
      <path d="M38 64h34" className="soft" />
      <path d="M96 38l6 6M106 30l4 4" className="soft" />
    </>
  ),
  tools: (
    <>
      <path d="M38 78C21 70 21 40 38 24c17 16 17 46 0 54z" />
      <path d="M38 78C32 64 32 44 38 24M38 78c6-14 6-34 0-54" className="soft" />
      <path d="M38 78v4M34 82h8l-1 20a3 3 0 0 1-6 0z" className="navy" />
      <path d="M84 14c13 6 15 30 13 60H84z" />
      <path d="M84 74h13v24a6.500 6.500 0 0 1-13 0z" className="navy" />
      <path d="M90 82v10" className="soft" />
    </>
  ),
  clean: (
    <>
      <path d="M44 54h30a6 6 0 0 1 6 6v36a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6V60a6 6 0 0 1 6-6z" />
      <path d="M52 54v-9h14v9" />
      <path d="M48 45h28l8 7" className="navy" />
      <path d="M86 44l10-4M88 52l12 0M86 60l10 4" className="soft" />
      <circle cx="96" cy="86" r="5" className="soft" />
      <circle cx="26" cy="70" r="7" className="soft" />
      <circle cx="20" cy="88" r="3.5" className="soft" />
      <path d="M44 74h30" className="soft" />
    </>
  ),
  decor: (
    <>
      <path d="M46 36h28M50 36c-2 15-14 22-14 42a24 24 0 0 0 48 0c0-20-12-27-14-42" />
      <path d="M60 36V14" className="navy" />
      <path d="M60 26c-9-1-14-8-14-14 8 0 14 5 14 14zM60 22c8-1 13-7 13-13-8 0-13 5-13 13z" className="soft" />
      <path d="M44 78c4 8 10 12 16 12" className="soft" />
    </>
  ),
};

export function CategoryArt({ slug, name }: { slug: string; name: string }) {
  const kind = kindOf(slug, name);
  if (kind === 'default') return <img className="cat-default" src="/brand/mark.webp" width={121} height={240} alt="" loading="lazy" />;
  return (
    <svg className="cat-art" viewBox="0 0 120 120" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ART[kind]}
    </svg>
  );
}
