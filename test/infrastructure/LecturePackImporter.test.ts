import type { LecturePackDto } from '@application/dto/LecturePackDto';
import demoPack from '@infrastructure/lecture-pack/sample-data/lecture-companion-demo.pack.json';
import { LecturePackImporter } from '@infrastructure/lecture-pack/LecturePackImporter';
import { buildSessionGraph } from '@infrastructure/lecture-pack/import/buildSessionGraph';
import { describe, expect, it, vi } from 'vitest';

describe('Lecture pack import foundation', () => {
  it('builds a complete in-memory session graph from a valid lecture pack', () => {
    const graph = buildSessionGraph(
      demoPack as LecturePackDto,
      'test-pack',
      '2026-04-03T09:00:00.000Z',
    );

    expect(graph.session.id).toBe(demoPack.session.id);
    expect(graph.materials.length).toBe(demoPack.materials.length);
    expect(graph.chunks.length).toBeGreaterThan(0);
    expect(graph.glossary.length).toBe(demoPack.glossary.length);
    expect(graph.publicQuestions.length).toBe(demoPack.publicQa.length);
    expect(graph.publicQuestions[0]?.sources.length).toBeGreaterThan(0);
  });

  it('fails invalid source references before any persistence transaction starts', async () => {
    const transactionSpy = vi.fn();
    const importer = new LecturePackImporter({
      transaction: transactionSpy,
    } as never);

    const invalidPack = structuredClone(demoPack as LecturePackDto);
    invalidPack.publicQa[0]!.answer.sources[0]!.sourceId = 'missing_source_record';

    await expect(importer.importFromJson(JSON.stringify(invalidPack), 'bad-pack')).rejects.toThrow(
      'Missing',
    );
    expect(transactionSpy).not.toHaveBeenCalled();
  });
});
