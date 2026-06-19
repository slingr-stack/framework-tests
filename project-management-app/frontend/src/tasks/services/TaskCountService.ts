import { gql } from '@apollo/client';
import type { GraphQLClient } from '@drumr/framework-frontend';
import { getGraphQLClient } from '@drumr/framework-frontend';

const TASK_COUNT_QUERY = gql`
  query TaskCount {
    TaskFindBy(pageSize: 1) {
      __typename
      ... on TaskQueryResponse {
        pageInfo {
          totalCount
        }
      }
    }
  }
`;

export class TaskCountService {
  private readonly client: GraphQLClient;

  constructor() {
    this.client = getGraphQLClient();
  }

  async getTaskCount(): Promise<number | null> {
    try {
      const { data } = await this.client.query<any>({
        query: TASK_COUNT_QUERY,
        fetchPolicy: 'network-only',
      });

      if (data?.TaskFindBy?.__typename === 'TaskQueryResponse') {
        return data.TaskFindBy.pageInfo?.totalCount ?? null;
      }

      return null;
    } catch (error) {
      console.error('[TaskCountService] Error fetching task count:', error);
      return null;
    }
  }
}

let _taskCountService: TaskCountService | null = null;
export function getTaskCountService(): TaskCountService {
  if (!_taskCountService) {
    _taskCountService = new TaskCountService();
  }
  return _taskCountService;
}
