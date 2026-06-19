import { render, screen } from '@testing-library/react';
import React from 'react';

const mockMessageApi = {
  warning: jest.fn(),
  info: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
};

let capturedEditViewProps: Record<string, any> | undefined;

jest.mock('@drumr/framework-frontend', () => ({
  EditView: (props: Record<string, any>) => {
    capturedEditViewProps = props;
    return <div data-testid="edit-view">{props.children}</div>;
  },
  getApp: jest.fn(() => ({ message: mockMessageApi })),
}));

jest.mock('@umijs/max', () => ({
  useParams: () => ({ id: 'task-1' }),
}));

jest.mock('../../src/tasks/views/helpers/taskFormLayout', () => ({
  TaskFormLayout: () => (
    <div data-testid="task-form-layout">Task form layout</div>
  ),
  handleTaskRefresh: jest.fn(),
}));

import TaskEditView from '../../src/tasks/views/TaskEditView';

describe('TaskEditView integration', () => {
  beforeEach(() => {
    capturedEditViewProps = undefined;
    jest.clearAllMocks();
  });

  it('passes the route id to EditView and does not override onSaved', () => {
    render(<TaskEditView />);

    expect(capturedEditViewProps).toBeDefined();
    expect(capturedEditViewProps?.model).toBe('Task');
    expect(capturedEditViewProps?.id).toBe('task-1');
    expect(capturedEditViewProps?.onSaved).toBeUndefined();
  });

  it('blocks saving done tasks and shows the warning message', async () => {
    render(<TaskEditView />);

    const beforeSave = capturedEditViewProps?.beforeSave as
      | ((values: Record<string, unknown>) => Promise<boolean>)
      | undefined;

    expect(beforeSave).toBeDefined();

    const canSave = await beforeSave?.({
      status: 'done',
      title: 'Release candidate',
    });

    expect(canSave).toBe(false);
    expect(mockMessageApi.warning).toHaveBeenCalledWith(
      '"Release candidate" is done and cannot be edited. Reopen the task first.',
    );
    expect(mockMessageApi.info).not.toHaveBeenCalled();
  });

  it('allows saving active tasks and shows the progress message', async () => {
    render(<TaskEditView />);

    const beforeSave = capturedEditViewProps?.beforeSave as
      | ((values: Record<string, unknown>) => Promise<boolean>)
      | undefined;

    expect(beforeSave).toBeDefined();

    const canSave = await beforeSave?.({
      status: 'in_progress',
      title: 'Release candidate',
    });

    expect(canSave).toBe(true);
    expect(mockMessageApi.info).toHaveBeenCalledWith(
      'Saving "Release candidate"...',
    );
    expect(mockMessageApi.warning).not.toHaveBeenCalled();
  });

  it('forwards save errors through the app message API', () => {
    render(<TaskEditView />);

    const onError = capturedEditViewProps?.onError as
      | ((error: { message: string }) => void)
      | undefined;

    expect(onError).toBeDefined();

    onError?.({ message: 'Validation failed' });

    expect(mockMessageApi.error).toHaveBeenCalledWith(
      'Failed to save: Validation failed',
    );
  });

  it('renders the custom alert and task form layout inside EditView', () => {
    render(<TaskEditView />);

    expect(
      screen.getByText(/custom alert message for task editing/i),
    ).toBeTruthy();
    expect(screen.getByTestId('task-form-layout')).toBeTruthy();
    expect(screen.getByTestId('edit-view')).toBeTruthy();
  });
});
