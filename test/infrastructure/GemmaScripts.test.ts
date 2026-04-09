import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('Gemma scripts', () => {
  it('rejects non-Gemma-4 model ids for download', () => {
    const result = spawnSync(
      'python',
      ['scripts/gemma/download.py', '--model-id', 'google/gemma-3n-E2B-it'],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Only google/gemma-4-E2B-it is supported');
  });

  it('rejects non-Gemma-4 model ids for preparation', () => {
    const result = spawnSync(
      'python',
      ['scripts/gemma/prepare_android.py', '--model-id', 'google/gemma-3n-E2B-it'],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Only google/gemma-4-E2B-it is supported');
  });

  it('rejects non-Gemma-4 model ids for Android artifact download', () => {
    const result = spawnSync(
      'python',
      ['scripts/gemma/download_android_artifact.py', '--model-id', 'google/gemma-3n-E2B-it'],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Only google/gemma-4-E2B-it is supported');
  });

  it('rejects non-Gemma-4 model ids for Android staging', () => {
    const result = spawnSync(
      'python',
      ['scripts/gemma/stage_android.py', '--model-id', 'google/gemma-3n-E2B-it'],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Only google/gemma-4-E2B-it is supported');
  });

  it('rejects non-Gemma-4 model ids for desktop harness', () => {
    const result = spawnSync(
      'python',
      ['scripts/gemma/desktop_harness.py', '--model-id', 'google/gemma-3n-E2B-it', 'doctor'],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Only google/gemma-4-E4B-it is supported');
  });

  it('prints a grounded prompt in desktop dry-run mode without loading the model', () => {
    const result = spawnSync(
      'python',
      [
        'scripts/gemma/desktop_harness.py',
        'answer',
        '--dry-run',
        '--json',
        '--question',
        'What is grounding?',
      ],
      {
        cwd: repoRoot,
        encoding: 'utf-8',
      },
    );

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.modelId).toBe('google/gemma-4-E4B-it');
    expect(payload.supported).toBe(true);
    expect(payload.question).toBe('What is grounding?');
    expect(payload.prompt).toContain('Use only the provided local lecture evidence.');
    expect(payload.matches.length).toBeGreaterThan(0);
  });
});
