import { act, render, waitFor } from '@testing-library/react-native';
import * as Network from 'expo-network';
import { Text } from 'react-native';

import { useNetworkStatus } from './useNetworkStatus';

jest.mock('expo-network', () => ({
  NetworkStateType: { NONE: 0, WIFI: 2 },
  getNetworkStateAsync: jest.fn(),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

function NetworkStatusText() {
  const { isOnline } = useNetworkStatus();
  return <Text>{isOnline === null ? 'unknown' : isOnline ? 'online' : 'offline'}</Text>;
}

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.mocked(Network.getNetworkStateAsync).mockReset();
    jest.mocked(Network.addNetworkStateListener).mockClear();
    jest.mocked(Network.addNetworkStateListener).mockImplementation(() => ({
      remove: jest.fn(),
    }));
  });

  it('reports the initial connection and listens for changes', async () => {
    jest.mocked(Network.getNetworkStateAsync).mockResolvedValue({
      type: Network.NetworkStateType.WIFI,
      isConnected: true,
      isInternetReachable: true,
    });
    const view = await render(<NetworkStatusText />);

    await waitFor(() => expect(view.getByText('online')).toBeTruthy());

    const listener = jest.mocked(Network.addNetworkStateListener).mock.calls[0]?.[0];
    expect(listener).toBeDefined();
    await act(async () => {
      listener?.({
        type: Network.NetworkStateType.NONE,
        isConnected: false,
        isInternetReachable: false,
      });
    });

    await waitFor(() => expect(view.getByText('offline')).toBeTruthy());
  });

  it('keeps connectivity unknown when the platform check fails', async () => {
    jest.mocked(Network.getNetworkStateAsync).mockRejectedValue(new Error('platform failure'));
    const view = await render(<NetworkStatusText />);

    expect(view.getByText('unknown')).toBeTruthy();
    await act(async () => {
      await Promise.resolve();
    });
    expect(view.getByText('unknown')).toBeTruthy();
  });
});
