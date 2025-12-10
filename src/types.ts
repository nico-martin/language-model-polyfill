export interface LanguageModelPolyfillMessage {
  role: LanguageModelMessageRole | LanguageModelSystemMessageRole;
  content: string;
}
