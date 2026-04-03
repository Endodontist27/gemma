import type { GlossaryTerm } from '@domain/entities/GlossaryTerm';

export interface GlossaryTermRepository {
  /** Ordered by glossary order index, then term, then stable id order. */
  listBySession(sessionId: string): Promise<GlossaryTerm[]>;
  saveMany(terms: GlossaryTerm[]): Promise<void>;
}
