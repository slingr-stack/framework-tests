import {
  BellOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { View } from '@drumr/framework-frontend';
import {
  Badge,
  Button,
  Card,
  Empty,
  List,
  Space,
  Spin,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useFancyAlert } from '../../shared/providers/FancyAlertProvider';
import { getActivityLogDataService } from '../services/ActivityLogDataService';

const { Text, Paragraph } = Typography;

export function ActivityLogView() {
  const showAlert = useFancyAlert();
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [entries, setEntries] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activityLogService = getActivityLogDataService();

  const loadLog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await activityLogService.getActivityLog();
      if (data) {
        setCount(data.count);
        setEntries(data.entries);
      } else {
        setError(err ?? 'Unknown error');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activityLogService]);

  useEffect(() => {
    void loadLog();
  }, [loadLog]);

  return (
    <View
      header={{
        title: 'Activity Log',
        subTitle: 'Shared app-wide log — singleton DI scope',
      }}
    >
      <div style={{ padding: '0 24px 24px' }}>
        <Card
          title={
            <Space>
              <FileTextOutlined style={{ color: '#1890ff' }} />
              <span>Application Activity Log</span>
              <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
            </Space>
          }
          extra={
            <Space>
              <Button
                icon={<BellOutlined />}
                onClick={() => showAlert('FancyAlertProvider is working!')}
              >
                Test Alert
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void loadLog()}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
          }
        >
          <Card
            size="small"
            style={{
              marginBottom: 16,
              background: '#f6ffed',
              borderColor: '#b7eb8f',
            }}
          >
            <Space>
              <InfoCircleOutlined style={{ color: '#52c41a' }} />
              <Text type="secondary">
                This log is backed by a <Text strong>singleton-scoped</Text>{' '}
                service (<Text code>ActivityLogService</Text>). One shared
                instance exists for the entire app lifetime. Entries from{' '}
                <em>all</em> users accumulate here until the server restarts.
              </Text>
            </Space>
          </Card>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin />
            </div>
          ) : error ? (
            <Paragraph type="danger">Error: {error}</Paragraph>
          ) : entries.length === 0 ? (
            <Empty
              description="No activity yet — start or complete a task to see entries here."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <List
              size="small"
              dataSource={entries}
              renderItem={(entry) => (
                <List.Item>
                  <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {entry}
                  </Text>
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    </View>
  );
}

export default ActivityLogView;
