import type { ProjectReport } from '@gql';
import { dataTable, TableView, toolbar } from '@drumr/framework-frontend';
import React from 'react';

export function ProjectReportTableView() {
  return (
    <TableView<ProjectReport>
      header={{
        title: 'Project Reports',
        subTitle: 'List of all project reports',
        breadcrumb: () => null,
        toolbar: {
          buttons: toolbar<ProjectReport>({ container: 'modal' }),
        },
      }}
      tableOptions={dataTable.options<ProjectReport>({
        model: 'ProjectReport',
        columns: [
          { field: 'title', title: 'Title' },
          { field: 'generatedAt', title: 'Generated At' },
          { field: 'project', title: 'Project' },
          { field: 'file', title: 'Report File' },
        ],
      })}
    />
  );
}

export default ProjectReportTableView;
