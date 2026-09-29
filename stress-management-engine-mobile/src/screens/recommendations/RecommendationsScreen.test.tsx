import { NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { ApiError } from '../../api/client';
import { AuthProvider } from '../../auth/AuthContext';
import type { Session } from '../../auth/authTypes';
import { MainNavigator } from '../../navigation/MainNavigator';
import type { WelfareRecommendations } from '../../types/recommendation';
import * as recommendationService from '../../services/recommendationService';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const session: Session = {
  accessToken: 'recommendations-test-token',
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: {
    username: 'sample.personnel',
    role: 'PERSONNEL',
    personnelId: 'personnel-test',
  },
};

const recommendations: WelfareRecommendations = {
  personnelId: 'personnel-test',
  referenceDate: '2026-09-29',
  riskCategory: 'ELEVATED',
  modelVersion: 'test-model-version',
  dataMode: 'OPERATIONAL_ONLY',
  recommendations: [
    {
      category: 'RECOVERY',
      action: 'Consider discussing a recovery break with the welfare team.',
      priority: 'MEDIUM',
      rationale: 'The backend identified recovery as a relevant support area.',
      sources: ['test-guidance.md::section-1'],
    },
  ],
};

async function renderAuthenticatedHome() {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(
    JSON.stringify(session),
  );
  const view = await render(
    <AuthProvider>
      <NavigationContainer>
        <MainNavigator />
      </NavigationContainer>
    </AuthProvider>,
  );
  await waitFor(() =>
    expect(view.getByText('Hello, sample.personnel')).toBeTruthy(),
  );
  return view;
}

async function openRecommendations(
  view: Awaited<ReturnType<typeof renderAuthenticatedHome>>,
) {
  await act(async () => {
    await fireEvent.press(
      view.getByLabelText(
        'Recommendations. Personalized welfare guidance from the support system.',
      ),
    );
  });
}

describe('RecommendationsScreen', () => {
  const getRecommendations = jest.spyOn(
    recommendationService,
    'getWelfareRecommendations',
  );

  beforeEach(() => {
    jest.mocked(SecureStore.getItemAsync).mockReset();
    getRecommendations.mockReset();
  });

  afterAll(() => {
    getRecommendations.mockRestore();
  });

  it('shows loading while the backend recommendation request is pending', async () => {
    let resolveRequest:
      | ((value: WelfareRecommendations) => void)
      | undefined;
    getRecommendations.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const view = await renderAuthenticatedHome();
    await openRecommendations(view);

    expect(view.getByText('Loading welfare recommendations...')).toBeTruthy();
    expect(getRecommendations).toHaveBeenCalledTimes(1);
    expect(getRecommendations).toHaveBeenCalledWith('personnel-test');

    await act(async () => {
      resolveRequest?.(recommendations);
    });
    await waitFor(() =>
      expect(
        view.getByText('Consider discussing a recovery break with the welfare team.'),
      ).toBeTruthy(),
    );
  });

  it('renders backend recommendations and source references', async () => {
    getRecommendations.mockResolvedValue(recommendations);

    const view = await renderAuthenticatedHome();
    await openRecommendations(view);

    expect(await view.findByText('Welfare Recommendations')).toBeTruthy();
    expect(
      view.getByText('Consider discussing a recovery break with the welfare team.'),
    ).toBeTruthy();
    expect(
      view.getByText('The backend identified recovery as a relevant support area.'),
    ).toBeTruthy();
    expect(view.getByText('Priority: MEDIUM')).toBeTruthy();
    expect(view.getByText('Supporting source/reference')).toBeTruthy();
    expect(view.getByText('test-guidance.md::section-1')).toBeTruthy();
    expect(view.getByText(/Data mode: OPERATIONAL_ONLY/)).toBeTruthy();
    expect(view.getByText(/not a medical diagnosis or a guaranteed outcome/)).toBeTruthy();
  });

  it('shows an empty state when the backend returns no recommendations', async () => {
    getRecommendations.mockResolvedValue({
      ...recommendations,
      recommendations: [],
    });

    const view = await renderAuthenticatedHome();
    await openRecommendations(view);

    expect(
      await view.findByText('No welfare recommendations are available right now.'),
    ).toBeTruthy();
    expect(view.queryByText('Supporting source/reference')).toBeNull();
  });

  it.each([
    [
      new ApiError('unauthorized', 'private auth detail', 401),
      'Your session has expired. Please sign in again.',
    ],
    [
      new ApiError('forbidden', 'private response detail', 403),
      'Recommendations are not available for this account.',
    ],
    [
      new ApiError('server', 'private provider detail', 503),
      'Recommendations are temporarily unavailable.',
    ],
  ])('shows a safe message for backend error %s', async (error, message) => {
    getRecommendations.mockRejectedValue(error);

    const view = await renderAuthenticatedHome();
    await openRecommendations(view);

    expect(await view.findByText(message)).toBeTruthy();
    expect(view.queryByText(/private|provider|stack|database/i)).toBeNull();
  });

  it('refreshes from the backend after leaving and revisiting the screen', async () => {
    getRecommendations
      .mockResolvedValueOnce(recommendations)
      .mockResolvedValueOnce(recommendations);

    const view = await renderAuthenticatedHome();
    await openRecommendations(view);
    await waitFor(() =>
      expect(
        view.getByText('Consider discussing a recovery break with the welfare team.'),
      ).toBeTruthy(),
    );

    await act(async () => {
      await fireEvent.press(
        view.getByLabelText('Go back from Welfare Recommendations'),
      );
    });
    await openRecommendations(view);

    await waitFor(() => expect(getRecommendations).toHaveBeenCalledTimes(2));
  });

  it('does not log recommendation content', async () => {
    getRecommendations.mockResolvedValue(recommendations);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const view = await renderAuthenticatedHome();
    await openRecommendations(view);
    await view.findByText(
      'Consider discussing a recovery break with the welfare team.',
    );

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
