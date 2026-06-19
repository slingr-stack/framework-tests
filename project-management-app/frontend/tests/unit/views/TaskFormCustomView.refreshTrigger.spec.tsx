// Capture DataForm props so we can verify which refreshTrigger values the view
// passes. We mock the entire @drumr/framework-frontend module to keep the test
// lightweight — no TanStack form, no Apollo, no backend required.

let capturedDataFormProps: Record<string, unknown> | undefined;

jest.mock('@drumr/framework-frontend', () => ({
  DataForm: (props: Record<string, unknown>) => {
    capturedDataFormProps = props;
    return null;
  },
  DataField: () => null,
  View: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Toolbar: () => null,
  saveAction: jest.fn(() => ({})),
  cancelAction: jest.fn(() => ({})),
  closeView: jest.fn(),
  getApp: jest.fn(() => ({
    message: { success: jest.fn(), error: jest.fn() },
  })),
}));

jest.mock('@umijs/max', () => ({
  useParams: () => ({}),
}));

import { render } from '@testing-library/react';
import React from 'react';
import { TaskFormCustomView } from '../../../src/tasks/views/TaskFormCustomView';

describe('TaskFormCustomView - refreshTrigger wiring', () => {
  beforeEach(() => {
    capturedDataFormProps = undefined;
    jest.clearAllMocks();
  });

  it('passes refreshTrigger containing status, project, and isBillable to DataForm', () => {
    render(<TaskFormCustomView />);

    expect(capturedDataFormProps).toBeDefined();
    expect(capturedDataFormProps?.refreshTrigger).toEqual(
      expect.arrayContaining(['status', 'project', 'isBillable']),
    );
  });

  it('does not include fields outside the trigger list in refreshTrigger', () => {
    render(<TaskFormCustomView />);

    const trigger = capturedDataFormProps?.refreshTrigger as
      | string[]
      | undefined;
    expect(trigger).toBeDefined();
    // Fields that should NOT trigger a refresh on their own
    expect(trigger).not.toContain('title');
    expect(trigger).not.toContain('description');
    expect(trigger).not.toContain('estimatedHours');
  });
});
