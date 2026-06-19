import { CreateView, DataForm } from '@drumr/framework-frontend';
import { Switch } from 'antd';
import React, { useState } from 'react';
import { BookMaterialForm } from './BookMaterialForm';

const BOOK_FORM_FIELDS = {
  title: true,
  status: true,
  author: true,
  showDescription: true,
  descriptionRequired: true,
  description: true,
  notes: true,
  evaluation: true,
} as const;

export function BookCreateView() {
  const [useMaterial, setUseMaterial] = useState(false);

  return (
    <CreateView model="Book" fields={BOOK_FORM_FIELDS}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <span>Framework form</span>
        <Switch
          checked={useMaterial}
          checkedChildren="MUI"
          unCheckedChildren="Ant"
          onChange={setUseMaterial}
        />
        <span>Material form</span>
      </div>

      {useMaterial ? <BookMaterialForm /> : <DataForm showActions={false} />}
    </CreateView>
  );
}

export default BookCreateView;
