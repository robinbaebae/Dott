interface ElectronAPI {
  openMain: () => void;
  showNotification: (title: string, body: string) => void;
  onPetMessage: (callback: (message: string) => void) => void;
  sendChat: (message: string) => Promise<string>;
  onChatResponse: (cb: (msg: string) => void) => void;
  triggerAction: (action: string) => void;
  resizePetWindow: (w: number, h: number) => void;
  onDndPrompt: (cb: (meetingTitle: string) => void) => void;
  respondDnd: (accepted: boolean) => void;
  onDndEnd: (cb: () => void) => void;
  startDrag: () => void;
  dragMove: (x: number, y: number) => void;
  figmaCapture: (params: {
    bannerUrl: string;
    fileKey: string;
    outputMode: string;
  }) => Promise<{
    figmaUrl?: string;
    screenshotUrl?: string;
    error?: string;
  }>;
  contentStepNotification: (step: string, message: string) => void;
  getTokenUsage: () => Promise<unknown>;
  getNextMeeting: () => Promise<{ summary: string; time: string } | null>;
  readChromeBookmarks?: (profileName?: string) => Promise<{
    profiles?: { dirName: string; displayName: string }[];
    roots?: Record<string, unknown>;
    error?: string;
  }>;
  platform: string;
}

interface Window {
  electronAPI?: ElectronAPI;
}
