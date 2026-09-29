import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

function isNetworkOnline(state: Network.NetworkState): boolean {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

export function useNetworkStatus(): { isOnline: boolean | null } {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    let receivedListenerUpdate = false;
    void Network.getNetworkStateAsync()
      .then((state) => {
        if (active && !receivedListenerUpdate) {
          setIsOnline(isNetworkOnline(state));
        }
      })
      .catch(() => {
        if (active && !receivedListenerUpdate) {
          setIsOnline(null);
        }
      });

    const subscription = Network.addNetworkStateListener((state) => {
      receivedListenerUpdate = true;
      setIsOnline(isNetworkOnline(state));
    });

    return () => {
      active = false;
      subscription?.remove?.();
    };
  }, []);

  return { isOnline };
}
