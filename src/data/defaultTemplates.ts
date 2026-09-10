import defaultTemplatesData from './defaultTemplates.json';

export type TemplateSide = 'buyer' | 'seller' | 'both';

export interface EmailTemplate {
  id: string;
  label: string;
  subject: string;
  text: string;
  side: TemplateSide;
}

export const DEFAULT_TEMPLATES: EmailTemplate[] = defaultTemplatesData as EmailTemplate[];
