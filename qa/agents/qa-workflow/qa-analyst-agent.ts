import { randomUUID } from 'node:crypto';
import type {
  RequirementRequest,
  QAAnalysisResult,
  TestableBehavior,
  AmbiguityReport,
  BusinessFlow,
  RiskReport,
} from './types.js';

// ---------------------------------------------------------------------------
// Keyword maps for heuristic classification
// ---------------------------------------------------------------------------

const NEGATIVE_KEYWORDS = ['should not', 'must not', 'cannot', 'invalid', 'error', 'fail', 'reject', 'denied'];
const BOUNDARY_KEYWORDS = ['limit', 'maximum', 'minimum', 'max', 'min', 'empty', 'zero', 'length', 'exceed'];
const PERMISSION_KEYWORDS = ['admin', 'permission', 'role', 'unauthorized', 'authorized', 'only', 'restricted', 'access'];

const ACTION_STEP_MAP: Record<string, string[]> = {
  create: ['Navigate to the entity list', 'Click "Create" or "New"', 'Fill in required fields', 'Submit the form'],
  view: ['Navigate to the entity list', 'Locate the target record', 'Open the record detail'],
  read: ['Navigate to the entity list', 'Locate the target record', 'Open the record detail'],
  edit: ['Navigate to the entity list', 'Locate the target record', 'Click "Edit"', 'Modify the fields', 'Save changes'],
  update: ['Navigate to the entity list', 'Locate the target record', 'Click "Edit"', 'Modify the fields', 'Save changes'],
  delete: ['Navigate to the entity list', 'Locate the target record', 'Click "Delete"', 'Confirm the deletion'],
  remove: ['Navigate to the entity list', 'Locate the target record', 'Click "Delete"', 'Confirm the deletion'],
  archive: ['Navigate to the entity list', 'Locate the target record', 'Click "Archive"', 'Confirm the action'],
  search: ['Navigate to the entity list', 'Enter a search term', 'Submit or trigger the filter'],
  filter: ['Navigate to the entity list', 'Apply filter criteria', 'Observe the filtered results'],
  login: ['Navigate to the login page', 'Enter credentials', 'Submit the login form'],
  logout: ['Trigger the logout action from the navigation menu'],
  submit: ['Fill in the required form fields', 'Click "Submit"'],
  save: ['Fill in the required form fields', 'Click "Save"'],
  assign: ['Open the target record', 'Click "Assign"', 'Select the assignee', 'Confirm the assignment'],
  upload: ['Navigate to the upload section', 'Select or drag a file', 'Confirm the upload'],
  download: ['Navigate to the record', 'Click "Download"', 'Verify the downloaded file'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyCriterion(
  criterion: string,
): TestableBehavior['type'] {
  const lower = criterion.toLowerCase();
  if (PERMISSION_KEYWORDS.some((k) => lower.includes(k))) {
return 'permission';
}
  if (BOUNDARY_KEYWORDS.some((k) => lower.includes(k))) {
return 'boundary';
}
  if (NEGATIVE_KEYWORDS.some((k) => lower.includes(k))) {
return 'negative';
}
  return 'positive';
}

function extractFlowSteps(criterion: string): string[] {
  const lower = criterion.toLowerCase();
  for (const [verb, steps] of Object.entries(ACTION_STEP_MAP)) {
    if (new RegExp(`\\b${verb}\\b`).test(lower)) {
      return [...steps, `Verify: ${criterion.trim()}`];
    }
  }
  // Generic fallback
  return [`Navigate to the relevant section`, `Perform the described action`, `Verify: ${criterion.trim()}`];
}

function extractOutcomes(criterion: string): string[] {
  const lower = criterion.toLowerCase();
  // Split on "and" conjunctions to surface multiple outcomes
  const parts = criterion.split(/\band\b/i).map((p) => p.trim()).filter(Boolean);
  const outcomes: string[] = [];
  for (const part of parts) {
    if (lower.includes('should') || lower.includes('must') || lower.includes('shall')) {
      outcomes.push(part.charAt(0).toUpperCase() + part.slice(1));
    } else {
      outcomes.push(`The system reflects: ${part}`);
    }
  }
  return outcomes.length > 0 ? outcomes : [`The system state matches: ${criterion.trim()}`];
}

/**
 * Extract capitalized nouns from text as candidate entity names.
 * Skips words at the very start of a sentence to reduce false positives.
 */
function extractEntitiesFromText(text: string): string[] {
  const entities = new Set<string>();
  // Match mid-sentence capitalized words (not after '. ' or start-of-string)
  const tokens = text.split(/\s+/);
  for (let i = 1; i < tokens.length; i++) {
    const word = tokens[i].replace(/[^A-Za-z]/g, '');
    if (word.length > 2 && /^[A-Z]/.test(word) && !/^(I|The|A|An|This|That|These|Those|It|We|You|They|He|She|And|Or|But|If|When|After|Before)$/.test(word)) {
      entities.add(word);
    }
  }
  return Array.from(entities);
}

/**
 * Extract entity/model names from appMetadata when available.
 * Handles both `models` (array of strings or objects with `name`) and `entities` shapes.
 */
function extractEntitiesFromMetadata(appMetadata: NonNullable<RequirementRequest['appMetadata']>): string[] {
  const entities: string[] = [];
  const candidates = appMetadata.models ?? appMetadata.entities ?? [];
  for (const item of candidates) {
    if (typeof item === 'string') {
      entities.push(item);
    } else if (item?.name) {
      entities.push(item.name);
    }
  }
  return entities;
}

/**
 * Check whether the user story or criteria reference behaviors that the
 * provided appMetadata cannot support (e.g. "archive" without a status field).
 */
function detectAmbiguities(
  request: RequirementRequest,
): AmbiguityReport[] {
  const ambiguities: AmbiguityReport[] = [];
  const allText = [request.userStory, ...request.acceptanceCriteria].join(' ').toLowerCase();

  // No acceptance criteria at all is a blocker
  if (request.acceptanceCriteria.length === 0) {
    ambiguities.push({
      field: 'acceptanceCriteria',
      finding: 'No acceptance criteria were provided.',
      severity: 'blocker',
      recommendation: 'Supply at least one acceptance criterion to generate meaningful testable behaviors.',
    });
  }

  // Archive/status mismatch check
  if (allText.includes('archiv')) {
    const models: any[] = request.appMetadata?.models ?? request.appMetadata?.entities ?? [];
    const hasStatusField = models.some((m: any) => {
      const fields: any[] = m?.fields ?? [];
      return fields.some(
        (f: any) =>
          (typeof f === 'string' && f.toLowerCase() === 'status') ||
          (f?.name && f.name.toLowerCase() === 'status'),
      );
    });
    if (models.length > 0 && !hasStatusField) {
      ambiguities.push({
        field: 'status',
        finding: 'User story mentions archiving but no model defines a "status" field.',
        severity: 'warning',
        recommendation: 'Add a "status" field (e.g. active/archived) to the relevant model.',
      });
    }
  }

  // Criteria referencing unknown entities when appMetadata is supplied.
  // Always use text-extracted entities for cross-checking so that entities
  // mentioned in requirements but absent from the metadata are surfaced.
  if (request.appMetadata) {
    const metaEntities = extractEntitiesFromMetadata(request.appMetadata).map((e) => e.toLowerCase());
    // Strip a trailing 's' from both sides so plural/singular variants resolve to the same stem.
    const stem = (s: string) => s.toLowerCase().replace(/s$/, '');
    const textEntities = extractEntitiesFromText(
      [request.userStory, ...request.acceptanceCriteria].join(' '),
    );
    for (const entity of textEntities) {
      if (!metaEntities.some((m) => stem(m) === stem(entity))) {
        ambiguities.push({
          field: entity,
          finding: `Entity "${entity}" appears in requirements but is not defined in appMetadata.`,
          severity: 'info',
          recommendation: `Verify whether "${entity}" should be added as a model in the application blueprint.`,
        });
      }
    }
  }

  // Cross-validate non-CRUD action verbs against appMetadata.actions when supplied.
  // CRUD verbs (create, read, view, edit, update, delete, remove, search, filter,
  // login, logout, submit, save) are universal and need no declaration.
  // Any other action verb found in the criteria (assign, archive, export, upload,
  // download, etc.) must have a matching entry in appMetadata.actions, otherwise
  // the coder agent would generate a step that cannot be executed in the real app.
  const CRUD_VERBS = new Set([
    'create', 'read', 'view', 'edit', 'update', 'delete', 'remove',
    'search', 'filter', 'login', 'logout', 'submit', 'save', 'fill',
    'open', 'close', 'navigate', 'click', 'select', 'enter', 'confirm',
  ]);
  const CUSTOM_ACTION_VERBS = Object.keys(ACTION_STEP_MAP).filter((v) => !CRUD_VERBS.has(v));

  if (request.appMetadata) {
    const declaredActions = (request.appMetadata.actions ?? []).map(
      (a: { name: string }) => a.name.toLowerCase(),
    );
    // Only perform this check when the caller has supplied an actions list —
    // an absent list means "not provided" (brownfield app not yet annotated),
    // which is different from an empty list meaning "no custom actions exist".
    if (request.appMetadata.actions !== undefined) {
      for (const verb of CUSTOM_ACTION_VERBS) {
        if (allText.includes(verb) && !declaredActions.some((a) => a.includes(verb))) {
          ambiguities.push({
            field: `action:${verb}`,
            finding: `Criteria mention the "${verb}" action but it is not declared in appMetadata.actions.`,
            severity: 'warning',
            recommendation: `Add { name: "${verb.charAt(0).toUpperCase() + verb.slice(1)}" } to appMetadata.actions, or remove the criterion if this action does not exist in the app.`,
          });
        }
      }
    }
  }

  return ambiguities;
}

// ---------------------------------------------------------------------------
// Actor extraction
// ---------------------------------------------------------------------------

// Matches "As a project manager" / "As an admin" in a user story
const ACTOR_REGEX = /^as an?\s+([^,]+?)(?:,|\s+i\s)/i;

function extractActors(userStory: string): string[] {
  const match = userStory.match(ACTOR_REGEX);
  return match ? [match[1].trim()] : [];
}

// ---------------------------------------------------------------------------
// Business flow grouping
// ---------------------------------------------------------------------------

function buildBusinessFlows(behaviors: TestableBehavior[], entities: string[]): BusinessFlow[] {
  if (behaviors.length === 0) return [];

  const flows: BusinessFlow[] = [];
  const assignedIds = new Set<string>();

  for (const entity of entities) {
    const related = behaviors
      .filter((b) => b.title.toLowerCase().includes(entity.toLowerCase()))
      .map((b) => b.id);
    if (related.length > 0) {
      flows.push({ name: `${entity} flow`, behaviorIds: related });
      related.forEach((id) => assignedIds.add(id));
    }
  }

  // Behaviors not matched to any entity fall into a general bucket
  const unassigned = behaviors.filter((b) => !assignedIds.has(b.id)).map((b) => b.id);
  if (unassigned.length > 0) {
    flows.push({ name: 'General flow', behaviorIds: unassigned });
  }

  return flows;
}

// ---------------------------------------------------------------------------
// Risk detection
// ---------------------------------------------------------------------------

function detectRisks(behaviors: TestableBehavior[]): RiskReport[] {
  if (behaviors.length === 0) return [];

  const risks: RiskReport[] = [];
  const types = new Set(behaviors.map((b) => b.type));

  // A permission behavior with no rejection scenario → security risk.
  // A behavior counts as a rejection scenario when its type is 'negative' OR
  // its title contains explicit negative-language keywords (covers cases where
  // the classifier assigns 'permission' due to role keywords taking priority).
  const NEGATIVE_TEXT_INDICATORS = ['should not', 'must not', 'cannot', 'invalid', 'fail', 'reject', 'denied'];
  const hasRejectionScenario =
    types.has('negative') ||
    behaviors.some((b) =>
      NEGATIVE_TEXT_INDICATORS.some((k) => b.title.toLowerCase().includes(k)),
    );

  if (types.has('permission') && !hasRejectionScenario) {
    for (const b of behaviors.filter((bv) => bv.type === 'permission')) {
      risks.push({
        behaviorId: b.id,
        riskType: 'security',
        description: `Permission behavior "${b.title}" has no corresponding rejection scenario. An unauthorized-access negative test is missing.`,
      });
    }
  }

  // Limit/pagination keywords present but no boundary type → performance risk
  const BOUNDARY_TEXT_KEYWORDS = ['limit', 'maximum', 'minimum', 'max', 'min', 'exceed', 'pagination'];
  const allTitles = behaviors.map((b) => b.title).join(' ').toLowerCase();
  const hasBoundaryKeyword = BOUNDARY_TEXT_KEYWORDS.some((k) => allTitles.includes(k));
  if (hasBoundaryKeyword && !types.has('boundary')) {
    risks.push({
      behaviorId: 'GENERAL',
      riskType: 'performance',
      description: 'Requirements mention limits or pagination but no boundary test case has been identified.',
    });
  }

  return risks;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function runQaAnalystAgent(
  request: RequirementRequest,
  _options?: { modelName?: string },
): QAAnalysisResult {
  if (!request.userStory || request.userStory.trim().length === 0) {
    throw new Error('[QAAnalystAgent] User story is required.');
  }

  const testableBehaviors: TestableBehavior[] = [];
  const entities = new Set<string>();

  // 1. Collect entities — prefer appMetadata definitions; fall back to text heuristics
  const metaEntities = request.appMetadata
    ? extractEntitiesFromMetadata(request.appMetadata)
    : [];

  if (metaEntities.length > 0) {
    metaEntities.forEach((e) => entities.add(e));
  } else {
    const textEntities = extractEntitiesFromText(
      [request.userStory, ...request.acceptanceCriteria].join(' '),
    );
    textEntities.forEach((e) => entities.add(e));
  }

  // 2. Build one TestableBehavior per acceptance criterion
  request.acceptanceCriteria.forEach((criterion, index) => {
    const behaviorType = classifyCriterion(criterion);
    const behavior: TestableBehavior = {
      id: `TB-${String(index + 1).padStart(3, '0')}`,
      title: criterion.trim(),
      flowSteps: extractFlowSteps(criterion),
      expectedOutcomes: extractOutcomes(criterion),
      type: behaviorType,
    };
    testableBehaviors.push(behavior);
  });

  // 3. Flag ambiguities and gaps
  const ambiguities: AmbiguityReport[] = detectAmbiguities(request);

  // 4. Extract actors, group into business flows, and detect risks
  const actors = extractActors(request.userStory);
  const businessFlows = buildBusinessFlows(testableBehaviors, Array.from(entities));
  const risks = detectRisks(testableBehaviors);

  return {
    id: randomUUID(),
    appName: request.appMetadata?.appName ?? 'DrumrApp',
    functionalScope: {
      coveredEntities: Array.from(entities),
      actors,
      testedEndpoints: [],
    },
    testableBehaviors,
    businessFlows,
    ambiguities,
    risks,
    rulesApplied: ['SR-1 (Structural Validation)', 'SR-3 (Behavioral Contract)'],
    generatedAt: new Date().toISOString(),
  };
}
