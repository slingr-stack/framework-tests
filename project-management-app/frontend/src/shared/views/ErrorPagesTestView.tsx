import { gql } from '@apollo/client';
import {
  ErrorBoundary,
  GlobalActionButton,
  InternalErrorPage,
  MaintenancePage,
  NotFoundPage,
  PermissionDeniedPage,
  View,
} from '@drumr/framework-frontend';
import { Alert, Button, Card, Divider, Space, Typography } from 'antd';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

/**
 * Component that intentionally throws an error to test ErrorBoundary
 */
const ErrorThrower: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('This is a test error thrown for ErrorBoundary testing');
  }
  return <Text type="success">No error thrown</Text>;
};

/**
 * Main test component
 */
const ErrorPagesTest: React.FC = () => {
  const [showNotFound, setShowNotFound] = useState(false);
  const [showPermissionDenied, setShowPermissionDenied] = useState(false);
  const [showInternalError, setShowInternalError] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [throwError, setThrowError] = useState(false);
  const navigate = useNavigate();

  const handleNavigateTo404 = () => {
    // Navigate to a non-existent route to trigger 404
    navigate('/this-route-does-not-exist');
  };

  const handleShowNotFound = () => {
    setShowNotFound(true);
  };

  const handleShowPermissionDenied = () => {
    setShowPermissionDenied(true);
  };

  const handleShowInternalError = () => {
    setShowInternalError(true);
  };

  const handleShowMaintenance = () => {
    setShowMaintenance(true);
  };

  const handleThrowError = () => {
    setThrowError(true);
  };

  const handleReset = () => {
    setShowNotFound(false);
    setShowPermissionDenied(false);
    setShowInternalError(false);
    setShowMaintenance(false);
    setThrowError(false);
  };

  // Show error page if state is set
  if (showNotFound) {
    return <NotFoundPage />;
  }

  if (showPermissionDenied) {
    return <PermissionDeniedPage />;
  }

  if (showInternalError) {
    return (
      <InternalErrorPage
        error={new Error('Test internal error')}
        resetError={handleReset}
      />
    );
  }

  if (showMaintenance) {
    return (
      <MaintenancePage
        estimatedTime="2 hours"
        message="Testing maintenance mode"
      />
    );
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Card title="Error Pages Testing" bordered={false}>
        <Paragraph>
          This page allows you to test all the error pages in the application.
          Click any button below to see the corresponding error page.
        </Paragraph>
      </Card>

      <Card title="404 - Not Found" bordered={false}>
        <Space orientation="vertical">
          <Paragraph>
            Test the 404 Not Found page that appears when a route doesn't exist.
          </Paragraph>
          <Space>
            <Button type="primary" onClick={handleNavigateTo404}>
              Navigate to Non-existent Route
            </Button>
            <Button onClick={handleShowNotFound}>Show 404 Page Inline</Button>
          </Space>
        </Space>
      </Card>

      <Card title="403 - Permission Denied (Real Test)" bordered={false}>
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Paragraph>
            Test permission denied by trying to execute an action you don't have
            permission for.
            <strong>
              {' '}
              This only works if you're logged in as a Developer role.
            </strong>
          </Paragraph>
          <Alert
            message="Developer Role Test"
            description="If you're logged in as a Developer, clicking this button will automatically redirect you to the Permission Denied page because Developers don't have permission to view dashboard statistics."
            type="info"
            showIcon
          />
          <GlobalActionButton
            operation={gql`
              query GetDashboardSummary($params: DashboardFiltersInput!) {
                GetDashboardSummary(params: $params) {
                  ... on CannotExecuteErrorType {
                    code
                    message
                  }
                  ... on DashboardSummaryResultType {
                    projectsActive
                    projectsCompleted
                    projectsCritical
                    projectsOnHold
                    projectsTotal
                    tasksBlocked
                    tasksCompleted
                    tasksHighPriorityPending
                    tasksInProgress
                    tasksInReview
                    tasksOverdue
                    tasksPending
                    tasksTotal
                    totalActiveBudget
                    totalUsers
                  }
                  ... on NotFoundErrorType {
                    code
                    message
                  }
                  ... on PermissionErrorType {
                    code
                    message
                  }
                  ... on ValidationErrorType {
                    code
                    errors {
                      constraint
                      field
                      message
                    }
                    message
                  }
                }
              }
            `}
            label="Execute Restricted Action (Get Dashboard Summary)"
            style="primary"
            confirmationModal={false}
          />
        </Space>
      </Card>

      <Card title="403 - Permission Denied (Manual)" bordered={false}>
        <Space orientation="vertical">
          <Paragraph>
            Show the Permission Denied page manually (not based on actual
            permissions).
          </Paragraph>
          <Button type="primary" onClick={handleShowPermissionDenied}>
            Show Permission Denied Page
          </Button>
        </Space>
      </Card>

      <Card title="500 - Internal Server Error" bordered={false}>
        <Space orientation="vertical">
          <Paragraph>
            Test the 500 Internal Server Error page that appears when an
            unexpected error occurs on the server or in the application.
          </Paragraph>
          <Button type="primary" danger onClick={handleShowInternalError}>
            Show Internal Error Page
          </Button>
        </Space>
      </Card>

      <Card title="503 - Under Maintenance" bordered={false}>
        <Space orientation="vertical">
          <Paragraph>
            Test the Maintenance page that appears when the application is
            undergoing scheduled maintenance.
          </Paragraph>
          <Button type="primary" onClick={handleShowMaintenance}>
            Show Maintenance Page
          </Button>
        </Space>
      </Card>

      <Card title="Error Boundary Test" bordered={false}>
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Paragraph>
            Test the ErrorBoundary component that catches rendering errors in
            React components and displays the Internal Error page.
          </Paragraph>
          <Button type="primary" danger onClick={handleThrowError}>
            Throw Error (Tests ErrorBoundary)
          </Button>
          <Divider />
          <ErrorBoundary>
            <Card size="small" style={{ backgroundColor: '#f0f2f5' }}>
              <ErrorThrower shouldThrow={throwError} />
            </Card>
          </ErrorBoundary>
          {throwError && (
            <Button onClick={handleReset}>Reset Error State</Button>
          )}
        </Space>
      </Card>

      <Card title="How to Use" bordered={false} type="inner">
        <Title level={5}>In Your Application:</Title>
        <Paragraph>
          <ul>
            <li>
              <Text strong>404 Not Found:</Text> Automatically shown when
              navigating to a non-existent route
            </li>
            <li>
              <Text strong>403 Permission Denied (Automatic):</Text> The
              framework automatically detects permission errors and redirects to
              /permission-denied when:
              <ul>
                <li>
                  User tries to execute an action they don't have permission for
                </li>
                <li>API returns a PermissionDeniedError</li>
                <li>Action buttons will handle this automatically</li>
              </ul>
            </li>
            <li>
              <Text strong>403 Permission Denied (Manual):</Text> You can also
              show it manually:
              <pre
                style={{ backgroundColor: '#f5f5f5', padding: 8, marginTop: 8 }}
              >
                {`import { PermissionDeniedPage } from '@drumr/framework-frontend';

// In your component
if (!hasPermission) {
  return <PermissionDeniedPage />;
}`}
              </pre>
            </li>
            <li>
              <Text strong>500 Internal Error:</Text> Use ErrorBoundary to catch
              rendering errors:
              <pre
                style={{ backgroundColor: '#f5f5f5', padding: 8, marginTop: 8 }}
              >
                {`import { ErrorBoundary } from '@drumr/framework-frontend';

// Wrap your component
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>`}
              </pre>
            </li>
            <li>
              <Text strong>503 Under Maintenance:</Text> Show during
              maintenance:
              <pre
                style={{ backgroundColor: '#f5f5f5', padding: 8, marginTop: 8 }}
              >
                {`import { MaintenancePage } from '@drumr/framework-frontend';

return <MaintenancePage 
  estimatedTime="2 hours" 
  message="We're updating the system" 
/>;`}
              </pre>
            </li>
          </ul>
        </Paragraph>
      </Card>
    </Space>
  );
};

/**
 * Test view for demonstrating all error pages
 * This view allows developers to test the different error states
 */
export function ErrorPagesTestView() {
  return (
    <View header={{ title: 'Error Pages Test' }}>
      <ErrorPagesTest />
    </View>
  );
}

export default ErrorPagesTestView;
