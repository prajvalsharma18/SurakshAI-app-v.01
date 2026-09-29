import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AxiosHeaders, type AxiosResponse } from 'axios';

import { ApiError, apiClient } from '../../api/client';
import { WellnessScreen } from './WellnessScreen';

jest.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isOnline: true }),
}));

jest.mock('@react-navigation/native', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback]),
    useNavigation: () => ({ goBack: jest.fn() }),
  };
});

const getSpy = jest.spyOn(apiClient, 'get');
const postSpy = jest.spyOn(apiClient, 'post');
const assessmentDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

function axiosResponse<T>(data: T): AxiosResponse<T> {
  const headers = new AxiosHeaders();
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers,
    config: { headers },
  };
}

function assessment(date = assessmentDate) {
  return {
    assessment_id: 'assessment-test',
    personnel_id: 'personnel-test',
    assessment_date: date,
    submitted_at: '2026-09-28T08:00:00Z',
    sleep_quality: 3,
    fatigue_level: 3,
    perceived_stress: 3,
    mood_wellbeing: 4,
  };
}

async function renderWellnessScreen() {
  const view = await render(<WellnessScreen />);
  await waitFor(() => expect(getSpy).toHaveBeenCalledTimes(1));
  return view;
}

async function fillValidForm(view: Awaited<ReturnType<typeof renderWellnessScreen>>) {
  await fireEvent.changeText(view.getByLabelText('Wellness assessment date'), assessmentDate);
  for (const label of ['Sleep quality', 'Fatigue level', 'Perceived stress', 'Mood and wellbeing']) {
    await fireEvent.press(view.getByLabelText(`${label} option 3`));
  }
}

describe('WellnessScreen submission', () => {
  beforeEach(() => {
    apiClient.defaults.baseURL = 'https://surakshai.test';
    getSpy.mockReset().mockResolvedValue(axiosResponse({ assessments: [] }));
    postSpy.mockReset();
  });

  afterAll(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
  });

  it('sends one POST for a valid check-in and disables submit while it is in flight', async () => {
    let resolvePost: ((value: AxiosResponse<unknown>) => void) | undefined;
    postSpy.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );
    getSpy
      .mockResolvedValueOnce(axiosResponse({ assessments: [] }))
      .mockResolvedValueOnce(axiosResponse({ assessments: [assessment()] }));

    const view = await renderWellnessScreen();
    await fillValidForm(view);
    const submit = view.getByLabelText('Submit wellness check-in');

    await fireEvent.press(submit);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith('/personnel/me/wellness', {
      assessment_date: assessmentDate,
      sleep_quality: 3,
      fatigue_level: 3,
      perceived_stress: 3,
      mood_wellbeing: 3,
    });
    expect(view.getByLabelText('Submit wellness check-in').props.accessibilityState).toMatchObject({
      disabled: true,
      busy: true,
    });
    await fireEvent.press(view.getByLabelText('Submit wellness check-in'));
    expect(postSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePost?.(axiosResponse(assessment()));
    });
    await waitFor(() => expect(view.getByText('Your wellness check-in was submitted and confirmed.')).toBeTruthy());
    expect(postSpy).toHaveBeenCalledTimes(1);
  });

  it('blocks a date already present in the loaded assessment list', async () => {
    getSpy.mockResolvedValue(axiosResponse({ assessments: [assessment()] }));

    const view = await renderWellnessScreen();

    expect(await view.findByText('A wellness assessment already exists for this date.')).toBeTruthy();
    expect(view.getByLabelText('Submit wellness check-in').props.accessibilityState.disabled).toBe(true);
    expect(postSpy).not.toHaveBeenCalled();

    await fireEvent.changeText(view.getByLabelText('Wellness assessment date'), '2026-09-27');
    await waitFor(() => expect(view.queryByText('A wellness assessment already exists for this date.')).toBeNull());
    expect(view.getByLabelText('Submit wellness check-in').props.accessibilityState.disabled).toBe(false);
  });

  it('shows a specific message if the backend reports a date conflict', async () => {
    postSpy.mockRejectedValue(new ApiError('conflict', 'The backend returned HTTP 409.', 409));
    const view = await renderWellnessScreen();
    await fillValidForm(view);

    await fireEvent.press(view.getByLabelText('Submit wellness check-in'));

    expect(await view.findByText('A wellness assessment already exists for this date.')).toBeTruthy();
    expect(postSpy).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new ApiError('unauthorized', 'HTTP 401', 401), 'Your session has expired. Please sign in again.'],
    [new ApiError('forbidden', 'HTTP 403', 403), 'Wellness data could not be submitted with the current consent settings.'],
  ])('keeps authentication and consent errors distinct', async (error, message) => {
    postSpy.mockRejectedValue(error);
    const view = await renderWellnessScreen();
    await fillValidForm(view);

    await fireEvent.press(view.getByLabelText('Submit wellness check-in'));

    expect(await view.findByText(message)).toBeTruthy();
    expect(postSpy).toHaveBeenCalledTimes(1);
  });
});
