import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  AnalystInput,
  AppCodebaseInput,
  AppMetadata,
  AppMetadataAction,
  AppMetadataField,
  AppMetadataModel,
  GitHubIssueInput,
  MetadataOnlyInput,
  RequirementRequest,
  StandaloneInput,
} from './types.js';

// ---------------------------------------------------------------------------
// Standalone adapter
// ---------------------------------------------------------------------------

function adaptStandalone(input: StandaloneInput): RequirementRequest {
  return {
    userStory: input.userStory,
    acceptanceCriteria: input.acceptanceCriteria,
    appMetadata: input.appMetadata,
  };
}

// ---------------------------------------------------------------------------
// GitHub issue adapter
// ---------------------------------------------------------------------------

/** Sections that introduce acceptance criteria in an issue body */
const AC_HEADER_RE = /^#{1,4}\s*(acceptance[- ]criteria|ac|criteria|requirements)\s*$/im;
/** "As a …" user story pattern anywhere in body */
const USER_STORY_RE = /^(as an?\s+.+?(?:,|\.)?\s*i\s+want\s+.+?)$/im;
/** Checklist item (checked or unchecked) */
const CHECKLIST_RE = /^[-*]\s*\[[ xX]\]\s+(.+)$/;
/** Plain numbered or bulleted list item */
const LIST_ITEM_RE = /^(?:\d+[.)]\s+|[-*]\s+)(?!\[)(.+)$/;

function parseGitHubIssueBody(title: string, body: string): Pick<RequirementRequest, 'userStory' | 'acceptanceCriteria'> {
  const lines = body.split(/\r?\n/);

  // --- Extract user story ---
  const storyMatch = body.match(USER_STORY_RE);
  const userStory = storyMatch ? storyMatch[1].trim() : `As a user, I want to ${title.toLowerCase()}.`;

  // --- Locate acceptance criteria section ---
  const acHeaderIndex = lines.findIndex((l) => AC_HEADER_RE.test(l.trim()));

  const criteriaLines =
    acHeaderIndex !== -1
      ? lines.slice(acHeaderIndex + 1)
      : lines;

  const acceptanceCriteria: string[] = [];

  for (const line of criteriaLines) {
    const trimmed = line.trim();
    // Stop at the next markdown section heading (different from the AC header)
    if (/^#{1,4}\s/.test(trimmed) && !AC_HEADER_RE.test(trimmed)) break;

    const checklist = trimmed.match(CHECKLIST_RE);
    if (checklist) {
      acceptanceCriteria.push(checklist[1].trim());
      continue;
    }
    const listItem = trimmed.match(LIST_ITEM_RE);
    if (listItem) {
      acceptanceCriteria.push(listItem[1].trim());
    }
  }

  return { userStory, acceptanceCriteria };
}

function adaptGitHubIssue(input: GitHubIssueInput): RequirementRequest {
  const { userStory, acceptanceCriteria } = parseGitHubIssueBody(
    input.issue.title,
    input.issue.body,
  );
  return { userStory, acceptanceCriteria, appMetadata: input.appMetadata };
}

// ---------------------------------------------------------------------------
// App codebase adapter
// ---------------------------------------------------------------------------

/** TypeORM + Drumr entity/model decorator patterns */
const ENTITY_DECORATOR_RE = /@(?:Entity|DataModel|Model)\s*\(/;
const CLASS_NAME_RE = /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/;

/** Column/field decorator patterns */
const FIELD_DECORATOR_RE = /@(?:Column|Field|Property|PrimaryGeneratedColumn|PrimaryColumn|ManyToOne|OneToMany|ManyToMany|OneToOne)\s*\(/;
const PROPERTY_NAME_RE = /^\s+(?:readonly\s+)?(\w+)\s*[?!]?\s*:/;

/** Drumr action registration */
const ACTION_DECORATOR_RE = /@(?:GlobalAction|ModelAction|ObjectAction|GlobalWorkflowAction|ModelWorkflowAction|ObjectWorkflowAction)\s*\(/;
const ACTION_NAME_RE = /label\s*:\s*['"`]([^'"`]+)['"`]/;

async function collectTsFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectTsFiles(fullPath);
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') && !entry.name.endsWith('.test.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

function parseEntityFromSource(source: string): AppMetadataModel | null {
  const lines = source.split(/\r?\n/);
  let insideEntity = false;
  let className: string | null = null;
  const fields: AppMetadataField[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (ENTITY_DECORATOR_RE.test(line)) {
      insideEntity = true;
      continue;
    }

    if (insideEntity && !className) {
      const classMatch = line.match(CLASS_NAME_RE);
      if (classMatch) {
        className = classMatch[1];
        continue;
      }
    }

    if (className && FIELD_DECORATOR_RE.test(line)) {
      // The property declaration is on the next non-empty line
      const nextLine = lines[i + 1] ?? '';
      const propMatch = nextLine.match(PROPERTY_NAME_RE);
      if (propMatch) {
        fields.push({ name: propMatch[1] });
      }
    }
  }

  return className ? { name: className, fields } : null;
}

function parseActionsFromSource(source: string): AppMetadataAction[] {
  const actions: AppMetadataAction[] = [];
  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    if (ACTION_DECORATOR_RE.test(lines[i])) {
      // Search for label within the next 10 lines of the decorator call
      const snippet = lines.slice(i, i + 10).join('\n');
      const labelMatch = snippet.match(ACTION_NAME_RE);
      if (labelMatch) {
        actions.push({ name: labelMatch[1] });
      }
    }
  }

  return actions;
}

async function adaptAppCodebase(input: AppCodebaseInput): Promise<RequirementRequest> {
  const tsFiles = await collectTsFiles(input.sourcePath);

  const models: AppMetadataModel[] = [];
  const actions: AppMetadataAction[] = [];

  for (const filePath of tsFiles) {
    let source: string;
    try {
      source = await readFile(filePath, 'utf8');
    } catch {
      continue;
    }

    const entity = parseEntityFromSource(source);
    if (entity) models.push(entity);

    const fileActions = parseActionsFromSource(source);
    actions.push(...fileActions);
  }

  const appMetadata: AppMetadata = {
    models: models.length > 0 ? models : undefined,
    actions: actions.length > 0 ? actions : undefined,
  };

  return {
    userStory: input.userStory,
    acceptanceCriteria: input.acceptanceCriteria,
    appMetadata: (models.length > 0 || actions.length > 0) ? appMetadata : undefined,
  };
}

// ---------------------------------------------------------------------------
// Metadata-only adapter
// ---------------------------------------------------------------------------

function adaptMetadataOnly(input: MetadataOnlyInput): RequirementRequest {
  const { appMetadata, focusArea } = input;
  const entities = (appMetadata.models ?? appMetadata.entities ?? []).map((m) =>
    typeof m === 'string' ? m : m.name,
  );

  const userStory =
    focusArea ??
    (entities.length > 0
      ? `As a user, I want to manage ${entities.join(', ')} records in ${appMetadata.appName ?? 'the application'}.`
      : `As a user, I want to use ${appMetadata.appName ?? 'the application'}.`);

  const acceptanceCriteria: string[] = [];
  for (const entity of entities) {
    acceptanceCriteria.push(`User can create a ${entity} record.`);
    acceptanceCriteria.push(`User can view and edit an existing ${entity} record.`);
    acceptanceCriteria.push(`User can delete a ${entity} record.`);
  }
  for (const action of appMetadata.actions ?? []) {
    const scope = action.model ? `a ${action.model} record` : 'the relevant record';
    acceptanceCriteria.push(`User can perform the "${action.name}" action on ${scope}.`);
  }

  // Fallback when no entities and no actions are declared
  if (acceptanceCriteria.length === 0) {
    acceptanceCriteria.push('Application core features are accessible and functional.');
  }

  return { userStory, acceptanceCriteria, appMetadata };
}

// ---------------------------------------------------------------------------
// Public resolver
// ---------------------------------------------------------------------------

/**
 * Normalise any supported input source into a `RequirementRequest` ready
 * for `runQaAnalystAgent`.
 */
export async function resolveInput(input: AnalystInput): Promise<RequirementRequest> {
  switch (input.kind) {
    case 'standalone':
      return adaptStandalone(input);
    case 'github-issue':
      return adaptGitHubIssue(input);
    case 'app-codebase':
      return adaptAppCodebase(input);
    case 'metadata-only':
      return adaptMetadataOnly(input);
  }
}
