import type { Book, BookEvaluationInput, User } from '@gql';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  Switch as MaterialSwitch,
  MenuItem,
  Select,
  type SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  isChoiceFieldMeta,
  useApiFindBy,
  useDataFormContext,
  useDataFormField,
} from '@drumr/framework-frontend';
import React, { useMemo } from 'react';
import { BOOK_STATUS_VALUE_METADATA } from '../config/dataModels';
import {
  BookMaterialNotesSection,
  SELECT_MENU_PROPS,
  type SelectOption,
  type UserSelectOption,
} from './BookMaterialNotesSection';

/**
 * Demo-only Material renderer for Book create/edit flows.
 *
 * The goal here is to show that Drumr's form controller hooks can drive a
 * fully custom UI without relying on the framework `DataField` renderer.
 * Root fields and the single `evaluation` object stay here; the noisier
 * `notes[]` plus nested metadata/tag editor lives in `BookMaterialNotesSection`.
 *
 * This file demonstrates the three main pieces of the DataForm contract used
 * by custom renderers:
 *
 * - `useDataFormContext()` exposes form-level state and operations such as
 *   refresh, submit state, and array mutations.
 * - `useDataFormField(path)` gives a reactive subscription for one field path,
 *   including backend-driven metadata (`label`, `required`, `visible`,
 *   `editable`, `errors`) plus a framework-aware `change()` handler.
 * - Reference option catalogs are still queried outside the form controller.
 *   The form keeps only primitive ids for relationship fields, while labels
 *   come from the separate query result used to render the select.
 *
 * Read this file from top to bottom as a walkthrough:
 *
 * 1. Local helpers translate framework values and errors into MUI-friendly
 *    props.
 * 2. `BookEvaluationSection` shows nested object fields addressed through
 *    dot-paths.
 * 3. `BookMaterialForm` shows root-field subscriptions, form-level refresh,
 *    and reference option loading.
 * 4. `BookMaterialNotesSection` continues the demo with array mutations and
 *    nested array item editors.
 */

// The reference option query intentionally requests only the fields the custom
// select needs. The DataForm hook owns form state, not remote option catalogs.
const USER_OPTION_FIELDS = {
  id: true,
  fullName: true,
} as const;

// `evaluation.stars` is numeric in form state, but MUI Select renders strings,
// so the demo keeps an explicit option list and converts at the boundary.
const STAR_OPTIONS: ReadonlyArray<NonNullable<BookEvaluationInput['stars']>> = [
  1, 2, 3, 4, 5,
];

function getFieldErrorMessage(
  errors: Array<{ message: string; type?: string }> | undefined,
): string | undefined {
  // MUI fields consume a single helper string, so this demo surfaces the first
  // framework validation message for each field.
  return errors?.find((error) => error.message)?.message;
}

function getStringValue(value: unknown): string {
  // Controlled MUI text inputs should always receive a string, even when the
  // underlying form value is `null`, `undefined`, or still unresolved.
  return typeof value === 'string' ? value : '';
}

function getChoiceOptions(
  meta:
    | {
        possibleValues?: Array<{ label: string; value: unknown }>;
      }
    | null
    | undefined,
  valueMetadata: Record<string, { label?: string }> = {},
): ReadonlyArray<SelectOption> {
  return (meta?.possibleValues ?? []).flatMap((option) =>
    typeof option.value === 'string'
      ? [
          {
            value: option.value,
            label: valueMetadata[option.value]?.label ?? option.label,
          },
        ]
      : [],
  );
}

