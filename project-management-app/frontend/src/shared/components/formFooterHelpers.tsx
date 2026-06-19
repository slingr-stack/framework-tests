import { closeView } from '@drumr/framework-frontend';
import type { FormInstance } from 'antd';
import { Button, Space } from 'antd';
import React from 'react';

interface FormFooterButtonsProps {
  getFormInstance: () => FormInstance | null;
  submitLabel: string;
}

/**
 * Reusable footer buttons for form views
 * Used in both toolbar and modal footer configurations
 */
export const renderFormFooterButtons = ({
  getFormInstance,
  submitLabel,
}: FormFooterButtonsProps) => {
  const handleSubmit = () => {
    const formInstance = getFormInstance();
    if (formInstance) {
      formInstance.submit();
    } else {
      console.error('[FormFooterButtons] formInstance is null, cannot submit');
    }
  };

  return (
    <Space>
      <Button onClick={() => closeView({ cancelled: true })}>Cancel</Button>
      <Button type="primary" onClick={handleSubmit}>
        {submitLabel}
      </Button>
    </Space>
  );
};
