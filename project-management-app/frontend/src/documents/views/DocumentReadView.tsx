import {
  DataField,
  DataForm,
  editAction,
  UiMode,
  UiUsage,
  View,
} from '@drumr/framework-frontend';
import { Col, Row } from 'antd';
import React from 'react';

interface Props {
  id?: string;
}

export default function DocumentReadView({ id }: Props = {}) {
  return (
    <View
      header={{
        title: 'Document Details',
        toolbar: {
          buttons: [editAction({ container: 'page' })],
        },
      }}
    >
      <DataForm<Document>
        model="Document"
        id={id}
        queryContext={{ mode: UiMode.Read, usage: UiUsage.Custom }}
        formProps={{ layout: 'horizontal', labelCol: { span: 3 } }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <DataField name="title" />
          </Col>
          <Col span={12}>
            <DataField name="content" />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <DataField name="createdAt" />
          </Col>
          <Col span={12}>
            <DataField name="status" />
          </Col>
        </Row>
      </DataForm>
    </View>
  );
}
