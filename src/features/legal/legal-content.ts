export type LegalDocId = 'legal-notices' | 'privacy' | 'cookies' | 'purchase-terms';

export interface LegalSection {
  headingKey: string;
  bodyKey: string;
}

export interface LegalDoc {
  id: LegalDocId;
  titleKey: string;
  introKey: string;
  sections: LegalSection[];
}

function buildSections(id: LegalDocId, count: number): LegalSection[] {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    return {
      headingKey: `legal.${id}.sections.${n}.heading`,
      bodyKey: `legal.${id}.sections.${n}.body`,
    };
  });
}

export const legalDocs: Record<LegalDocId, LegalDoc> = {
  'legal-notices': {
    id: 'legal-notices',
    titleKey: 'legal.legal-notices.title',
    introKey: 'legal.legal-notices.intro',
    sections: buildSections('legal-notices', 6),
  },
  privacy: {
    id: 'privacy',
    titleKey: 'legal.privacy.title',
    introKey: 'legal.privacy.intro',
    sections: buildSections('privacy', 8),
  },
  cookies: {
    id: 'cookies',
    titleKey: 'legal.cookies.title',
    introKey: 'legal.cookies.intro',
    sections: buildSections('cookies', 5),
  },
  'purchase-terms': {
    id: 'purchase-terms',
    titleKey: 'legal.purchase-terms.title',
    introKey: 'legal.purchase-terms.intro',
    sections: buildSections('purchase-terms', 7),
  },
};
