import {
  closeView,
  DataForm,
  EditView,
  OnRefreshCallback,
} from '@drumr/framework-frontend';
import { Switch } from 'antd';
import React, { useState } from 'react';
import BookMaterialForm from './BookMaterialForm';

// TODO implement when configurable on refresh is available in view

const handleRefresh: OnRefreshCallback = async (defaultRefresh, ctx) => {
  const title = ctx.getValue('title');
  const titleChanged = ctx.changedFieldsSinceRefresh.has('title');

  console.log(
    'Refresh triggered. Title changed:',
    titleChanged,
    'Current title value:',
    title,
  );

  if (titleChanged && title === 'changeMe') {
    console.log('Title is "changeMe", updating title field');
    const now = new Date().toLocaleString();
    ctx.change('title', `changed ${now}`);
  }

  return defaultRefresh();
};

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

interface Props {
  id?: string;
}

export function BookEditView({ id }: Props = {}) {
  const [useMaterial, setUseMaterial] = useState(false);

  return (
    <EditView
      model="Book"
      id={id}
      header={{ title: 'Edit Book' }}
      onSaved={() => closeView({ executed: true })}
      fields={BOOK_FORM_FIELDS}
      refreshMode="custom"
      onRefresh={handleRefresh}
    >
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
      {useMaterial ? <BookMaterialForm /> : <DataForm />}
    </EditView>
  );
}

export default BookEditView;
