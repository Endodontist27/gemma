import { describe, expect, it } from 'vitest';

import type { LectureSession } from '@domain/entities/LectureSession';
import type { LectureSessionRepository } from '@domain/repository-contracts/LectureSessionRepository';
import type { LecturePackImportService } from '@domain/service-contracts/LecturePackImportService';
import { GroundTruthImporter } from '@infrastructure/ground-truth-import/GroundTruthImporter';
import type { GroundTruthPdfTextExtractor } from '@infrastructure/ground-truth-import/PdfTextExtractor';
import type { GroundTruthPptxTextExtractor } from '@infrastructure/ground-truth-import/PptxTextExtractor';
import type { GroundTruthSessionAppender } from '@infrastructure/ground-truth-import/GroundTruthSessionAppender';
import type { LecturePackSessionGraph } from '@infrastructure/lecture-pack/import/types';

class CaptureLecturePackImportService implements LecturePackImportService {
  lastRawPack: string | null = null;
  lastSourceLabel: string | null = null;

  async importFromJson(rawPack: string, sourceLabel: string): Promise<LectureSession> {
    this.lastRawPack = rawPack;
    this.lastSourceLabel = sourceLabel;

    const parsed = JSON.parse(rawPack) as {
      session: LectureSession;
    };

    return parsed.session;
  }
}

class StubLectureSessionRepository implements LectureSessionRepository {
  constructor(private readonly sessionById: Map<string, LectureSession> = new Map()) {}

  async count() {
    return this.sessionById.size;
  }

  async list() {
    return Array.from(this.sessionById.values());
  }

  async findById(id: string) {
    return this.sessionById.get(id) ?? null;
  }

  async deleteById(id: string) {
    this.sessionById.delete(id);
  }

  async clearAll() {
    this.sessionById.clear();
  }

  async save(session: LectureSession) {
    this.sessionById.set(session.id, session);
  }
}

class CaptureGroundTruthSessionAppender implements GroundTruthSessionAppender {
  lastExistingSession: LectureSession | null = null;
  lastGraph: LecturePackSessionGraph | null = null;

  async appendToSession(graph: LecturePackSessionGraph, existingSession: LectureSession) {
    this.lastGraph = graph;
    this.lastExistingSession = existingSession;

    return {
      ...existingSession,
      tags: Array.from(new Set([...existingSession.tags, ...graph.session.tags])),
      updatedAt: graph.session.updatedAt,
      sourcePackVersion: graph.session.sourcePackVersion,
    };
  }
}

