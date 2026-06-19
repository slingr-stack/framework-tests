import { DataForm, ReadView } from '@drumr/framework-frontend';
import { Switch } from 'antd';
import React, { useState } from 'react';
import BookMaterialForm from './BookMaterialForm';

/**
 * ViewUserView - Read-only user details view using DataForm
 *
 * Uses DataForm in read mode to automatically fetch and display user data
 * with proper field rendering and permissions handling.
 */

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

export function BookReadView({ id }: Props = {}) {
  const [useMaterial, setUseMaterial] = useState(false);

  return (
    <ReadView model="Book" id={id}>
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
      {useMaterial ? (
        <BookMaterialForm disabled />
      ) : (
        <DataForm fields={BOOK_FORM_FIELDS} showActions={false} />
      )}
    </ReadView>
  );
}
export default BookReadView;
