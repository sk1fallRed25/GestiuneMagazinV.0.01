import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isReconnecting: boolean;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  useEffect(() => {
    let reconnectTimeout: any;

    const handleOnline = () => {
      setIsReconnecting(true);
      reconnectTimeout = setTimeout(() => {
        setIsOnline(true);
        setIsReconnecting(false);
      }, 1000); // 1s simulation/check buffer for stable reconnection
    };

    const handleOffline = () => {
      clearTimeout(reconnectTimeout);
      setIsOnline(false);
      setIsReconnecting(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync initial state
    setIsOnline(navigator.onLine);

    return () => {
      clearTimeout(reconnectTimeout);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isReconnecting };
};
