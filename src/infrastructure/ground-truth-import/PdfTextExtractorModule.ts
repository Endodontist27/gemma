import { getPdfTextExtractorModule } from 'pdf-text-extractor';

export interface PdfTextExtractorNativeModule {
  extractText(uri: string): Promise<string>;
}

export const pdfTextExtractorModule = getPdfTextExtractorModule();
