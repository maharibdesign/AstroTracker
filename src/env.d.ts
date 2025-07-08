/// <reference types="astro/client" />

// This tells TypeScript that the 'window' object can have a 'Telegram' property.
declare interface Window {
  Telegram?: {
    WebApp: {
      initDataUnsafe?: {
        user?: {
          id: number;
        };
      };
      colorScheme: 'light' | 'dark';
      ready: () => void;
      onEvent: (
        eventType: 'themeChanged',
        eventHandler: () => void
      ) => void;
      close: () => void;
    };
  };
}