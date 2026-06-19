import { Book } from '@gql';
import type { DataTableOptions } from '@drumr/framework-frontend';
import { openView, TableView, toolbar } from '@drumr/framework-frontend';
import React from 'react';

export function BookTableView() {
  const options: DataTableOptions<Book> = {
    model: 'Book',
    columns: [
      { field: 'title', title: 'Title', sorting: true, filtering: true },
    ],
    pagination: { pageSize: 10 },
    selection: { enabled: true, type: 'multiple' },
    rowToolbar: {
      buttons: toolbar<Book>({ container: 'modal' }),
    },
    tableToolbar: {
      buttons: toolbar<Book>({ actions: 'crud' }),
    },
    onRowClicked: (record: Book) => {
      console.log('Row clicked', record);
      openView('BookReadView', {
        params: { id: record.id },
      });
    },
  };

  return <TableView<Book> tableOptions={options} />;
}

export default BookTableView;
