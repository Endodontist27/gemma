import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { extractTextFromPptxBytes } from '@infrastructure/ground-truth-import/pptx';

describe('extractTextFromPptxBytes', () => {
  it('extracts slide text and notes into markdown-like sections', () => {
    const archive = zipSync({
      'ppt/slides/slide1.xml': new TextEncoder().encode(
        [
          '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
          '<a:p><a:r><a:t>Access cavity</a:t></a:r></a:p>',
          '<a:p><a:r><a:t>Create straight-line access.</a:t></a:r></a:p>',
          '<a:p><a:r><a:t>Preserve sound tooth structure.</a:t></a:r></a:p>',
          '</p:sld>',
        ].join(''),
      ),
      'ppt/slides/slide2.xml': new TextEncoder().encode(
        [
          '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
          '<a:p><a:r><a:t>Amalgam</a:t></a:r></a:p>',
          '<a:p><a:r><a:t>A direct restorative material &amp; posterior option.</a:t></a:r></a:p>',
          '</p:sld>',
        ].join(''),
      ),
      'ppt/notesSlides/notesSlide2.xml': new TextEncoder().encode(
        [
          '<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">',
          '<a:p><a:r><a:t>Discuss indications and contraindications.</a:t></a:r></a:p>',
          '</p:notes>',
        ].join(''),
      ),
    });

    const extractedText = extractTextFromPptxBytes(archive);

    expect(extractedText).toContain('# Access cavity');
    expect(extractedText).toContain('Create straight-line access.');
    expect(extractedText).toContain('# Amalgam');
    expect(extractedText).toContain('A direct restorative material & posterior option.');
    expect(extractedText).toContain('## Speaker Notes');
    expect(extractedText).toContain('Discuss indications and contraindications.');
  });
});
