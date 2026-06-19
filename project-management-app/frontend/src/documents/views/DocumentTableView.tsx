// 1. Import your custom Document type from your types/models directory
import { Document } from '@gql';
import { dataTable, TableView, toolbar } from '@drumr/framework-frontend';
import React from 'react';

export function DocumentTableView() {
  return (
    <TableView<Document>
      header={{
        title: 'Documents',
      }}
      tableOptions={dataTable.options<Document>({
        model: 'Document',
        columns: [
          { field: 'title', title: 'Title', sorting: true, filtering: true },
          { field: 'status', title: 'Status', sorting: true, filtering: true },
          {
            field: 'createdAt',
            title: 'Created At',
            sorting: true,
            filtering: true,
          },
        ],
        pagination: { pageSize: 10 },
        selection: { enabled: true, type: 'multiple' },
        rowToolbar: {
          buttons: [toolbar<Document>({ container: 'modal' })],
        },
        tableToolbar: {
          buttons: toolbar<Document>({ actions: 'crud' }),
        },
      })}
    />
  );
}

export default DocumentTableView;
