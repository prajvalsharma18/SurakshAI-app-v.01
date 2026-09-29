import { NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

import { AuthProvider } from '../../auth/AuthContext';
import { ApiError } from '../../api/client';
import type { Session } from '../../auth/authTypes';
import * as modelTrainingService from '../../services/modelTrainingService';
import { RootNavigator } from '../../navigation/RootNavigator';
import type {
  ModelTrainingPlan,
  ModelVersionsResponse,
  TrainingJob,
} from '../../types/modelTraining';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const adminSession: Session = {
  accessToken: 'admin-console-test-token',
  tokenType: 'Bearer',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: { username: 'admin.user', role: 'ADMIN' },
};

const plan: ModelTrainingPlan = {
  plan_id: 'plan-fixture',
  status: 'AWAITING_CONFIRMATION',
  dataset_id: 'surakshai_phase4_synthetic_risk_dataset',
  feature_version: 'surakshai-phase4-feature-v1',
  model_family: 'xgboost',
  training_mode: 'candidate',
  candidate_model_version: 'surakshai-risk-v0.2-candidate',
  confirmation_required: true,
};

async function renderAdminConsole() {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(
    JSON.stringify(adminSession),
  );
  const view = await render(
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>,
  );
  await waitFor(() => expect(view.getByText('Model Training Console')).toBeTruthy());
  expect(view.queryByText('admin-console-test-token')).toBeNull();
  return view;
}

describe('admin model training navigation and chat', () => {
  const planSpy = jest.spyOn(modelTrainingService, 'createTrainingPlan');
  const confirmSpy = jest.spyOn(modelTrainingService, 'confirmTrainingPlan');
  const jobsSpy = jest.spyOn(modelTrainingService, 'getTrainingJobs');
  const versionsSpy = jest.spyOn(modelTrainingService, 'getModelVersions');
  const promoteSpy = jest.spyOn(modelTrainingService, 'promoteModel');

  beforeEach(() => {
    jest.mocked(SecureStore.getItemAsync).mockReset();
    planSpy.mockReset();
    confirmSpy.mockReset();
    jobsSpy.mockReset();
    versionsSpy.mockReset();
    promoteSpy.mockReset();
  });

  afterAll(() => {
    planSpy.mockRestore();
    confirmSpy.mockRestore();
    jobsSpy.mockRestore();
    versionsSpy.mockRestore();
    promoteSpy.mockRestore();
  });

  it('renders a plan before training and only creates a job after explicit confirmation', async () => {
    planSpy.mockResolvedValue(plan);
    confirmSpy.mockResolvedValue({
      job_id: 'job-fixture',
      requested_by: 'admin-fixture',
      model_version: plan.candidate_model_version,
      dataset_id: plan.dataset_id,
      feature_version: plan.feature_version,
      status: 'QUEUED',
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      metrics: null,
    });

    const view = await renderAdminConsole();
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Open training chat'));
    });
    await act(async () => fireEvent.changeText(
      view.getByLabelText('Training request'),
      'Train a new candidate risk model using the latest approved dataset.',
    ));
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Create training plan'));
    });

    expect(planSpy).toHaveBeenCalledWith(
      'Train a new candidate risk model using the latest approved dataset.',
    );
    expect(view.getByText('Training Plan')).toBeTruthy();
    expect(view.getByText(`Candidate Model: ${plan.candidate_model_version}`)).toBeTruthy();
    expect(view.getByText(/will not replace the current active model/)).toBeTruthy();
    expect(confirmSpy).not.toHaveBeenCalled();

    await act(async () => {
      await fireEvent.press(view.getByLabelText('Confirm candidate model training'));
    });

    expect(confirmSpy).toHaveBeenCalledWith(plan.plan_id);
    expect(view.getByText(/Training job submitted/)).toBeTruthy();
  });

  it('cancels a plan without creating a training job', async () => {
    planSpy.mockResolvedValue(plan);
    const view = await renderAdminConsole();
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Open training chat'));
    });
    await act(async () => fireEvent.changeText(
      view.getByLabelText('Training request'),
      'Create a candidate XGBoost model.',
    ));
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Create training plan'));
    });

    await act(async () => {
      await fireEvent.press(view.getByLabelText('Cancel training plan'));
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(view.queryByText('Training Plan')).toBeNull();
  });

  it('does not expose admin console links on the personnel route', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    const view = await render(
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>,
    );

    await waitFor(() => expect(view.getByText('Account Login')).toBeTruthy());
    expect(view.queryByText('Model Training Console')).toBeNull();
  });

  it('shows safe feedback when the backend rejects a plan', async () => {
    planSpy.mockRejectedValue(new ApiError('validation', 'private parser output', 422));
    const view = await renderAdminConsole();
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Open training chat'));
    });
    await act(async () => fireEvent.changeText(
      view.getByLabelText('Training request'),
      'Do something unsupported.',
    ));
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Create training plan'));
    });

    expect(await view.findByText('Please review the information and try again.')).toBeTruthy();
    expect(view.queryByText(/private parser output/)).toBeNull();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('does not log admin training content or authentication data', async () => {
    planSpy.mockResolvedValue(plan);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = await renderAdminConsole();
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Open training chat'));
    });
    await act(async () => fireEvent.changeText(
      view.getByLabelText('Training request'),
      'Train a new candidate model.',
    ));
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Create training plan'));
    });

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('clears the admin session on logout and returns to login', async () => {
    const view = await renderAdminConsole();
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Log out of admin console'));
    });

    expect(await view.findByText('Account Login')).toBeTruthy();
    expect(view.queryByText('Model Training Console')).toBeNull();
    expect(jest.mocked(SecureStore.deleteItemAsync)).toHaveBeenCalledTimes(1);
  });

  it('renders backend training job status and metrics', async () => {
    const job: TrainingJob = {
      job_id: 'job-visible',
      requested_by: 'admin-visible',
      model_version: 'surakshai-risk-v0.2-candidate',
      dataset_id: plan.dataset_id,
      feature_version: plan.feature_version,
      status: 'SUCCEEDED',
      created_at: '2026-09-29T10:00:00Z',
      started_at: '2026-09-29T10:01:00Z',
      completed_at: '2026-09-29T10:05:00Z',
      metrics: { accuracy: 0.75, macro_f1: 0.71 },
    };
    jobsSpy.mockResolvedValue([job]);
    const view = await renderAdminConsole();
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Open training jobs'));
    });

    expect(await view.findByText('SUCCEEDED')).toBeTruthy();
    expect(view.getByText('Job: job-visible')).toBeTruthy();
    expect(view.getByText('Requested By: admin-visible')).toBeTruthy();
    expect(view.getByText(/^Started:/)).toBeTruthy();
    expect(view.getByText('accuracy: 0.7500')).toBeTruthy();
    expect(view.getByText('macro_f1: 0.7100')).toBeTruthy();
  });

  it('shows the active model and requires confirmation before promoting a candidate', async () => {
    const active: ModelVersionsResponse = {
      active_model: {
        model_version: 'surakshai-risk-v0.1',
        feature_version: plan.feature_version,
        dataset_id: plan.dataset_id,
        trained_at: '2026-09-28T10:00:00Z',
        status: 'ACTIVE',
        metrics: { accuracy: 0.6 },
        promotion_allowed: false,
      },
      candidate_models: [{
        model_version: plan.candidate_model_version,
        feature_version: plan.feature_version,
        dataset_id: plan.dataset_id,
        trained_at: '2026-09-29T10:00:00Z',
        status: 'CANDIDATE',
        metrics: { accuracy: 0.7 },
        promotion_allowed: true,
      }],
    };
    const promoted: ModelVersionsResponse = {
      ...active,
      active_model: { ...active.candidate_models[0], status: 'ACTIVE', promotion_allowed: false },
      candidate_models: [],
    };
    versionsSpy.mockResolvedValue(active);
    promoteSpy.mockResolvedValue(promoted);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.text === 'Promote')?.onPress?.();
    });
    const view = await renderAdminConsole();
    await act(async () => {
      await fireEvent.press(view.getByLabelText('Open model versions'));
    });

    expect(await view.findByText(/surakshai-risk-v0.1/)).toBeTruthy();
    expect(view.getByText(new RegExp(plan.candidate_model_version))).toBeTruthy();
    expect(promoteSpy).not.toHaveBeenCalled();
    await act(async () => {
      await fireEvent.press(view.getByLabelText(`Promote model ${plan.candidate_model_version}`));
    });

    expect(alertSpy).toHaveBeenCalled();
    expect(promoteSpy).toHaveBeenCalledWith(plan.candidate_model_version);
    expect(await view.findByText(new RegExp(plan.candidate_model_version))).toBeTruthy();
    alertSpy.mockRestore();
  });
});
