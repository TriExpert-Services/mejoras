// Global type definitions for noVNC
declare global {
  interface Window {
    RFB: new (target: HTMLElement, url: string, options?: any) => any;
    noVNCLoaded?: boolean;
    noVNCLoadError?: boolean;
  }
}

export {};