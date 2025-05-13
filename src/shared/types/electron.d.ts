declare interface Window {
  electron: {
    invoke: (channel: string, data?: any) => Promise<any>;
    send: (channel: string, data?: any) => void;
    on: (channel: string, func: (...args: any[]) => void) => void;
    removeAllListeners: (channel: string) => void;
  };
} 