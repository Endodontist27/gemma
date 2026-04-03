export interface DatabaseInitializer {
  initialize(): Promise<void>;
}
