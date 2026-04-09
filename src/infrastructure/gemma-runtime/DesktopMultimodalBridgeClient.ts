import type { GroundTruthUploadAsset } from '@shared/types/GroundTruthUploadAsset';
import type { DesktopModelTarget } from '@shared/config/modelConfig';

export interface DesktopBridgeEvidenceUnitPayload {
  title: string;
  excerpt: string;
  contentText: string;
  searchText: string;
  modality: 'text' | 'image' | 'video' | 'pdf' | 'slide';
  pageNumber?: number | null;
  slideNumber?: number | null;
  frameLabel?: string | null;
  timestampStartSeconds?: number | null;
  timestampEndSeconds?: number | null;
  previewUri?: string | null;
  metadataJson?: string | null;
}

export interface DesktopBridgeAssetDigestPayload {
  title: string;
  text: string;
  checksum?: string | null;
}

export interface DesktopBridgeIngestAssetPayload {
  units: DesktopBridgeEvidenceUnitPayload[];
  digest: DesktopBridgeAssetDigestPayload | null;
}

export interface DesktopBridgeRerankCandidate {
  id: string;
  title: string;
  excerpt: string;
}

export interface DesktopBridgeRerankResult {
  id: string;
  score: number;
}

const createTimeoutSignal = (timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    dispose: () => clearTimeout(timer),
  };
};

export class DesktopMultimodalBridgeClient {
  private readonly baseUrl: string;

  constructor(private readonly targetModel: DesktopModelTarget) {
    this.baseUrl = `http://${targetModel.runtime.bridge.host}:${targetModel.runtime.bridge.port}`;
  }

  async ingestAsset(
    sessionId: string,
    assetId: string,
    asset: GroundTruthUploadAsset & {
      extension: string;
      sourceKind: string;
    },
  ): Promise<DesktopBridgeIngestAssetPayload | null> {
    if (!asset.sourceUri) {
      return null;
    }

    const timeout = createTimeoutSignal(300_000);
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('assetId', assetId);
    formData.append('sourceKind', asset.sourceKind);
    formData.append('extension', asset.extension);
    formData.append('fileName', asset.name);
    if (asset.textContent) {
      formData.append('textContent', asset.textContent);
    }
    formData.append(
      'file',
      {
        uri: asset.sourceUri,
        name: asset.name,
        type: asset.mimeType ?? 'application/octet-stream',
      } as never,
    );

    try {
      const response = await fetch(`${this.baseUrl}/ingest-asset`, {
        method: 'POST',
        body: formData,
        signal: timeout.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Bridge request failed with status ${response.status}.`);
      }

      return (await response.json()) as DesktopBridgeIngestAssetPayload;
    } catch {
      return null;
    } finally {
      timeout.dispose();
    }
  }

  async rerank(question: string, candidates: DesktopBridgeRerankCandidate[]): Promise<DesktopBridgeRerankResult[] | null> {
    if (!candidates.length) {
      return [];
    }

    const timeout = createTimeoutSignal(45_000);

    try {
      const response = await fetch(`${this.baseUrl}/rerank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Connection: 'close',
        },
        body: JSON.stringify({
          question,
          candidates,
        }),
        signal: timeout.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Bridge request failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as { results: DesktopBridgeRerankResult[] };
      return payload.results;
    } catch {
      return null;
    } finally {
      timeout.dispose();
    }
  }
}
