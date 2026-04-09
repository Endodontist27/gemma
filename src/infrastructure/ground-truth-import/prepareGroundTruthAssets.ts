import type { GroundTruthUploadAsset } from '@shared/types/GroundTruthUploadAsset';
import { logDev } from '@shared/utils/debug';
import { serializeError } from '@shared/utils/serialization';

import { classifyGroundTruthAsset } from './classifyGroundTruthAsset';
import type { GroundTruthPdfTextExtractor } from './PdfTextExtractor';
import type { GroundTruthPptxTextExtractor } from './PptxTextExtractor';
import type { NormalizedGroundTruthAsset } from './types';

const assertTextContent = (asset: GroundTruthUploadAsset) => {
  if (typeof asset.textContent !== 'string') {
    throw new Error(
      `${asset.name} could not be read as local grounded text. Try re-exporting it to .txt, .md, .csv, .json, .pptx, or searchable .pdf and upload it again.`,
    );
  }

  const normalizedText = asset.textContent.trim();
  if (!normalizedText) {
    throw new Error(`${asset.name} is empty and cannot be imported as grounded lecture data.`);
  }

  return normalizedText;
};

const isBinaryMultimodalExtension = (extension: string) =>
  ['png', 'jpg', 'jpeg', 'webp', 'mp4', 'mov', 'm4v', 'avi', 'webm'].includes(extension);

export const prepareGroundTruthAssets = async (
  rawAssets: GroundTruthUploadAsset[],
  pdfTextExtractor: GroundTruthPdfTextExtractor,
  pptxTextExtractor?: GroundTruthPptxTextExtractor,
): Promise<NormalizedGroundTruthAsset[]> => {
  const assets: NormalizedGroundTruthAsset[] = [];

  for (const rawAsset of rawAssets) {
    const classified = classifyGroundTruthAsset(rawAsset);
    let textContent: string;

    try {
      textContent =
        classified.extension === 'pdf'
          ? await pdfTextExtractor.extractText(
              rawAsset.sourceUri ??
                (() => {
                  throw new Error(
                    `${rawAsset.name} is missing a readable local file path for PDF extraction.`,
                  );
                })(),
              rawAsset.name,
            )
          : classified.extension === 'pptx'
            ? await (
                pptxTextExtractor ??
                (() => {
                  throw new Error(
                    `${rawAsset.name} could not be extracted locally as a PowerPoint file. Try exporting it again as .pptx or converting it to searchable PDF.`,
                  );
                })()
              ).extractText(
                rawAsset.sourceUri ??
                  (() => {
                    throw new Error(
                      `${rawAsset.name} is missing a readable local file path for PowerPoint extraction.`,
                    );
                  })(),
                rawAsset.name,
              )
            : isBinaryMultimodalExtension(classified.extension)
              ? ''
              : assertTextContent(rawAsset);
    } catch (error) {
      logDev(
        'ground-truth-import',
        `Failed while preparing ${rawAsset.name}`,
        serializeError(error),
      );
      throw error;
    }

    assets.push({
      ...classified,
      textContent,
    });
  }

  return assets;
};
