import type { Book, BookEvaluation, BookNote, BookNoteMetadata } from '@gql';
import {
  app,
  BooleanCheckbox,
  BooleanToggle,
  ChoiceDropdown,
  ChoiceLabel,
  CompositionCard,
  IntegerInput,
  IntegerLabel,
  LongTextInput,
  LongTextLabel,
  ReferenceDropdown,
  ReferenceLabel,
  TextInput,
  TextLabel,
} from '@drumr/framework-frontend';
import React from 'react';

// =============================================================================
// Book Defaults
// =============================================================================

export const BOOK_STATUS_VALUE_METADATA = {
  inStock: { label: 'In Stock', color: 'green' },
  borrowed: { label: 'Borrowed', color: 'blue' },
  missing: { label: 'Missing', color: 'orange' },
} as const;

app.registerDataModel<Book>('Book', {
  labelField: 'title',
  defaultCreateView: 'BookCreateView',
  defaultEditView: 'BookEditView',
  defaultReadView: 'BookReadView',
  fields: {
    title: [
      { context: 'read', component: <TextLabel /> },
      {
        context: 'write',
        component: (
          <TextInput
            placeholder="Enter task title"
            appendIcon="FontSizeOutlined"
          />
        ),
      },
    ],
    author: [
      { context: 'read', component: <ReferenceLabel /> },
      {
        context: 'write',
        component: <ReferenceDropdown />,
      },
    ],
    status: [
      {
        context: 'read',
        component: <ChoiceLabel valueMetadata={BOOK_STATUS_VALUE_METADATA} />,
      },
      {
        context: 'write',
        component: (
          <ChoiceDropdown
            placeholder="Select book status"
            valueMetadata={BOOK_STATUS_VALUE_METADATA}
          />
        ),
      },
    ],
    showDescription: [
      { context: 'read', component: <BooleanCheckbox /> },
      { context: 'write', component: <BooleanToggle /> },
    ],
    descriptionRequired: [
      { context: 'read', component: <BooleanCheckbox /> },
      { context: 'write', component: <BooleanToggle /> },
    ],
    description: [
      {
        context: 'read',
        dependsOn: ['showDescription'],
        component: <TextLabel limitCharacters={200} />,
        visible: (book: Book) => Boolean(book.showDescription),
      },
      {
        context: 'write',
        dependsOn: ['showDescription'],
        component: <TextInput placeholder="Enter task title" />,
        visible: (book: Book) => Boolean(book.showDescription),
      },
    ],
    notes: [
      {
        context: 'read',
        component: <CompositionCard readOnly />,
      },
      {
        context: 'write',
        component: <CompositionCard />,
      },
    ],
    evaluation: [
      {
        context: 'read',
        component: <CompositionCard readOnly />,
      },
      {
        context: 'write',
        component: <CompositionCard />,
      },
    ],
  },
});

// =============================================================================
// BookEvaluation Defaults
// =============================================================================

app.registerDataModel<BookEvaluation>('BookEvaluation', {
  labelField: 'stars',
  fields: {
    stars: [
      { context: 'read', component: <IntegerLabel /> },
      { context: 'write', component: <IntegerInput /> },
    ],
    comment: [
      {
        context: 'read',
        component: <LongTextLabel control="textArea" height="150px" />,
      },
      {
        context: 'write',
        component: (
          <LongTextInput
            control="textArea"
            height="150px"
            placeholder="Evaluation comment"
            limitCharacters={2000}
          />
        ),
      },
    ],
  },
});

// =============================================================================
// BookNote Defaults
// =============================================================================

app.registerDataModel<BookNote>('BookNote', {
  labelField: 'note',
  fields: {
    note: [
      {
        context: 'read',
        component: <LongTextLabel control="textArea" height="150px" />,
      },
      {
        context: 'write',
        component: (
          <LongTextInput
            control="textArea"
            height="150px"
            placeholder="Note content"
            limitCharacters={2000}
          />
        ),
      },
    ],
    metadata: [
      {
        context: 'read',
        component: <CompositionCard readOnly />,
      },
      {
        context: 'write',
        component: <CompositionCard />,
      },
    ],
    author: [
      { context: 'read', component: <ReferenceLabel /> },
      {
        context: 'write',
        component: <ReferenceDropdown />,
      },
    ],
  },
});

// =============================================================================
// BookNoteMetadata Defaults
// =============================================================================

app.registerDataModel<BookNoteMetadata>('BookNoteMetadata', {
  fields: {
    key: [
      { context: 'read', component: <TextLabel /> },
      { context: 'write', component: <TextInput placeholder="Enter key" /> },
    ],
    value: [
      { context: 'read', component: <TextLabel /> },
      {
        context: 'write',
        component: <TextInput placeholder="Enter value" />,
      },
    ],
  },
});
