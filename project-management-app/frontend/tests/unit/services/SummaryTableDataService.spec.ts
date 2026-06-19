const mockExecute = jest.fn();
let mockBuiltVariables: Record<string, unknown> | undefined;
let mockBuiltFields: Record<string, unknown> | undefined;

jest.mock('@drumr/framework-frontend', () => {
  const build = jest.fn(() => ({
    kind: 'mock-operation',
    variables: mockBuiltVariables,
    fields: mockBuiltFields,
  }));
  const variables = jest.fn((value: Record<string, unknown>) => {
    mockBuiltVariables = value;
    return { build };
  });
  const fields = jest.fn((value: Record<string, unknown>) => {
    mockBuiltFields = value;
    return { variables };
  });

  return {
    getGraphQLClient: jest.fn(() => ({
      execute: mockExecute,
    })),
    uiAction: jest.fn(() => ({
      fields,
    })),
  };
});

import { SummaryTableDataService } from '../../../src/dashboard/services/SummaryTableDataService';

function buildSummaryResponse(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    projects: { value: [] },
    tasks: { value: [] },
    users: { value: [] },
    manager: { value: null },
    taskPaginationInfo: {
      value: {
        page: { value: 1 },
        pageSize: { value: 10 },
        totalPages: { value: 1 },
        totalCount: { value: 0 },
        hasNextPage: { value: false },
        hasPreviousPage: { value: false },
      },
    },
    ...overrides,
  };
}

describe('SummaryTableDataService', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockBuiltVariables = undefined;
    mockBuiltFields = undefined;
  });

  it('throws an explicit error when the action returns no payload', async () => {
    const service = new SummaryTableDataService();
    mockExecute.mockResolvedValueOnce(undefined);

    await expect(service.getData({}, true)).rejects.toThrow(
      'GetSummaryTableData returned no payload',
    );
  });

  it('returns valid data when the selected project has no manager', async () => {
    const service = new SummaryTableDataService();
    mockExecute.mockResolvedValueOnce(
      buildSummaryResponse({
        projects: { value: [{ id: { value: 'p-1' } }] },
      }),
    );

    const result = await service.getData({}, true);

    expect(result.projects).toEqual({ value: [{ id: { value: 'p-1' } }] });
    expect(result.tasks).toEqual({ value: [] });
    expect(result.users).toEqual({ value: [] });
    expect(result.manager).toBeNull();
    expect(result.taskPaginationInfo).toEqual({
      page: 1,
      pageSize: 10,
      totalPages: 1,
      totalCount: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('falls back to task count when pagination info is missing', async () => {
    const service = new SummaryTableDataService();
    mockExecute.mockResolvedValueOnce(
      buildSummaryResponse({
        tasks: {
          value: [{ id: { value: 't-1' } }, { id: { value: 't-2' } }],
        },
        taskPaginationInfo: undefined,
      }),
    );

    const result = await service.getData({}, true);

    expect(result.taskPaginationInfo).toEqual({
      page: 1,
      pageSize: 2,
      totalPages: 1,
      totalCount: 2,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('strips unsupported ui-only context properties before sending GraphQL variables', async () => {
    const service = new SummaryTableDataService();
    mockExecute.mockResolvedValueOnce(buildSummaryResponse());

    await service.getData({}, true, {
      mode: 'read',
      usage: 'table',
      changedFields: ['status'],
      action: {
        target: 'global',
        actionName: 'GetSummaryTableData',
      },
    } as any);

    expect(mockBuiltVariables).toEqual(
      expect.objectContaining({
        context: {
          changedFields: ['status'],
          action: {
            target: 'global',
            actionName: 'GetSummaryTableData',
          },
        },
      }),
    );
    expect(
      (mockBuiltVariables?.context as Record<string, unknown>)?.mode,
    ).toBeUndefined();
    expect(
      (mockBuiltVariables?.context as Record<string, unknown>)?.usage,
    ).toBeUndefined();
  });

  it('requests display labels for summary reference columns', async () => {
    const service = new SummaryTableDataService();
    mockExecute.mockResolvedValueOnce(buildSummaryResponse());

    await service.getData({}, true);

    expect(mockBuiltFields).toEqual(
      expect.objectContaining({
        projects: expect.objectContaining({
          manager: expect.objectContaining({
            _displayValue: true,
            fullName: true,
            email: true,
          }),
        }),
        tasks: expect.objectContaining({
          project: expect.objectContaining({
            _displayValue: true,
            name: true,
          }),
          assignee: expect.objectContaining({
            _displayValue: true,
            fullName: true,
            email: true,
          }),
        }),
      }),
    );
  });
});
