import type { EstimationResult, Mutation } from '@gql/types';
import type { ActionResponse } from '@drumr/framework-frontend';
import {
  DataForm,
  getApp,
  toolbar,
  useDataForm,
  View,
} from '@drumr/framework-frontend';
import { Descriptions } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';

export function TaskEstimateView() {
  const [formKey, setFormKey] = useState(0);
  const dataFormHook = useDataForm({
    model: 'TaskEstimate',
    isNewObject: true,
  });

  const handleResult = useCallback(
    (
      response: ActionResponse<Pick<Mutation, 'TaskEstimateSubmitEstimate'>>,
    ) => {
      if (
        response.executed &&
        response.responseType === 'data' &&
        'data' in response &&
        response.data
      ) {
        const result = response.data
          .TaskEstimateSubmitEstimate as EstimationResult;
        getApp().modal.info({
          title: 'Estimate Review',
          width: 480,
          content: (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Decision">
                {result.approved ? 'Approved ✓' : 'Rejected ✗'}
              </Descriptions.Item>
              <Descriptions.Item label="Message">
                {result.message}
              </Descriptions.Item>
            </Descriptions>
          ),
        });
        // Reset form
        setFormKey((k) => k + 1);
      } else if (!response.executed && response.error) {
        getApp().modal.error({
          title: 'Action failed',
          content: response.error,
        });
      }
    },
    [],
  );

  const headerConfig = useMemo(
    () => ({
      title: 'Task Estimate',
      subTitle: 'Submit a task effort estimate for review',
      toolbar: {
        buttons: [
          toolbar.objectAction('SubmitEstimate', {
            elementId: 'submit-estimate',
            targetObject: dataFormHook.form.state.values as Record<string, any>,
            afterExecution: handleResult,
          }),
        ],
      },
    }),
    // Rebuild toolbar config when form resets or result handler changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleResult, formKey, dataFormHook.form.state.values],
  );

  return (
    <View header={headerConfig}>
      <DataForm
        key={formKey}
        model="TaskEstimate"
        dataFormHook={dataFormHook}
        isNewObject
      />
    </View>
  );
}

export default TaskEstimateView;
