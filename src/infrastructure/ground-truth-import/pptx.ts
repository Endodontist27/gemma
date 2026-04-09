import { strFromU8, unzipSync } from 'fflate';

const NOTES_PATH_PATTERN = /^ppt\/notesSlides\/notesSlide(\d+)\.xml$/u;
const PARAGRAPH_PATTERN = /<(?:a:)?p\b[\s\S]*?<\/(?:a:)?p>/gu;
const SLIDE_PATH_PATTERN = /^ppt\/slides\/slide(\d+)\.xml$/u;
const TEXT_RUN_PATTERN = /<(?:a:)?t[^>]*>([\s\S]*?)<\/(?:a:)?t>/gu;

const decodeXmlEntities = (value: string) =>
  value
    .replace(/&#x([0-9a-f]+);/giu, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/gu, (_match, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/&amp;/gu, '&')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'");

const extractParagraphsFromXml = (xml: string) => {
  const paragraphMatches = Array.from(xml.matchAll(PARAGRAPH_PATTERN), (match) => match[0]);
  const paragraphSources = paragraphMatches.length > 0 ? paragraphMatches : [xml];

  return paragraphSources
    .map((paragraph) => {
      const runs = Array.from(paragraph.matchAll(TEXT_RUN_PATTERN), (match) =>
        decodeXmlEntities(match[1] ?? ''),
      );

      return runs.join('').replace(/\s+/gu, ' ').trim();
    })
    .filter(Boolean);
};

const getSlideOrder = (path: string, pattern: RegExp) =>
  Number.parseInt(path.match(pattern)?.[1] ?? '', 10);

const formatSlideSection = (
  slideNumber: number,
  slideParagraphs: string[],
  notesParagraphs: string[],
) => {
  const [firstParagraph, ...remainingParagraphs] = slideParagraphs;
  const heading = firstParagraph || `Slide ${slideNumber}`;
  const bodyLines = remainingParagraphs.length > 0 ? remainingParagraphs : [heading];
  const notesSection =
    notesParagraphs.length > 0 ? ['## Speaker Notes', ...notesParagraphs].join('\n') : '';

  return [`# ${heading}`, bodyLines.join('\n'), notesSection].filter(Boolean).join('\n\n').trim();
};

export const extractTextFromPptxBytes = (bytes: Uint8Array) => {
  const archive = unzipSync(bytes, {
    filter: (file) => SLIDE_PATH_PATTERN.test(file.name) || NOTES_PATH_PATTERN.test(file.name),
  });
  const archiveEntries = Object.entries(archive);
  const slidePaths = archiveEntries
    .map(([path]) => path)
    .filter((path) => SLIDE_PATH_PATTERN.test(path))
    .sort(
      (left, right) =>
        getSlideOrder(left, SLIDE_PATH_PATTERN) - getSlideOrder(right, SLIDE_PATH_PATTERN),
    );

  if (!slidePaths.length) {
    throw new Error('The selected PowerPoint file does not contain readable slide content.');
  }

  const notesBySlideNumber = new Map<number, string[]>();

  for (const [path, content] of archiveEntries) {
    if (!NOTES_PATH_PATTERN.test(path)) {
      continue;
    }

    const slideNumber = getSlideOrder(path, NOTES_PATH_PATTERN);
    if (!Number.isFinite(slideNumber)) {
      continue;
    }

    notesBySlideNumber.set(slideNumber, extractParagraphsFromXml(strFromU8(content)));
  }

  const sections = slidePaths
    .map((path) => {
      const content = archive[path];
      if (!content) {
        return null;
      }

      const slideNumber = getSlideOrder(path, SLIDE_PATH_PATTERN);
      const slideParagraphs = extractParagraphsFromXml(strFromU8(content));
      if (!slideParagraphs.length) {
        return null;
      }

      return formatSlideSection(
        slideNumber,
        slideParagraphs,
        notesBySlideNumber.get(slideNumber) ?? [],
      );
    })
    .filter((section): section is string => Boolean(section));

  if (!sections.length) {
    throw new Error(
      'The selected PowerPoint file does not appear to contain extractable slide text.',
    );
  }

  return sections.join('\n\n');
};
