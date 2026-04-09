export interface PdfTextExtractorNativeModule {
  extractText(uri: string): Promise<string>;
}

export declare const getPdfTextExtractorModule: () => PdfTextExtractorNativeModule | null;
