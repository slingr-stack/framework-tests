import type { Book, BookNoteInput, BookNoteMetadataInput, User } from '@gql';
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  useDataFormContext,
  useDataFormField,
} from '@drumr/framework-frontend';
import React from 'react';

/**
 * Demo-only note and tag editor used by `BookMaterialForm`.
 *
 * The main form stays focused on root fields and a single nested object,
 * while this file holds the noisier nested-array example:
 * `notes[].author` plus `notes[].metadata[]`.
 *
 * This is the array-oriented half of the DataForm demo:
 *
 * - `useDataFormField('notes')` exposes the current array value and metadata
 *   for the array field itself.
 * - `pushFieldValue`, `removeFieldValue`, and `moveFieldValue` come from the
 *   form context because array structure changes are form-level operations.
 * - Individual item editors still use `useDataFormField()`, but indexed paths
 *   are expressed as typed selector tuples such as
 *   `['notes', 0, 'note']` or `['notes', 2, 'metadata', 1, 'key']`.
 * - Reference fields inside array items follow the same rule as root-level
 *   references: the form stores ids, while labels come from external options.
 */
type UserId = NonNullable<User['id']>;

export type SelectOption<TValue extends string = string> = {
  value: TValue;
  label: string;
};

export type UserSelectOption = SelectOption<UserId>;

type BookMaterialNotesSectionProps = {
  disabled: boolean;
  isSubmitting: boolean;
  usersLoading: boolean;
  usersErrorMessage?: string;
  authorOptions: ReadonlyArray<UserSelectOption>;
};

export const SELECT_MENU_PROPS = {
  slotProps: {
    root: {
      sx: {
        zIndex: 1900,
      },
    },
    paper: {
      sx: {
        zIndex: 1900,
      },
    },
  },
} as const;

function getFieldErrorMessage(
  errors: Array<{ message: string; type?: string }> | undefined,
): string | undefined {
  return errors?.find((error) => error.message)?.message;
}

function getStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isFieldDisabled(
  disabled: boolean,
  isSubmitting: boolean,
  meta: { readOnly: boolean; editable: boolean },
): boolean {
  return disabled || isSubmitting || meta.readOnly || meta.editable === false;
}

function createEmptyNote(): BookNoteInput {
  // `pushFieldValue()` should receive the same shape the backend expects on
  // submit, so the demo uses the generated input type rather than a loose map.
  return {
    note: '',
    metadata: [],
  };
}

function createEmptyMetadataEntry(): BookNoteMetadataInput {
  return {
    key: '',
    value: '',
  };
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}): React.ReactElement {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="h6">{title}</Typography>
      {action}
    </Box>
  );
}

function BookNoteMetadataRow({
  disabled,
  noteIndex,
  metadataIndex,
  isSubmitting,
}: {
  disabled: boolean;
  noteIndex: number;
  metadataIndex: number;
  isSubmitting: boolean;
}): React.ReactElement {
  // Indexed paths let each nested row subscribe only to the fields it renders,
  // even though the data lives inside two levels of array nesting.
  const { removeFieldValue } = useDataFormContext();
  const keyField = useDataFormField<Book>([
    'notes',
    noteIndex,
    'metadata',
    metadataIndex,
    'key',
  ]);
  const valueField = useDataFormField<Book>([
    'notes',
    noteIndex,
    'metadata',
    metadataIndex,
    'value',
  ]);
  const keyError = getFieldErrorMessage(keyField.meta.errors);
  const valueError = getFieldErrorMessage(valueField.meta.errors);

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
      }}
    >
      <Stack spacing={2}>
        <TextField
          fullWidth
          label={keyField.meta.label}
          value={getStringValue(keyField.value)}
          required={keyField.meta.required}
          disabled={isFieldDisabled(disabled, isSubmitting, keyField.meta)}
          error={Boolean(keyError)}
          helperText={keyError}
          onChange={(event) => keyField.change(event.target.value)}
        />

        <TextField
          fullWidth
          label={valueField.meta.label}
          value={getStringValue(valueField.value)}
          required={valueField.meta.required}
          disabled={isFieldDisabled(disabled, isSubmitting, valueField.meta)}
          error={Boolean(valueError)}
          helperText={valueError}
          onChange={(event) => valueField.change(event.target.value)}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            size="small"
            color="error"
            onClick={() =>
              removeFieldValue(`notes.${noteIndex}.metadata`, metadataIndex)
            }
            disabled={disabled || isSubmitting}
          >
            Remove metadata
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

