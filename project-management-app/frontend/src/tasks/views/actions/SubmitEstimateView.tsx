import { ActionView } from '@drumr/framework-frontend';
import React from 'react';

interface Props {
  id?: string;
  targetObject?: Record<string, unknown>;
}

export function SubmitEstimateView({ id, targetObject }: Props) {
  return (
    <ActionView
      action="SubmitEstimate"
      model="TaskEstimate"
      id={id}
      targetObject={targetObject}
    />
  );
}

export default SubmitEstimateView;
