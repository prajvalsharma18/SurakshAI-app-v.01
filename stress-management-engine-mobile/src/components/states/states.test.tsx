import { fireEvent, render } from '@testing-library/react-native';

import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { OfflineState } from './OfflineState';

describe('shared request states', () => {
  it('renders safe error feedback and invokes explicit retry', async () => {
    const onRetry = jest.fn();
    const view = await render(
      <ErrorState
        message="The SURAKSHAI service is temporarily unavailable."
        onRetry={onRetry}
      />,
    );

    await fireEvent.press(view.getByLabelText('Try again'));

    expect(view.getByText('The SURAKSHAI service is temporarily unavailable.')).toBeTruthy();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the empty state and only shows offline feedback when disconnected', async () => {
    const view = await render(
      <>
        <EmptyState title="No alerts are available." />
        <OfflineState isOnline={false} />
      </>,
    );

    expect(view.getByText('No alerts are available.')).toBeTruthy();
    expect(view.getByText(/You.re offline/)).toBeTruthy();
    await view.rerender(<OfflineState isOnline={true} />);
    expect(view.queryByText(/You.re offline/)).toBeNull();
  });
});
