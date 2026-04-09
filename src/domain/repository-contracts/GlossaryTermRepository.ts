import type { GlossaryTerm } from '@domain/entities/GlossaryTerm';

export interface GlossaryTermRepository {
  /** Ordered by glossary order index, then term, then stable id order. */
  listBySession(sessionId: string): Promise<GlossaryTerm[]>;
  findById(id: string): Promise<GlossaryTerm | null>;
  saveMany(terms: GlossaryTerm[]): Promise<void>;
}
