import { fireEvent, render, screen } from '@testing-library/react';

const mockCloseView = jest.fn();

jest.mock('@drumr/framework-frontend', () => ({
  closeView: (...args: any[]) => mockCloseView(...args),
}));

import { renderFormFooterButtons } from '../../../src/shared/components/formFooterHelpers';

/**
 * Reference unit spec for UI helpers:
 * verifies callback wiring and guard behavior without rendering full form views.
 */

describe('renderFormFooterButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders submit label and calls form submit on primary button click', () => {
    // Arrange:
    // Render only footer buttons with a controlled form instance.
    const submitMock = jest.fn();

    render(
      renderFormFooterButtons({
        getFormInstance: () => ({ submit: submitMock }) as any,
        submitLabel: 'Save Task',
      }),
    );

    // Act:
    // Simulate primary-action click.
    fireEvent.click(screen.getByText('Save Task'));

    // Assert:
    // Footer delegates submit to the provided form instance.
    expect(submitMock).toHaveBeenCalledTimes(1);
  });

  it('calls closeView when cancel is clicked', () => {
    // Arrange:
    // Render footer with cancel button available.
    render(
      renderFormFooterButtons({
        getFormInstance: () => null,
        submitLabel: 'Submit',
      }),
    );

    // Act
    fireEvent.click(screen.getByText('Cancel'));

    // Assert:
    // Cancel action delegates to framework closeView with cancelled=true.
    expect(mockCloseView).toHaveBeenCalledWith({ cancelled: true });
  });

  it('logs an error when submit is clicked and form instance is missing', () => {
    // Arrange:
    // Provide null form instance and spy on console error diagnostics.
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    render(
      renderFormFooterButtons({
        getFormInstance: () => null,
        submitLabel: 'Submit',
      }),
    );

    // Act
    fireEvent.click(screen.getByText('Submit'));

    // Assert:
    // Missing instance guard prevents crash and reports actionable error.
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[FormFooterButtons] formInstance is null, cannot submit',
    );

    consoleErrorSpy.mockRestore();
  });
});
