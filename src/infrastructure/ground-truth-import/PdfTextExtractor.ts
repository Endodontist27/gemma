import { pdfTextExtractorModule } from '@infrastructure/ground-truth-import/PdfTextExtractorModule';
import { logDev } from '@shared/utils/debug';
import { serializeError } from '@shared/utils/serialization';

export interface GroundTruthPdfTextExtractor {
  extractText(sourceUri: string, assetName: string): Promise<string>;
}

export class NativePdfTextExtractor implements GroundTruthPdfTextExtractor {
  async extractText(sourceUri: string, assetName: string): Promise<string> {
    if (!pdfTextExtractorModule) {
      throw new Error(
        `PDF import for ${assetName} is not available in this build. Use the Android development build to import searchable PDFs locally.`,
      );
    }

    try {
      logDev('ground-truth-import', 'Starting native PDF extraction', {
        assetName,
        sourceUri,
      });
      const extractedText = await pdfTextExtractorModule.extractText(sourceUri);
      const normalizedText = extractedText.replace(/\u0000/g, '').trim();

      if (!normalizedText) {
        throw new Error(
          `${assetName} does not appear to contain extractable text. If it is a scanned PDF, run OCR or export it to .txt, .md, .csv, or .json before uploading it.`,
        );
      }

      logDev('ground-truth-import', 'Native PDF extraction completed', {
        assetName,
        textLength: normalizedText.length,
      });
      return normalizedText;
    } catch (error) {
      logDev('ground-truth-import', 'Native PDF extraction failed', {
        assetName,
        sourceUri,
        ...serializeError(error),
      });
      throw error;
    }
  }
}
