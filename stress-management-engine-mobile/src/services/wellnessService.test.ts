import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { apiClient } from '../api/client';
import { parseWellnessAssessment, submitWellnessAssessment } from './wellnessService';

function wellnessResponse(rating: unknown) {
  return {
    assessment_id: 'assessment-test',
    personnel_id: 'personnel-test',
    assessment_date: '2026-09-29',
    submitted_at: '2026-09-29T08:00:00Z',
    sleep_quality: rating,
    fatigue_level: rating,
    perceived_stress: rating,
    mood_wellbeing: rating,
  };
}

describe('parseWellnessAssessment rating validation', () => {
  it.each([1, 2, 3, 4, 5])('accepts rating %i', (rating) => {
    expect(parseWellnessAssessment(wellnessResponse(rating))).toMatchObject({
      sleepQuality: rating,
      fatigueLevel: rating,
      perceivedStress: rating,
      moodWellbeing: rating,
    });
  });

  it.each([
    ['zero', 0],
    ['six', 6],
    ['negative', -1],
    ['decimal', 2.5],
    ['string', '3'],
    ['null', null],
    ['boolean', true],
  ])('rejects %s ratings', (_label, rating) => {
    expect(() => parseWellnessAssessment(wellnessResponse(rating))).toThrow(
      expect.objectContaining({ kind: 'response' }),
    );
  });
});

describe('wellness submission HTTP error normalization', () => {
  const postSpy = jest.spyOn(apiClient, 'post');

  beforeEach(() => {
    apiClient.defaults.baseURL = 'https://surakshai.test';
    postSpy.mockReset();
  });

  afterAll(() => {
    postSpy.mockRestore();
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [409, 'conflict'],
  ] as const)('preserves the distinct kind for HTTP %i', async (status, kind) => {
    const headers = new AxiosHeaders();
    const config = { headers } as InternalAxiosRequestConfig;
    const response: AxiosResponse = {
      config,
      data: { error: 'private backend detail' },
      headers,
      status,
      statusText: 'Error',
    };
    postSpy.mockRejectedValue(new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response));

    await expect(submitWellnessAssessment({
      assessment_date: '2026-09-28',
      sleep_quality: 3,
      fatigue_level: 3,
      perceived_stress: 3,
      mood_wellbeing: 4,
    })).rejects.toMatchObject({ kind, statusCode: status });
  });
});
