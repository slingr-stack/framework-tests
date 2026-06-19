import { ActionView } from '@drumr/framework-frontend';
import React from 'react';

interface Props {
  id: string;
}

export function CloneTaskView({ id }: Props) {
  return (
    <ActionView action="CloneTask" model="Task" id={id} refreshMode="auto" />
  );
}

export default CloneTaskView;
