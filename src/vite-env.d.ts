/// <reference types="vite/client" />

interface PuterAI {
  chat: (prompt: string, options?: { model?: string }) => Promise<string>;
}

interface Puter {
  ai: PuterAI;
}

declare global {
  interface Window {
    puter: Puter;
  }
}
