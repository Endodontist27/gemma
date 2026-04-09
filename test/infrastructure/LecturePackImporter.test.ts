import type { LecturePackDto } from '@application/dto/LecturePackDto';
import { LecturePackImporter } from '@infrastructure/lecture-pack/LecturePackImporter';
import { buildSessionGraph } from '@infrastructure/lecture-pack/import/buildSessionGraph';
import { describe, expect, it, vi } from 'vitest';

import lecturePackFixture from '../fixtures/lecture-pack.fixture.json';

describe('Lecture pack import foundation', () => {
  it('builds a complete in-memory session graph from a valid lecture pack', () => {
    const graph = buildSessionGraph(
      lecturePackFixture as LecturePackDto,
      'test-pack',
      '2026-04-03T09:00:00.000Z',
    );

    expect(graph.session.id).toBe(lecturePackFixture.session.id);
    expect(graph.materials.length).toBe(lecturePackFixture.materials.length);
    expect(graph.chunks.length).toBeGreaterThan(0);
    expect(graph.glossary.length).toBe(lecturePackFixture.glossary.length);
    expect(graph.publicQuestions.length).toBe(lecturePackFixture.publicQa.length);
    expect(graph.publicQuestions[0]?.sources.length).toBeGreaterThan(0);
  });

  it('fails invalid source references before any persistence transaction starts', async () => {
    const transactionSpy = vi.fn();
    const importer = new LecturePackImporter({
      transaction: transactionSpy,
    } as never);

    const invalidPack = structuredClone(lecturePackFixture as LecturePackDto);
    invalidPack.publicQa[0]!.answer.sources[0]!.sourceId = 'missing_source_record';

    await expect(importer.importFromJson(JSON.stringify(invalidPack), 'bad-pack')).rejects.toThrow(
      'Missing',
    );
    expect(transactionSpy).not.toHaveBeenCalled();
  });
});
