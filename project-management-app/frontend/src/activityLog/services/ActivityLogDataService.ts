import type { GetActivityLogResult } from '@gql';
import {
  dataAction,
  getGraphQLClient,
  OperationError,
} from '@drumr/framework-frontend';

export type ActivityLogData = {
  count: number;
  entries: string[];
};

export type ActivityLogServiceResult = {
  data: ActivityLogData | null;
  error: string | null;
};

const GET_ACTIVITY_LOG_OPERATION =
  dataAction<GetActivityLogResult>('GetActivityLog').build();

export class ActivityLogDataService {
  private readonly gql: ReturnType<typeof getGraphQLClient>;

  constructor() {
    this.gql = getGraphQLClient();
  }

  private getErrorMessage(
    result: GetActivityLogResult | null | undefined,
  ): string {
    if (!result || result.__typename === 'ActivityLogResult') {
      return 'Unknown error';
    }

    const maybeWithMessage = result as {
      message?: string;
      errorMessage?: string;
    };
    if (maybeWithMessage.message) {
      return maybeWithMessage.message;
    }
    if (maybeWithMessage.errorMessage) {
      return maybeWithMessage.errorMessage;
    }

    if (result.__typename === 'ValidationErrorType' && result.errors?.length) {
      return result.errors[0]?.message ?? 'Validation error';
    }

    return 'Unknown error';
  }

  async getActivityLog(): Promise<ActivityLogServiceResult> {
    try {
      const result = await this.gql.execute(GET_ACTIVITY_LOG_OPERATION);

      if (result?.__typename === 'ActivityLogResult') {
        const rawEntries = result.entries ?? '';
        const entries =
          rawEntries === '(no entries yet)'
            ? []
            : rawEntries.split('\n').filter(Boolean);
        return {
          data: {
            count: result.count ?? 0,
            entries,
          },
          error: null,
        };
      }

      return {
        data: null,
        error: this.getErrorMessage(result),
      };
    } catch (error: unknown) {
      if (error instanceof OperationError) {
        const errorInfo = error.errorInfo as {
          message?: string;
          errorMessage?: string;
        };
        return {
          data: null,
          error:
            errorInfo.message ?? errorInfo.errorMessage ?? 'Request failed',
        };
      }

      if (error instanceof Error) {
        return {
          data: null,
          error: error.message,
        };
      }

      return {
        data: null,
        error: 'Request failed',
      };
    }
  }
}
let _activityLogDataService: ActivityLogDataService | null = null;
export function getActivityLogDataService(): ActivityLogDataService {
  if (!_activityLogDataService) {
    _activityLogDataService = new ActivityLogDataService();
  }
  return _activityLogDataService;
}
