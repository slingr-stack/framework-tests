import {
  Box,
  Button,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  DataComponent,
  type DataTableLoadResult,
  useDataTable,
} from '@drumr/framework-frontend';
import React, { useMemo } from 'react';

type SummaryUsersMaterialTableProps = {
  loadData: () => Promise<DataTableLoadResult>;
  refreshData: () => Promise<DataTableLoadResult>;
};

type StandaloneDataComponentOptions = {
  value?: unknown;
  options?: Record<string, unknown>;
  errors?: Array<{ message: string; type?: string }>;
};

const SUMMARY_USER_COLUMNS = [
  { field: 'fullName', title: 'Full Name' },
  { field: 'email', title: 'Email' },
  { field: 'roles', title: 'Roles' },
  { field: 'status', title: 'Status' },
] as const;

const SUMMARY_USER_FIELDS = ['fullName', 'email', 'roles', 'status'] as const;

type SummaryUserField = (typeof SUMMARY_USER_FIELDS)[number];

function getFieldOptions(
  value: unknown,
): StandaloneDataComponentOptions | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as StandaloneDataComponentOptions;
}

export function SummaryUsersMaterialTable({
  loadData,
  refreshData,
}: SummaryUsersMaterialTableProps): React.ReactElement {
  const columns = useMemo(() => [...SUMMARY_USER_COLUMNS], []);

  const controller = useDataTable<Record<string, unknown>, 'User'>({
    model: 'User',
    columns,
    pagination: { enabled: false },
    loadData: async () => loadData(),
    refresh: async () => refreshData(),
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          onClick={controller.refresh}
          disabled={controller.loading}
        >
          {controller.loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {controller.loading ? <LinearProgress sx={{ mb: 2 }} /> : null}

      {controller.error ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {controller.error.message}
        </Typography>
      ) : null}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {SUMMARY_USER_COLUMNS.map((column) => (
                <TableCell key={column.field}>{column.title}</TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {controller.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={SUMMARY_USER_COLUMNS.length}>
                  <Typography color="text.secondary">
                    No team members found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              controller.rows.map((record) => {
                const uiRecord = controller.getUiRecord(record);

                return (
                  <TableRow key={controller.getRowKey(record)} hover>
                    {SUMMARY_USER_FIELDS.map((fieldName) => (
                      <TableCell key={fieldName}>
                        <DataComponent
                          modelName="User"
                          options={getFieldOptions(
                            uiRecord?.[fieldName as SummaryUserField],
                          )}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default SummaryUsersMaterialTable;
