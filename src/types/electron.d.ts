export {};

declare global {
  interface Window {
    desktop?: {
      getAppVersion: () => Promise<string>;
      exportBackup: () => Promise<{ success: boolean; canceled: boolean }>;
      restoreBackup: () => Promise<{ success: boolean; canceled: boolean }>;
    };
  }
}
