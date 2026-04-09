import { File } from 'expo-file-system';

import { logDev } from '@shared/utils/debug';
import { serializeError } from '@shared/utils/serialization';
import { extractTextFromPptxBytes } from './pptx';

export interface GroundTruthPptxTextExtractor {
  extractText(sourceUri: string, assetName: string): Promise<string>;
}
export class NativePptxTextExtractor implements GroundTruthPptxTextExtractor {
  async extractText(sourceUri: string, assetName: string): Promise<string> {
    try {
      logDev('ground-truth-import', 'Starting local PPTX extraction', {
        assetName,
        sourceUri,
      });

      const archiveFile = new File(sourceUri);
      const archiveBytes = await archiveFile.bytes();
      const extractedText = extractTextFromPptxBytes(archiveBytes).trim();

      if (!extractedText) {
        throw new Error(
          `${assetName} does not appear to contain extractable slide text. Re-export the PowerPoint or save it as searchable PDF if needed.`,
        );
      }

      logDev('ground-truth-import', 'Local PPTX extraction completed', {
        assetName,
        textLength: extractedText.length,
      });

      return extractedText;
    } catch (error) {
      logDev('ground-truth-import', 'Local PPTX extraction failed', {
        assetName,
        sourceUri,
        ...serializeError(error),
      });
      throw error;
    }
  }
}