function isFieldDisabled(
  disabled: boolean,
  isSubmitting: boolean,
  meta: { readOnly: boolean; editable: boolean },
): boolean {
  return disabled || isSubmitting || meta.readOnly || meta.editable === false;
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

function BookEvaluationSection({
  disabled,
  isSubmitting,
}: {
  disabled: boolean;
  isSubmitting: boolean;
}): React.ReactElement | null {
  // Nested object fields use the same hook contract as root fields. The only
  // difference is the dot-path used to subscribe to the child property.
  // Nested composition fields are addressed with dot-paths. The hook resolves
  // both the current value and the backend-provided field metadata for each
  // nested child, exactly like a root field.
  const evaluationField = useDataFormField<Book>('evaluation');
  const starsField = useDataFormField<Book>('evaluation.stars');
  const commentField = useDataFormField<Book>('evaluation.comment');

  const evaluationError = getFieldErrorMessage(evaluationField.meta.errors);
  const starsError = getFieldErrorMessage(starsField.meta.errors);
  const commentError = getFieldErrorMessage(commentField.meta.errors);
  // MUI Select works with string values, so the numeric form value is converted
  // for rendering and parsed back to a number inside `onChange`.
  const starsValue =
    typeof starsField.value === 'number' ? String(starsField.value) : '';

  if (!evaluationField.meta.visible) {
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
        <SectionHeader title={evaluationField.meta.label} />

        {evaluationError ? (
          <FormHelperText error>{evaluationError}</FormHelperText>
        ) : null}

        <FormControl
          fullWidth
          required={starsField.meta.required}
          disabled={isFieldDisabled(disabled, isSubmitting, starsField.meta)}
          error={Boolean(starsError)}
        >
          <InputLabel id="book-evaluation-stars-label">
            {starsField.meta.label}
          </InputLabel>
          <Select
            labelId="book-evaluation-stars-label"
            label={starsField.meta.label}
            value={starsValue}
            MenuProps={SELECT_MENU_PROPS}
            onChange={(event) => {
              const nextValue = event.target.value;
              starsField.change(nextValue ? Number(nextValue) : undefined);
            }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {STAR_OPTIONS.map((star) => (
              <MenuItem key={star} value={String(star)}>
                {star}
              </MenuItem>
            ))}
          </Select>
          {starsError ? <FormHelperText>{starsError}</FormHelperText> : null}
        </FormControl>

        <TextField
          fullWidth
          multiline
          minRows={3}
          label={commentField.meta.label}
          value={getStringValue(commentField.value)}
          required={commentField.meta.required}
          disabled={isFieldDisabled(disabled, isSubmitting, commentField.meta)}
          error={Boolean(commentError)}
          helperText={commentError}
          onChange={(event) => commentField.change(event.target.value)}
        />
      </Stack>
    </Box>
  );
}

export function BookMaterialForm({
  disabled = false,
}: {
  disabled?: boolean;
} = {}): React.ReactElement {
  // `useDataFormContext()` is the form-wide entry point for custom layouts.
  // The hook exposes aggregate form state and imperative operations, while
  // `useDataFormField()` stays focused on individual field subscriptions.

  const { formState, refresh } = useDataFormContext();

  // Each field hook subscribes only to the requested path, which keeps custom
  // form sections composable without forcing the whole form to re-render on
  // every change.
  // Root scalar fields use the same contract as nested ones: `value`, `meta`,
  // and `change`. The only difference is the path string.
  const titleField = useDataFormField<Book>('title');
  const statusField = useDataFormField<Book>('status');
  const authorField = useDataFormField<Book>('author');
  const showDescriptionField = useDataFormField<Book>('showDescription');
  const descriptionRequiredField = useDataFormField<Book>(
    'descriptionRequired',
  );
  const descriptionField = useDataFormField<Book>('description');

  // Reference option data still comes from the data API hook. The form hooks
  // manage form state only; external option catalogs are fetched separately.
  const {
    data: users,
    loading: usersLoading,
    error: usersError,
  } = useApiFindBy<User>('User', {
    first: null,
    fields: USER_OPTION_FIELDS,
  });

  const isSubmitting = formState.isSubmitting;
  const isRefreshing = formState.isRefreshing;
  const titleError = getFieldErrorMessage(titleField.meta.errors);
  const statusError = getFieldErrorMessage(statusField.meta.errors);
  const authorError = getFieldErrorMessage(authorField.meta.errors);
  const descriptionError = getFieldErrorMessage(descriptionField.meta.errors);

  // MUI inputs want plain primitives.
  const statusValue = getStringValue(statusField.value);
  const authorValue = getStringValue(authorField.value);
  const statusMeta = isChoiceFieldMeta(statusField.meta)
    ? statusField.meta
    : null;

  const statusOptions = useMemo(
    (): ReadonlyArray<SelectOption> =>
      getChoiceOptions(statusMeta, BOOK_STATUS_VALUE_METADATA),
    [statusMeta],
  );

  const authorOptions = useMemo(
    (): ReadonlyArray<UserSelectOption> =>
      (users ?? []).reduce<UserSelectOption[]>(
        (options: UserSelectOption[], user: User) => {
          if (!user.id) {
            return options;
          }

          options.push({
            value: user.id,
            label: user.fullName ?? user.id,
          });
          return options;
        },
        [],
      ),
    [users],
  );

  const handleStatusChange = (event: SelectChangeEvent<string>) => {
    statusField.change(event.target.value);
  };

  const handleAuthorChange = (event: SelectChangeEvent<string>) => {
    authorField.change(event.target.value);
  };

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Stack spacing={2}>
        {/*
          Manual refresh is exposed here to highlight the form-level API.
          Custom layouts can call `refresh()` whenever they want to ask the
          backend to recompute UI metadata, validations, or derived values.
        */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => void refresh()}
            disabled={disabled || isSubmitting || isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>

        <TextField
          fullWidth
          label={titleField.meta.label}
          value={typeof titleField.value === 'string' ? titleField.value : ''}
          required={titleField.meta.required}
          disabled={isFieldDisabled(disabled, isSubmitting, titleField.meta)}
          error={Boolean(titleError)}
          helperText={titleError}
          onChange={(event) => titleField.change(event.target.value)}
        />

        <FormControl
          fullWidth
          required={statusField.meta.required}
          disabled={isFieldDisabled(disabled, isSubmitting, statusField.meta)}
          error={Boolean(statusError)}
        >
          <InputLabel id="book-status-label">
            {statusField.meta.label}
          </InputLabel>
          <Select
            labelId="book-status-label"
            label={statusField.meta.label}
            value={statusValue}
            MenuProps={SELECT_MENU_PROPS}
            onChange={handleStatusChange}
          >
            {statusOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {statusError ? <FormHelperText>{statusError}</FormHelperText> : null}
        </FormControl>

        <FormControl
          fullWidth
          disabled={
            isFieldDisabled(disabled, isSubmitting, authorField.meta) ||
            usersLoading
          }
          error={Boolean(authorError || usersError)}
        >
          <InputLabel id="book-author-label">
            {authorField.meta.label}
          </InputLabel>
          <Select
            labelId="book-author-label"
            label={authorField.meta.label}
            value={authorValue}
            MenuProps={SELECT_MENU_PROPS}
            onChange={handleAuthorChange}
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
            {authorError ||
              usersError?.message ||
              (usersLoading ? 'Loading authors...' : ' ')}
          </FormHelperText>
        </FormControl>

        <FormControlLabel
          disabled={isFieldDisabled(
            disabled,
            isSubmitting,
            showDescriptionField.meta,
          )}
          control={
            <MaterialSwitch
              // Boolean fields use the same `change()` contract as text fields.
              // The only difference is the primitive value passed in.
              checked={Boolean(showDescriptionField.value)}
              onChange={(event) =>
                showDescriptionField.change(event.target.checked)
              }
            />
          }
          label={showDescriptionField.meta.label}
        />

        <FormControlLabel
          disabled={isFieldDisabled(
            disabled,
            isSubmitting,
            descriptionRequiredField.meta,
          )}
          control={
            <MaterialSwitch
              checked={Boolean(descriptionRequiredField.value)}
              onChange={(event) =>
                descriptionRequiredField.change(event.target.checked)
              }
            />
          }
          label={descriptionRequiredField.meta.label}
        />

        {descriptionField.meta.visible ? (
          // Visibility remains backend-driven even in a fully custom layout.
          // The renderer decides how to hide the control, but the form hook is
          // still the source of truth for whether the field should be shown.
          <TextField
            fullWidth
            multiline
            minRows={4}
            label={descriptionField.meta.label}
            value={getStringValue(descriptionField.value)}
            required={descriptionField.meta.required}
            disabled={isFieldDisabled(
              disabled,
              isSubmitting,
              descriptionField.meta,
            )}
            error={Boolean(descriptionError)}
            helperText={descriptionError}
            onChange={(event) => descriptionField.change(event.target.value)}
          />
        ) : null}

        {/*
          Nested object section: still a single form controller, but the child
          component subscribes to `evaluation.*` paths instead of root fields.
        */}
        <BookEvaluationSection
          disabled={disabled}
          isSubmitting={isSubmitting}
        />

        {/*
          Nested array section: array mutations live on the form context while
          each array item editor uses `useDataFormField()` for its own paths.
        */}
        <BookMaterialNotesSection
          disabled={disabled}
          isSubmitting={isSubmitting}
          usersLoading={usersLoading}
          usersErrorMessage={usersError?.message}
          authorOptions={authorOptions}
        />
      </Stack>
    </Box>
  );
}

export default BookMaterialForm;