describe('GroundTruthImporter', () => {
  const pdfTextExtractor: GroundTruthPdfTextExtractor = {
    extractText: async (_sourceUri, assetName) =>
      `Extracted PDF text for ${assetName}\nWorking length: The apical extent used during instrumentation`,
  };
  const pptxTextExtractor: GroundTruthPptxTextExtractor = {
    extractText: async (_sourceUri, assetName) =>
      `# ${assetName}\n\nInstrument setup and restorative planning.\n\n# Amalgam\nAmalgam is a direct restorative material used for posterior restorations.`,
  };

  it('builds a lecture pack from grounded source files and forwards it to the lecture-pack importer', async () => {
    const importService = new CaptureLecturePackImportService();
    const importer = new GroundTruthImporter(importService, pdfTextExtractor);

    const session = await importer.importFromAssets(
      [
        {
          name: 'session.json',
          mimeType: 'application/json',
          textContent: JSON.stringify({
            title: 'Modern Endodontics Review',
            courseCode: 'ENDO-701',
            lecturer: 'Dr. Gerry',
            tags: ['endodontics', 'review'],
          }),
        },
        {
          name: 'slides.md',
          mimeType: 'text/markdown',
          textContent:
            '# Working length\nWorking length keeps instrumentation controlled.\n\n# Irrigation\nSodium hypochlorite is the primary irrigant.',
        },
        {
          name: 'glossary.csv',
          mimeType: 'text/csv',
          textContent:
            'term,definition,aliases\nWorking length,The apical extent used during instrumentation,WL',
        },
        {
          name: 'transcript.txt',
          mimeType: 'text/plain',
          textContent: '[00:05] Dr. Gerry: Working length prevents over-instrumentation.',
        },
      ],
      'ground-truth-upload-4-files',
    );

    expect(session.title).toBe('Modern Endodontics Review');
    expect(importService.lastSourceLabel).toBe('ground-truth-upload-4-files');

    const builtPack = JSON.parse(importService.lastRawPack ?? '{}') as {
      materials: { chunks: { heading: string }[] }[];
      glossary: { term: string }[];
      transcript: { speakerLabel: string }[];
      session: { courseCode: string };
    };

    expect(builtPack.session.courseCode).toBe('ENDO-701');
    expect(builtPack.materials).toHaveLength(1);
    expect(builtPack.materials[0]?.chunks).toHaveLength(2);
    expect(builtPack.materials[0]?.chunks[0]?.heading).toBe('Working length');
    expect(builtPack.glossary[0]?.term).toBe('Working length');
    expect(builtPack.transcript[0]?.speakerLabel).toBe('Dr. Gerry');
  });

  it('passes through a complete lecture-pack JSON unchanged', async () => {
    const importService = new CaptureLecturePackImportService();
    const importer = new GroundTruthImporter(importService, pdfTextExtractor);
    const lecturePackJson = JSON.stringify({
      packVersion: '1.0.0',
      exportedAt: '2026-04-04T10:00:00.000Z',
      session: {
        id: 'session_demo',
        title: 'Pack import',
        courseCode: 'PACK-1',
        lecturer: 'Dr. Demo',
        description: 'Demo pack',
        location: 'Device',
        startsAt: '2026-04-04T10:00:00.000Z',
        status: 'live',
        tags: ['pack'],
      },
      materials: [
        {
          id: 'material_demo',
          title: 'Slides',
          type: 'slide_deck',
          sourceLabel: 'slides.json',
          contentText: 'Demo content',
          orderIndex: 0,
          chunks: [
            {
              id: 'chunk_demo',
              heading: 'Intro',
              text: 'Grounded lecture content',
              keywords: [],
              orderIndex: 0,
            },
          ],
        },
      ],
      glossary: [],
      transcript: [],
      summaries: [],
      qaCategories: [],
      publicQa: [],
    });

    await importer.importFromAssets(
      [
        {
          name: 'lecture.pack.json',
          mimeType: 'application/json',
          textContent: lecturePackJson,
        },
      ],
      'lecture.pack.json',
    );

    expect(importService.lastRawPack).toBe(lecturePackJson);
    expect(importService.lastSourceLabel).toBe('lecture.pack.json');
  });

  it('extracts grounded text from searchable PDFs before import', async () => {
    const importService = new CaptureLecturePackImportService();
    const importer = new GroundTruthImporter(importService, pdfTextExtractor);

    const session = await importer.importFromAssets(
      [
        {
          name: 'definitions.pdf',
          mimeType: 'application/pdf',
          sourceUri: 'file:///definitions.pdf',
        },
      ],
      'definitions.pdf',
    );

    expect(session.title).toBe('Definitions');

    const builtPack = JSON.parse(importService.lastRawPack ?? '{}') as {
      glossary: { term: string; definition: string }[];
      materials: { title: string }[];
    };

    expect(builtPack.glossary[0]?.term).toBe('Working length');
    expect(builtPack.glossary[0]?.definition).toContain('apical extent');
    expect(builtPack.materials).toHaveLength(1);
    expect(builtPack.materials[0]?.title).toBe('Definitions');
  });

  it('parses glossary PDFs that separate terms and definitions across paragraphs', async () => {
    const importService = new CaptureLecturePackImportService();
    const importer = new GroundTruthImporter(importService, {
      extractText: async () =>
        [
          'Working length',
          'The apical extent used during instrumentation and obturation.',
          '',
          'Apical patency',
          'Maintaining a small patent path to the apical constriction during cleaning.',
        ].join('\n\n'),
    });

    await importer.importFromAssets(
      [
        {
          name: 'definitions.pdf',
          mimeType: 'application/pdf',
          sourceUri: 'file:///definitions.pdf',
        },
      ],
      'definitions.pdf',
    );

    const builtPack = JSON.parse(importService.lastRawPack ?? '{}') as {
      glossary: { term: string; definition: string }[];
      materials: { title: string }[];
    };

    expect(builtPack.glossary).toHaveLength(2);
    expect(builtPack.glossary[0]?.term).toBe('Working length');
    expect(builtPack.glossary[1]?.term).toBe('Apical patency');
    expect(builtPack.materials).toHaveLength(1);
    expect(builtPack.materials[0]?.title).toBe('Definitions');
  });

  it('falls back to imported glossary material when a glossary PDF has no parseable term pairs', async () => {
    const importService = new CaptureLecturePackImportService();
    const importer = new GroundTruthImporter(importService, {
      extractText: async () =>
        'Ground rules for instrumentation include preserving canal anatomy, avoiding ledging, and maintaining irrigation access throughout treatment.',
    });

    await importer.importFromAssets(
      [
        {
          name: 'groundrules.pdf',
          mimeType: 'application/pdf',
          sourceUri: 'file:///groundrules.pdf',
        },
      ],
      'groundrules.pdf',
    );

    const builtPack = JSON.parse(importService.lastRawPack ?? '{}') as {
      glossary: { term: string; definition: string }[];
      materials: { title: string; chunks: { text: string }[] }[];
    };

    expect(builtPack.glossary).toHaveLength(0);
    expect(builtPack.materials).toHaveLength(1);
    expect(builtPack.materials[0]?.title).toBe('Groundrules');
    expect(builtPack.materials[0]?.chunks[0]?.text).toContain('preserving canal anatomy');
  });

  it('namespaces generated category ids by session so repeated imports do not collide', async () => {
    const importService = new CaptureLecturePackImportService();
    const importer = new GroundTruthImporter(importService, {
      extractText: async () =>
        'Working length: The apical extent used during instrumentation and obturation.',
    });

    await importer.importFromAssets(
      [
        {
          name: 'endodontic_glossary_definitions.pdf',
          mimeType: 'application/pdf',
          sourceUri: 'file:///endodontic_glossary_definitions.pdf',
        },
      ],
      'endodontic_glossary_definitions.pdf',
    );

    const builtPack = JSON.parse(importService.lastRawPack ?? '{}') as {
      session: { id: string };
      materials: { id: string; chunks: { id: string }[] }[];
      glossary: { id: string }[];
      qaCategories: { id: string; key: string }[];
    };

    expect(builtPack.qaCategories[0]?.key).toBe('concepts');
    expect(builtPack.qaCategories[0]?.id).toBe(`${builtPack.session.id}_category_concepts`);
    expect(builtPack.materials[0]?.id.startsWith(`${builtPack.session.id}_`)).toBe(true);
    expect(builtPack.materials[0]?.chunks[0]?.id.startsWith(`${builtPack.session.id}_`)).toBe(true);
    expect(builtPack.glossary[0]?.id.startsWith(`${builtPack.session.id}_`)).toBe(true);
  });

  it('deduplicates repeated glossary terms from a PDF import', async () => {
    const importService = new CaptureLecturePackImportService();
    const importer = new GroundTruthImporter(importService, {
      extractText: async () =>
        [
          'Working length',
          'The first definition variant.',
          '',
          'Working length',
          'The second, longer definition variant used during instrumentation and obturation.',
        ].join('\n\n'),
    });

    await importer.importFromAssets(
      [
        {
          name: 'endodontic_glossary_definitions.pdf',
          mimeType: 'application/pdf',
          sourceUri: 'file:///endodontic_glossary_definitions.pdf',
        },
      ],
      'endodontic_glossary_definitions.pdf',
    );

    const builtPack = JSON.parse(importService.lastRawPack ?? '{}') as {
      glossary: { term: string; definition: string }[];
    };

    expect(builtPack.glossary).toHaveLength(1);
    expect(builtPack.glossary[0]?.term).toBe('Working length');
    expect(builtPack.glossary[0]?.definition).toContain('longer definition variant');
  });

  it('filters obvious glossary metadata headings from PDF-derived glossary terms', async () => {
    const importService = new CaptureLecturePackImportService();
    const importer = new GroundTruthImporter(importService, {
      extractText: async () =>
        [
          'Included scope',
          'Anatomy and morphology, pulpal and periapical diagnosis, microbiology, instrumentation, working length',
          '',
          'Working length',
          'The apical extent used during instrumentation and obturation.',
        ].join('\n\n'),
    });

    await importer.importFromAssets(
      [
        {
          name: 'endodontic_glossary_definitions.pdf',
          mimeType: 'application/pdf',
          sourceUri: 'file:///endodontic_glossary_definitions.pdf',
        },
      ],
      'endodontic_glossary_definitions.pdf',
    );

    const builtPack = JSON.parse(importService.lastRawPack ?? '{}') as {
      glossary: { term: string }[];
    };

    expect(builtPack.glossary.map((entry) => entry.term)).toEqual(['Working length']);
  });

  it('parses inline alphabetized glossary entries from PDF text', async () => {
    const importService = new CaptureLecturePackImportService();
    const importer = new GroundTruthImporter(importService, {
      extractText: async () =>
        [
          'Endodontic Glossary 418 concise definitions',
          'Apex locator. Electronic device used to estimate working length by measuring impedance or resistance.',
          'Apical constriction. The narrowest part of the canal near the cemento-dentinal junction.',
          'Working length. The apical extent used during instrumentation and obturation.',
        ].join(' '),
    });

    await importer.importFromAssets(
      [
        {
          name: 'endodontic_glossary_definitions.pdf',
          mimeType: 'application/pdf',
          sourceUri: 'file:///endodontic_glossary_definitions.pdf',
        },
      ],
      'endodontic_glossary_definitions.pdf',
    );

    const builtPack = JSON.parse(importService.lastRawPack ?? '{}') as {
      glossary: { term: string; definition: string }[];
    };

    expect(builtPack.glossary.map((entry) => entry.term)).toContain('Working length');
    expect(
      builtPack.glossary.find((entry) => entry.term === 'Working length')?.definition,
    ).toContain('apical extent used during instrumentation');
  });

  it('normalizes two-column glossary PDFs before parsing inline definitions', async () => {
    const importService = new CaptureLecturePackImportService();
    const importer = new GroundTruthImporter(importService, {
      extractText: async () =>
        [
          'Endodontic Glossary                                                                                   418 concise definitions',
          '',
          ' Working length. Distance from a coronal reference point      Working width. Estimated diameter of the canal at the',
          ' to the planned apical endpoint of preparation and filling.   apical preparation endpoint.',
          '',
          ' Apex locator. Electronic device used to estimate working     Apical constriction. The narrowest part of the canal near',
          ' length by measuring impedance or resistance.                 the cemento-dentinal junction.',
        ].join('\n'),
    });

    await importer.importFromAssets(
      [
        {
          name: 'endodontic_glossary_definitions.pdf',
          mimeType: 'application/pdf',
          sourceUri: 'file:///endodontic_glossary_definitions.pdf',
        },
      ],
      'endodontic_glossary_definitions.pdf',
    );

    const builtPack = JSON.parse(importService.lastRawPack ?? '{}') as {
      glossary: { term: string; definition: string }[];
    };

    expect(builtPack.glossary.map((entry) => entry.term)).toEqual(
      expect.arrayContaining([
        'Working length',
        'Working width',
        'Apex locator',
        'Apical constriction',
      ]),
    );
    expect(
      builtPack.glossary.find((entry) => entry.term === 'Working length')?.definition,
    ).toContain('planned apical endpoint of preparation and filling');
  });

  it('digests flattened alphabetical glossary PDFs into searchable glossary entries and chunks', async () => {
    const importService = new CaptureLecturePackImportService();
    const importer = new GroundTruthImporter(importService, {
      extractText: async () =>
        [
          'Restorative Dentistry Glossary',
          'Unique terms and concise definitions covering operative dentistry, adhesive protocols, esthetic restorations.',
          'Total unique terms: 392',
          'Scope: direct restorations, indirect restorations, occlusion, and materials.',
          'Alphabetical glossary starts on the next page.',
          'A',
          'Abfraction. A wedge-shaped loss of tooth structure at the cervical area thought to be related to occlusal stress and flexure.',
          'Abrasion. Pathologic wear of tooth structure caused by an external mechanical factor such as aggressive brushing or abrasive habits.',
          'Amalgam. A direct restorative material produced by mixing alloy powder with mercury.',
          'Amalgam carrier. An instrument used to transport mixed amalgam into the cavity preparation.',
          'B',
          'Base. A relatively thick material placed to replace missing dentin, provide support, or offer thermal protection beneath a restoration.',
        ].join(' '),
    });

    await importer.importFromAssets(
      [
        {
          name: 'restorative_dentistry_glossary_definitions.pdf',
          mimeType: 'application/pdf',
          sourceUri: 'file:///restorative_dentistry_glossary_definitions.pdf',
        },
      ],
      'restorative_dentistry_glossary_definitions.pdf',
    );

    const builtPack = JSON.parse(importService.lastRawPack ?? '{}') as {
      glossary: { term: string; definition: string }[];
      materials: { chunks: { heading: string; text: string }[] }[];
    };

    expect(builtPack.glossary.map((entry) => entry.term)).toEqual(
      expect.arrayContaining(['Abfraction', 'Abrasion', 'Amalgam', 'Amalgam carrier', 'Base']),
    );
    expect(builtPack.glossary.find((entry) => entry.term === 'Amalgam')?.definition).toContain(
      'mixing alloy powder with mercury',
    );
    expect(builtPack.materials[0]?.chunks.length).toBeGreaterThanOrEqual(5);
    expect(builtPack.materials[0]?.chunks.some((chunk) => chunk.heading === 'Amalgam')).toBe(true);
  });

  it('imports pptx source files as grounded lecture material', async () => {
    const importService = new CaptureLecturePackImportService();
    const importer = new GroundTruthImporter(importService, pdfTextExtractor, {
      extractText: async () =>
        [
          '# Slide 1 - Access cavity',
          '',
          'Create straight-line access to the pulp chamber while preserving sound tooth structure.',
          '',
          '# Slide 2 - Amalgam',
          '',
          'Amalgam is a direct restorative material used in posterior load-bearing restorations.',
        ].join('\n'),
    });

    await importer.importFromAssets(
      [
        {
          name: 'operative_restorations.pptx',
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          sourceUri: 'file:///operative_restorations.pptx',
        },
      ],
      'operative_restorations.pptx',
    );

    const builtPack = JSON.parse(importService.lastRawPack ?? '{}') as {
      materials: {
        title: string;
        type: string;
        chunks: { heading: string; text: string }[];
      }[];
    };

    expect(builtPack.materials).toHaveLength(1);
    expect(builtPack.materials[0]?.type).toBe('slide_deck');
    expect(builtPack.materials[0]?.chunks.map((chunk) => chunk.heading)).toEqual([
      'Slide 1 - Access cavity',
      'Slide 2 - Amalgam',
    ]);
    expect(builtPack.materials[0]?.chunks[1]?.text).toContain(
      'posterior load-bearing restorations',
    );
  });

  it('rejects unsupported legacy powerpoint files with a clear message', async () => {
    const importService = new CaptureLecturePackImportService();
    const importer = new GroundTruthImporter(importService, pdfTextExtractor, pptxTextExtractor);

    await expect(
      importer.importFromAssets(
        [
          {
            name: 'slides.ppt',
            mimeType: 'application/vnd.ms-powerpoint',
            textContent: 'binary-placeholder',
          },
        ],
        'slides.ppt',
      ),
    ).rejects.toThrow('Export it to .txt, .md, .csv, .json, or .pptx');
  });

  it('appends later grounded uploads into the existing active session instead of creating a new session', async () => {
    const importService = new CaptureLecturePackImportService();
    const existingSession: LectureSession = {
      id: 'session_restorative_workspace',
      title: 'Restorative Workspace',
      courseCode: 'RESTO-1',
      lecturer: 'Dr. Demo',
      description: 'Combined workspace',
      location: 'Local import',
      startsAt: '2026-04-08T09:00:00.000Z',
      status: 'live',
      sourcePackVersion: '1.0.0:initial-import',
      tags: ['uploaded', 'ground-truth'],
      createdAt: '2026-04-08T09:00:00.000Z',
      updatedAt: '2026-04-08T09:00:00.000Z',
    };
    const sessionRepository = new StubLectureSessionRepository(
      new Map([[existingSession.id, existingSession]]),
    );
    const sessionAppender = new CaptureGroundTruthSessionAppender();
    const importer = new GroundTruthImporter(importService, pdfTextExtractor, undefined, {
      lectureSessionRepository: sessionRepository,
      sessionAppender,
    });

    const session = await importer.importFromAssets(
      [
        {
          name: 'restorative_notes.txt',
          mimeType: 'text/plain',
          textContent:
            'Amalgam is a direct restorative material used in posterior load-bearing restorations.',
        },
      ],
      'restorative_notes.txt',
      {
        mergeIntoSessionId: existingSession.id,
      },
    );

    expect(session.id).toBe(existingSession.id);
    expect(importService.lastRawPack).toBeNull();
    expect(sessionAppender.lastExistingSession?.id).toBe(existingSession.id);
    expect(sessionAppender.lastGraph?.session.id).toBe(existingSession.id);
    expect(sessionAppender.lastGraph?.materials.length).toBe(1);
    expect(sessionAppender.lastGraph?.materials[0]?.sessionId).toBe(existingSession.id);
    expect(sessionAppender.lastGraph?.materials[0]?.id.startsWith(`${existingSession.id}_`)).toBe(
      true,
    );
    expect(sessionAppender.lastGraph?.materials[0]?.id).not.toBe(existingSession.id);
    expect(sessionAppender.lastGraph?.glossary).toHaveLength(0);
  });
});
