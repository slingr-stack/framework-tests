import {
  BooleanCheckbox,
  defineDataModelDefaults,
} from '@drumr/framework-frontend';
import React from 'react';
import type {
  DeploymentChecks,
  ReviewChecks,
} from '../../../generated/gql/types';

defineDataModelDefaults<ReviewChecks>('ReviewChecks', {
  fields: {
    lintCode: {
      context: 'all',
      component: <BooleanCheckbox />,
    },
    testsCoverage: {
      context: 'all',
      component: <BooleanCheckbox />,
    },
    sampleAppImplementation: {
      context: 'all',
      component: <BooleanCheckbox />,
    },
  },
});

defineDataModelDefaults<DeploymentChecks>('DeploymentChecks', {
  fields: {
    stagingDeploy: {
      context: 'all',
      component: <BooleanCheckbox />,
    },
    productionDeploy: {
      context: 'all',
      component: <BooleanCheckbox />,
    },
    rollbackPlan: {
      context: 'all',
      component: <BooleanCheckbox />,
    },
  },
});