function BookNoteMetadataSection({
  disabled,
  noteIndex,
  isSubmitting,
}: {
  disabled: boolean;
  noteIndex: number;
  isSubmitting: boolean;
}): React.ReactElement | null {
  // The array field itself still has metadata such as label, visibility, and
  // validation errors. Item editors are a separate concern from the array node.
  const { pushFieldValue } = useDataFormContext();
  const metadataField = useDataFormField<Book>([
    'notes',
    noteIndex,
    'metadata',
  ]);
  const metadataValue: BookNoteMetadataInput[] = Array.isArray(
    metadataField.value,
  )
    ? (metadataField.value as BookNoteMetadataInput[])
    : [];
  const metadataError = getFieldErrorMessage(metadataField.meta.errors);

  if (!metadataField.meta.visible) {
    return null;
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Stack spacing={2}>
        <SectionHeader
          title={metadataField.meta.label}
          action={
            <Button
              size="small"
              onClick={() =>
                pushFieldValue(
                  `notes.${noteIndex}.metadata`,
                  createEmptyMetadataEntry(),
                )
              }
              disabled={isFieldDisabled(
                disabled,
                isSubmitting,
                metadataField.meta,
              )}
            >
              Add metadata
            </Button>
          }
        />

        {metadataError ? (
          <FormHelperText error>{metadataError}</FormHelperText>
        ) : null}

        {metadataValue.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No metadata entries yet.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {metadataValue.map(
              (_: BookNoteMetadataInput, metadataIndex: number) => (
                <BookNoteMetadataRow
                  // biome-ignore lint/suspicious/noArrayIndexKey: index is the stable identity for positionally-managed form entries
                  key={metadataIndex}
                  disabled={disabled}
                  noteIndex={noteIndex}
                  metadataIndex={metadataIndex}
                  isSubmitting={isSubmitting}
                />
              ),
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

function BookNoteEditor({
  disabled,
  index,
  totalNotes,
  isSubmitting,
  usersLoading,
  usersErrorMessage,
  authorOptions,
}: {
  disabled: boolean;
  index: number;
  totalNotes: number;
  isSubmitting: boolean;
  usersLoading: boolean;
  usersErrorMessage?: string;
  authorOptions: ReadonlyArray<UserSelectOption>;
}): React.ReactElement {
  // Array item editors combine two hook layers:
  // - context operations for reorder/remove
  // - per-field subscriptions for the editable fields inside this item
  const { moveFieldValue, removeFieldValue } = useDataFormContext();
  const noteField = useDataFormField<Book>(['notes', index, 'note']);
  const noteAuthorField = useDataFormField<Book>(['notes', index, 'author']);

  const noteError = getFieldErrorMessage(noteField.meta.errors);
  const noteAuthorError = getFieldErrorMessage(noteAuthorField.meta.errors);
  const noteAuthorValue = getStringValue(noteAuthorField.value);

  const handleNoteAuthorChange = (event: SelectChangeEvent<string>) => {
    const nextValue = event.target.value;

    if (!nextValue) {
      noteAuthorField.change(undefined);
      return;
    }

    // Reference values stay as primitive ids in form state. Labels live in the
    // external option query, not in `_displayValue` objects inside the form.
    noteAuthorField.change(nextValue);
  };

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
      }}
    >
      <Stack spacing={2}>
        <SectionHeader
          title={`Note ${index + 1}`}
          action={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {index > 0 ? (
                <Button
                  size="small"
                  onClick={() => moveFieldValue('notes', index, index - 1)}
                  disabled={disabled || isSubmitting}
                >
                  Move up
                </Button>
              ) : null}
              {index < totalNotes - 1 ? (
                <Button
                  size="small"
                  onClick={() => moveFieldValue('notes', index, index + 1)}
                  disabled={disabled || isSubmitting}
                >
                  Move down
                </Button>
              ) : null}
              <Button
                size="small"
                color="error"
                onClick={() => removeFieldValue('notes', index)}
                disabled={disabled || isSubmitting}
              >
                Remove note
              </Button>
            </Box>
          }
        />

        <TextField
          fullWidth
          multiline
          minRows={3}
          label={noteField.meta.label}
          value={getStringValue(noteField.value)}
          required={noteField.meta.required}
          disabled={isFieldDisabled(disabled, isSubmitting, noteField.meta)}
          error={Boolean(noteError)}
          helperText={noteError}
          onChange={(event) => noteField.change(event.target.value)}
        />

        <FormControl
          fullWidth
          disabled={
            isFieldDisabled(disabled, isSubmitting, noteAuthorField.meta) ||
            usersLoading
          }
          error={Boolean(noteAuthorError || usersErrorMessage)}
        >
          <InputLabel id={`book-note-author-label-${index}`}>
            {noteAuthorField.meta.label}
          </InputLabel>
          <Select
            labelId={`book-note-author-label-${index}`}
            label={noteAuthorField.meta.label}
            value={noteAuthorValue}
            MenuProps={SELECT_MENU_PROPS}
            onChange={handleNoteAuthorChange}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {authorOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {noteAuthorError ||
              usersErrorMessage ||
              (usersLoading ? 'Loading authors...' : ' ')}
          </FormHelperText>
        </FormControl>

        <BookNoteMetadataSection
          disabled={disabled}
          noteIndex={index}
          isSubmitting={isSubmitting}
        />
      </Stack>
    </Box>
  );
}

export function BookMaterialNotesSection({
  disabled,
  isSubmitting,
  usersLoading,
  usersErrorMessage,
  authorOptions,
}: BookMaterialNotesSectionProps): React.ReactElement | null {
  // Subscribing to the top-level array field gives this section the current
  // list length plus array-level metadata. Deeper editors subscribe only when
  // their rows are actually rendered.
  const { pushFieldValue } = useDataFormContext();
  const notesField = useDataFormField<Book>('notes');
  const notesValue: BookNoteInput[] = Array.isArray(notesField.value)
    ? (notesField.value as BookNoteInput[])
    : [];
  const notesError = getFieldErrorMessage(notesField.meta.errors);

  if (!notesField.meta.visible) {
    return null;
  }

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
      }}
    >
      <Stack spacing={2}>
        <SectionHeader
          title={notesField.meta.label}
          action={
            <Button
              size="small"
              onClick={() => pushFieldValue('notes', createEmptyNote())}
              disabled={isFieldDisabled(
                disabled,
                isSubmitting,
                notesField.meta,
              )}
            >
              Add note
            </Button>
          }
        />

        {notesError ? (
          <FormHelperText error>{notesError}</FormHelperText>
        ) : null}

        {notesValue.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No notes yet.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {notesValue.map((_: BookNoteInput, index: number) => (
              <BookNoteEditor
                // biome-ignore lint/suspicious/noArrayIndexKey: index is the stable identity for positionally-managed form entries
                key={index}
                disabled={disabled}
                index={index}
                totalNotes={notesValue.length}
                isSubmitting={isSubmitting}
                usersLoading={usersLoading}
                usersErrorMessage={usersErrorMessage}
                authorOptions={authorOptions}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
