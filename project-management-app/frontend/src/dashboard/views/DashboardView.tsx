import {
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  FireOutlined,
  PauseCircleOutlined,
  ProjectOutlined,
  ReloadOutlined,
  RocketOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { Project } from '@gql';
import { openView, View } from '@drumr/framework-frontend';
import {
  Button,
  Card,
  Col,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';

const { Text, Paragraph } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardSummary {
  totalUsers: number;
  projectsTotal: number;
  projectsActive: number;
  projectsCompleted: number;
  projectsOnHold: number;
  projectsCritical: number;
  tasksTotal: number;
  tasksPending: number;
  tasksInProgress: number;
  tasksInReview: number;
  tasksCompleted: number;
  tasksBlocked: number;
  tasksOverdue: number;
  tasksHighPriorityPending: number;
  totalActiveBudget: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseMoneyValue = (value: unknown): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value.replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
  }
  if (typeof value === 'object') {
    const container = value as Record<string, unknown>;
    if (container.amount !== undefined) {
      const numeric = Number(container.amount);
      return Number.isFinite(numeric) ? numeric : 0;
    }
    if (container.value !== undefined) {
      const numeric = Number(container.value);
      return Number.isFinite(numeric) ? numeric : 0;
    }
  }
  return 0;
};

const HIGH_PRIORITY_SET = new Set(['high', 'urgent', 'critical']);

const getHistory = () => {
  try {
    const umi = require('umi');
    return umi.history;
  } catch (_e) {
    return null;
  }
};

const checkUserTableViewPermission = async (): Promise<boolean> => {
  try {
    const frameworkFrontend = await import('@drumr/framework-frontend');
    const checkPermission = (
      frameworkFrontend as {
        checkViewRenderPermission?: (
          viewName: string,
          params?: Record<string, unknown>,
        ) => Promise<boolean>;
      }
    ).checkViewRenderPermission;

    if (typeof checkPermission === 'function') {
      return await checkPermission('UserTableView');
    }
  } catch {
    // Ignore runtime import differences and fallback to deny.
  }

  return false;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Filters({
  projects,
  selectedProjectId,
  projectsLoading,
  dashboardLoading,
  onProjectChange,
  onRefresh,
}: {
  projects: Project[];
  selectedProjectId: string | null;
  projectsLoading: boolean;
  dashboardLoading: boolean;
  onProjectChange: (value: string) => void;
  onRefresh: () => void;
}) {
  return (
    <Card style={{ marginBottom: 24 }}>
      <Row gutter={16} align="middle">
        <Col xs={24} sm={16} md={12}>
          <Space orientation="vertical" style={{ width: '100%' }}>
            <Text strong>Filter by Project:</Text>
            <Select
              style={{ width: '100%' }}
              placeholder="Select a project"
              value={selectedProjectId || 'all'}
              onChange={onProjectChange}
              loading={projectsLoading}
            >
              <Select.Option value="all">All Projects</Select.Option>
              {projects.map((project) => (
                <Select.Option key={project.id} value={project.id}>
                  {project.name} ({project.code})
                </Select.Option>
              ))}
            </Select>
          </Space>
        </Col>
        <Col
          xs={24}
          sm={8}
          md={12}
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={dashboardLoading}
            onClick={onRefresh}
          >
            refresh
          </Button>
        </Col>
      </Row>
    </Card>
  );
}

function ProjectStats({ data }: { data: DashboardSummary }) {
  const projectCompletionRate =
    (data.projectsTotal ?? 0) > 0
      ? Math.round(
          ((data.projectsCompleted ?? 0) / (data.projectsTotal ?? 0)) * 100,
        )
      : 0;

  return (
    <Card
      title={
        <span>
          <ProjectOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          Project Statistics
        </span>
      }
      extra={
        <Button type="link" onClick={() => getHistory()?.push('/projects')}>
          View All Projects
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8}>
          <Statistic
            title="Total Projects"
            value={data.projectsTotal ?? 0}
            prefix={<ProjectOutlined />}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="Active Projects"
            value={data.projectsActive ?? 0}
            prefix={<RocketOutlined />}
            styles={{ content: { color: '#3f8600' } }}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="Completed Projects"
            value={data.projectsCompleted ?? 0}
            prefix={<CheckCircleOutlined />}
            styles={{ content: { color: '#52c41a' } }}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="On Hold"
            value={data.projectsOnHold ?? 0}
            prefix={<PauseCircleOutlined />}
            styles={{ content: { color: '#faad14' } }}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="Critical Priority"
            value={data.projectsCritical ?? 0}
            prefix={<FireOutlined />}
            styles={{ content: { color: '#ff4d4f' } }}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="Total Active Budget"
            value={data.totalActiveBudget ?? 0}
            prefix="$"
            precision={2}
          />
        </Col>
      </Row>
      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <Text strong>Project Completion Rate</Text>
          <Progress
            percent={projectCompletionRate}
            status={
              projectCompletionRate > 70
                ? 'success'
                : projectCompletionRate > 40
                  ? 'normal'
                  : 'exception'
            }
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </Col>
      </Row>
    </Card>
  );
}

function TaskStats({ data }: { data: DashboardSummary }) {
  const taskCompletionRate =
    (data.tasksTotal ?? 0) > 0
      ? Math.round(((data.tasksCompleted ?? 0) / (data.tasksTotal ?? 0)) * 100)
      : 0;

  const taskStatusData = [
    { status: 'To Do', count: data.tasksPending ?? 0, color: 'default' },
    {
      status: 'In Progress',
      count: data.tasksInProgress ?? 0,
      color: 'processing',
    },
    { status: 'In Review', count: data.tasksInReview ?? 0, color: 'warning' },
    { status: 'Completed', count: data.tasksCompleted ?? 0, color: 'success' },
    { status: 'Blocked', count: data.tasksBlocked ?? 0, color: 'error' },
  ];

  return (
    <Card
      title={
        <span>
          <CheckSquareOutlined style={{ marginRight: 8, color: '#52c41a' }} />
          Task Statistics
        </span>
      }
      extra={
        <Button type="link" onClick={() => getHistory()?.push('/tasks')}>
          View All Tasks
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8}>
          <Statistic
            title="Total Tasks"
            value={data.tasksTotal ?? 0}
            prefix={<CheckSquareOutlined />}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="Completed Tasks"
            value={data.tasksCompleted ?? 0}
            prefix={<CheckCircleOutlined />}
            styles={{ content: { color: '#52c41a' } }}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="In Progress"
            value={data.tasksInProgress ?? 0}
            prefix={<ClockCircleOutlined />}
            styles={{ content: { color: '#1890ff' } }}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="Overdue Tasks"
            value={data.tasksOverdue ?? 0}
            prefix={<WarningOutlined />}
            styles={{ content: { color: '#ff4d4f' } }}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="High Priority Pending"
            value={data.tasksHighPriorityPending ?? 0}
            prefix={<FireOutlined />}
            styles={{ content: { color: '#fa8c16' } }}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="Blocked Tasks"
            value={data.tasksBlocked ?? 0}
            prefix={<PauseCircleOutlined />}
            styles={{ content: { color: '#faad14' } }}
          />
        </Col>
      </Row>
      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <Text strong>Task Completion Rate</Text>
          <Progress
            percent={taskCompletionRate}
            status={
              taskCompletionRate > 70
                ? 'success'
                : taskCompletionRate > 40
                  ? 'normal'
                  : 'exception'
            }
          />
        </Col>
      </Row>
      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <Text strong style={{ display: 'block', marginBottom: 12 }}>
            Task Status Distribution
          </Text>
          <Table
            dataSource={taskStatusData}
            columns={[
              {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                render: (text: string, record: any) => (
                  <Tag color={record.color as any}>{text}</Tag>
                ),
              },
              {
                title: 'Count',
                dataIndex: 'count',
                key: 'count',
                align: 'right' as const,
              },
            ]}
            pagination={false}
            size="small"
            rowKey="status"
          />
        </Col>
      </Row>
    </Card>
  );
}

function UserStats({
  data,
  canRenderUsersView,
}: {
  data: DashboardSummary;
  canRenderUsersView: boolean;
}) {
  return (
    <Card
      title={
        <span>
          <UserOutlined style={{ marginRight: 8, color: '#fa8c16' }} />
          User Statistics
        </span>
      }
      extra={
        canRenderUsersView ? (
          <Button type="link" onClick={() => getHistory()?.push('/users')}>
            View All Users
          </Button>
        ) : null
      }
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Statistic
            title="Total Users"
            value={data.totalUsers ?? 0}
            prefix={<UserOutlined />}
            styles={{ content: { fontSize: 32 } }}
          />
        </Col>
      </Row>
      <Paragraph style={{ marginTop: 16 }}>
        Manage team members, roles, and permissions to ensure smooth project
        execution.
      </Paragraph>
    </Card>
  );
}

function QuickActions({ canRenderUsersView }: { canRenderUsersView: boolean }) {
  return (
    <Card title="Quick views">
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <Button
          type="primary"
          block
          icon={<ProjectOutlined />}
          onClick={() =>
            openView('ProjectTableView', {
              container: 'modal',
              modalPosition: 'right',
              modalSize: 'big',
            })
          }
        >
          Projects
        </Button>
        <Button
          type="primary"
          block
          icon={<CheckSquareOutlined />}
          onClick={() =>
            openView('TaskTableView', {
              container: 'modal',
              modalPosition: 'right',
              modalSize: 'big',
            })
          }
        >
          Tasks
        </Button>
        {canRenderUsersView ? (
          <Button
            type="primary"
            block
            icon={<UserOutlined />}
            onClick={() =>
              openView('UserTableView', {
                container: 'modal',
                modalPosition: 'right',
                modalSize: 'big',
              })
            }
          >
            Users
          </Button>
        ) : null}
      </Space>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardView() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [canRenderUsersView, setCanRenderUsersView] = useState(false);
  const { data: rawData, loading, refetch } = useDashboardData();

  useEffect(() => {
    let isMounted = true;

    void checkUserTableViewPermission()
      .then((canRender: boolean) => {
        if (isMounted) {
          setCanRenderUsersView(canRender);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCanRenderUsersView(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const { summary, projects } = useMemo(() => {
    const { projects: allProjects, tasks, users } = rawData;

    const selectedProjects = selectedProjectId
      ? allProjects.filter((p) => p.id === selectedProjectId)
      : allProjects;

    const filteredTasks = tasks.filter((task) => {
      if (selectedProjectId && task.project?.id !== selectedProjectId)
        return false;
      return true;
    });

    const activeProjects = selectedProjects.filter(
      (p) => p.status === 'active',
    );
    const completedProjects = selectedProjects.filter(
      (p) => p.status === 'completed',
    );
    const onHoldProjects = selectedProjects.filter(
      (p) => p.status === 'on_hold',
    );
    const criticalProjects = selectedProjects.filter(
      (p) => p.priority === 'critical',
    );

    const tasksPending = filteredTasks.filter((t) => t.status === 'to_do');
    const tasksInProgress = filteredTasks.filter(
      (t) => t.status === 'in_progress',
    );
    const tasksInReview = filteredTasks.filter((t) => t.status === 'in_review');
    const tasksCompleted = filteredTasks.filter((t) => t.status === 'done');
    const tasksBlocked = filteredTasks.filter((t) => t.status === 'blocked');

    const now = dayjs();
    const tasksOverdue = filteredTasks.filter((task) => {
      if (!task.dueDate) return false;
      const due = dayjs(task.dueDate);
      return (
        due.isValid() && due.isBefore(now, 'day') && task.status !== 'done'
      );
    });

    const tasksHighPriorityPending = filteredTasks.filter((task) => {
      return (
        HIGH_PRIORITY_SET.has((task.priority || '').toLowerCase()) &&
        task.status !== 'done'
      );
    });

    const totalActiveBudget = activeProjects.reduce(
      (sum, p) => sum + parseMoneyValue(p.budget),
      0,
    );

    const computed: DashboardSummary = {
      totalUsers: users.filter((u) => u.status !== 'inactive').length,
      projectsTotal: selectedProjects.length,
      projectsActive: activeProjects.length,
      projectsCompleted: completedProjects.length,
      projectsOnHold: onHoldProjects.length,
      projectsCritical: criticalProjects.length,
      tasksTotal: filteredTasks.length,
      tasksPending: tasksPending.length,
      tasksInProgress: tasksInProgress.length,
      tasksInReview: tasksInReview.length,
      tasksCompleted: tasksCompleted.length,
      tasksBlocked: tasksBlocked.length,
      tasksOverdue: tasksOverdue.length,
      tasksHighPriorityPending: tasksHighPriorityPending.length,
      totalActiveBudget,
    };

    return { summary: computed, projects: allProjects };
  }, [rawData, selectedProjectId]);

  const handleProjectChange = (value: string) => {
    setSelectedProjectId(value === 'all' ? null : value);
  };

  return (
    <View
      header={{
        title: 'Dashboard',
        subTitle: 'Project management overview',
      }}
    >
      <div style={{ padding: '0 24px 24px' }}>
        <Filters
          projects={projects}
          selectedProjectId={selectedProjectId}
          projectsLoading={loading}
          dashboardLoading={loading}
          onProjectChange={handleProjectChange}
          onRefresh={() => refetch()}
        />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Space orientation="vertical" align="center" size="large">
              <Spin size="large" />
              <Text type="secondary">Loading dashboard data...</Text>
            </Space>
          </div>
        ) : summary ? (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Space
                orientation="vertical"
                style={{ width: '100%' }}
                size="large"
              >
                <ProjectStats data={summary} />
                <TaskStats data={summary} />
              </Space>
            </Col>
            <Col xs={24} lg={8}>
              <Space
                orientation="vertical"
                style={{ width: '100%' }}
                size="large"
              >
                <UserStats
                  data={summary}
                  canRenderUsersView={canRenderUsersView}
                />
                <QuickActions canRenderUsersView={canRenderUsersView} />
              </Space>
            </Col>
          </Row>
        ) : (
          <Card>
            <Paragraph>
              No data available. Please check your filters and try again.
            </Paragraph>
          </Card>
        )}
      </div>
    </View>
  );
}

export default DashboardView;
