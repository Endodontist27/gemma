import { describe, expect, it } from 'vitest';

import { ListSessionWorkspacesUseCase } from '@application/use-cases/ListSessionWorkspacesUseCase';
import type { LectureMaterial } from '@domain/entities/LectureMaterial';
import type { LectureSession } from '@domain/entities/LectureSession';
import type { UploadedAsset } from '@domain/entities/UploadedAsset';

describe('ListSessionWorkspacesUseCase', () => {
  it('builds workspace rows from sessions, uploaded assets, and fallback material labels', async () => {
    const session: LectureSession = {
      id: 'session_workspace',
      title: 'Restorative workspace',
      courseCode: 'RESTO-1',
      lecturer: 'Dr. Demo',
      description: 'Local workspace',
      location: 'Device',
      startsAt: '2026-04-09T09:00:00.000Z',
      status: 'live',
      sourcePackVersion: '1.0.0',
      tags: ['uploaded'],
      createdAt: '2026-04-09T09:00:00.000Z',
      updatedAt: '2026-04-09T09:00:00.000Z',
    };
    const materials: LectureMaterial[] = [
      {
        id: 'material_1',
        sessionId: session.id,
        title: 'Slides',
        type: 'slide_deck',
        sourceLabel: 'THE RESTO.pptx',
        contentText: 'Slide digest',
        orderIndex: 0,
        createdAt: '2026-04-09T09:00:00.000Z',
        updatedAt: '2026-04-09T09:00:00.000Z',
      },
      {
        id: 'material_2',
        sessionId: session.id,
        title: 'Glossary',
        type: 'reading',
        sourceLabel: 'restorative_dentistry_glossary_definitions.pdf',
        contentText: 'Glossary digest',
        orderIndex: 1,
        createdAt: '2026-04-09T09:00:00.000Z',
        updatedAt: '2026-04-09T09:00:00.000Z',
      },
    ];
    const uploadedAssets: UploadedAsset[] = [
      {
        id: 'asset_1',
        sessionId: session.id,
        fileName: 'THE RESTO.pptx',
        mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        sourceKind: 'material',
        sourceExtension: 'pptx',
        checksum: null,
        sizeBytes: 1024,
        status: 'ready',
        errorMessage: null,
        createdAt: '2026-04-09T09:00:00.000Z',
        updatedAt: '2026-04-09T09:00:00.000Z',
        indexedAt: '2026-04-09T09:02:00.000Z',
      },
    ];

    const useCase = new ListSessionWorkspacesUseCase(
      {
        list: async () => [session],
      } as any,
      {
        listBySession: async () => materials,
      } as any,
      {
        listBySession: async () => uploadedAssets,
      } as any,
    );

    const workspaces = await useCase.execute();

    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]?.session.id).toBe(session.id);
    expect(workspaces[0]?.materialCount).toBe(2);
    expect(workspaces[0]?.sourceFiles).toEqual([
      'THE RESTO.pptx',
      'restorative_dentistry_glossary_definitions.pdf',
    ]);
    expect(workspaces[0]?.indexedAssets[0]?.fileName).toBe('THE RESTO.pptx');
    expect(workspaces[0]?.indexedAssets[0]?.status).toBe('ready');
  });
});
