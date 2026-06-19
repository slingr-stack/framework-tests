import { runQaAnalystAgent } from './qa-analyst-agent.js';
import { runQaTestGeneratorAgent } from './qa-test-generator-agent.js';
import { runQaAutomationCoderAgent } from './qa-automation-coder-agent.js';
import type {
  RequirementRequest,
  QAAnalysisResult,
  QATestGeneratorResult,
  AmbiguityReport,
  BusinessFlow,
  RiskReport,
} from './types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MINIMAL_REQUEST: RequirementRequest = {
  userStory: 'As a project manager I want to create tasks so that I can track work.',
  acceptanceCriteria: [
    'A task should have a title, description, and due date.',
    'The system should reject tasks with an empty title.',
  ],
};

const FULL_REQUEST: RequirementRequest = {
  userStory:
    'As a team lead I want to assign Tasks to Users and archive completed Tasks so that the backlog stays clean.',
  acceptanceCriteria: [
    'A Task can be created with a title, assignee, and priority.',
    'A Task can be edited to update its title or due date.',
    'A Task can be deleted only by admins or the original creator.',
    'An empty task title should be rejected with a validation error.',
    'The task list should not exceed 500 items without pagination.',
    'A Task can be archived by setting its status to archived.',
  ],
  appMetadata: {
    appName: 'ProjectHub',
    models: [
      {
        name: 'Task',
        fields: [{ name: 'title' }, { name: 'assignee' }, { name: 'priority' }, { name: 'status' }],
      },
      { name: 'User', fields: [{ name: 'email' }, { name: 'role' }] },
    ],
  },
};

const REQUEST_WITHOUT_METADATA: RequirementRequest = {
  userStory:
    'As a user I want to view Project details so that I can track progress.',
  acceptanceCriteria: [
    'Clicking a Project row opens the detail view.',
    'The detail view displays the Project name and description.',
  ],
};

const REQUEST_WITH_ARCHIVE_NO_STATUS: RequirementRequest = {
  userStory: 'As a manager I can archive Tasks to clean up the backlog.',
  acceptanceCriteria: ['A Task should be archivable from the task list.'],
  appMetadata: {
    appName: 'ArchiverApp',
    models: [{ name: 'Task', fields: [{ name: 'title' }] }],
  },
};

// ---------------------------------------------------------------------------
// Guard: input validation
// ---------------------------------------------------------------------------

describe('runQaAnalystAgent — input validation', () => {
  it('throws when user story is an empty string', () => {
    expect(() =>
      runQaAnalystAgent({ userStory: '', acceptanceCriteria: [] }),
    ).toThrow('[QAAnalystAgent] User story is required.');
  });

  it('throws when user story is whitespace only', () => {
    expect(() =>
      runQaAnalystAgent({ userStory: '   ', acceptanceCriteria: [] }),
    ).toThrow('[QAAnalystAgent] User story is required.');
  });

  it('does not throw when user story is non-empty', () => {
    expect(() => runQaAnalystAgent(MINIMAL_REQUEST)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------

describe('runQaAnalystAgent — output structure', () => {
  let result: QAAnalysisResult;

  beforeEach(() => {
    result = runQaAnalystAgent(MINIMAL_REQUEST);
  });

  it('returns a unique UUID id on each call', () => {
    const a = runQaAnalystAgent(MINIMAL_REQUEST);
    const b = runQaAnalystAgent(MINIMAL_REQUEST);
    expect(a.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(a.id).not.toBe(b.id);
  });

  it('sets appName to "DrumrApp" when appMetadata is absent', () => {
    expect(result.appName).toBe('DrumrApp');
  });

  it('reads appName from appMetadata when present', () => {
    const r = runQaAnalystAgent(FULL_REQUEST);
    expect(r.appName).toBe('ProjectHub');
  });

  it('includes rulesApplied with SR-1 and SR-3', () => {
    expect(result.rulesApplied).toContain('SR-1 (Structural Validation)');
    expect(result.rulesApplied).toContain('SR-3 (Behavioral Contract)');
  });

  it('sets generatedAt to a valid ISO 8601 timestamp', () => {
    expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
  });

  it('returns an empty testedEndpoints array', () => {
    expect(result.functionalScope.testedEndpoints).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Testable behaviors
// ---------------------------------------------------------------------------

describe('runQaAnalystAgent — testable behaviors', () => {
  it('generates one TestableBehavior per acceptance criterion', () => {
    const result = runQaAnalystAgent(MINIMAL_REQUEST);
    expect(result.testableBehaviors).toHaveLength(MINIMAL_REQUEST.acceptanceCriteria.length);
  });

  it('assigns sequential IDs starting from TB-001', () => {
    const result = runQaAnalystAgent(MINIMAL_REQUEST);
    expect(result.testableBehaviors[0].id).toBe('TB-001');
    expect(result.testableBehaviors[1].id).toBe('TB-002');
  });

  it('sets the behavior title equal to the criterion text (trimmed)', () => {
    const result = runQaAnalystAgent(MINIMAL_REQUEST);
    expect(result.testableBehaviors[0].title).toBe(MINIMAL_REQUEST.acceptanceCriteria[0].trim());
  });

  it('populates flowSteps with at least one step per behavior', () => {
    const result = runQaAnalystAgent(FULL_REQUEST);
    for (const behavior of result.testableBehaviors) {
      expect(behavior.flowSteps.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('populates expectedOutcomes with at least one entry per behavior', () => {
    const result = runQaAnalystAgent(FULL_REQUEST);
    for (const behavior of result.testableBehaviors) {
      expect(behavior.expectedOutcomes.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('classifies a criterion containing "should not" as negative', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I interact with the system.',
      // Deliberately avoids boundary keywords (empty, limit, max, etc.)
      acceptanceCriteria: ['The form should not submit without a title.'],
    };
    const result = runQaAnalystAgent(req);
    expect(result.testableBehaviors[0].type).toBe('negative');
  });

  it('classifies a criterion containing "maximum" as boundary', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I interact with the system.',
      // Deliberately avoids negative keywords (should not, must not, etc.)
      acceptanceCriteria: ['Tasks are limited to a maximum of 100 items per page.'],
    };
    const result = runQaAnalystAgent(req);
    expect(result.testableBehaviors[0].type).toBe('boundary');
  });

  it('classifies a criterion containing "admin" as permission', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I interact with the system.',
      acceptanceCriteria: ['Only admin users can delete records.'],
    };
    const result = runQaAnalystAgent(req);
    expect(result.testableBehaviors[0].type).toBe('permission');
  });

  it('defaults to positive type for a standard success criterion', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I create tasks.',
      acceptanceCriteria: ['A task can be created with a title and due date.'],
    };
    const result = runQaAnalystAgent(req);
    expect(result.testableBehaviors[0].type).toBe('positive');
  });

  it('produces zero testableBehaviors when acceptanceCriteria is empty', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I interact with the system.',
      acceptanceCriteria: [],
    };
    const result = runQaAnalystAgent(req);
    expect(result.testableBehaviors).toHaveLength(0);
  });

  it('includes action-specific steps when criterion mentions "create"', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I create tasks.',
      acceptanceCriteria: ['A user can create a Task from the task list.'],
    };
    const result = runQaAnalystAgent(req);
    const steps = result.testableBehaviors[0].flowSteps;
    expect(steps.some((s) => s.toLowerCase().includes('create'))).toBe(true);
  });

  it('includes action-specific steps when criterion mentions "delete"', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I delete tasks.',
      acceptanceCriteria: ['A task can be deleted by its creator.'],
    };
    const result = runQaAnalystAgent(req);
    const steps = result.testableBehaviors[0].flowSteps;
    expect(steps.some((s) => s.toLowerCase().includes('delete'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Entity extraction
// ---------------------------------------------------------------------------

describe('runQaAnalystAgent — entity extraction', () => {
  it('extracts entity names from appMetadata models when available', () => {
    const result = runQaAnalystAgent(FULL_REQUEST);
    expect(result.functionalScope.coveredEntities).toContain('Task');
    expect(result.functionalScope.coveredEntities).toContain('User');
  });

  it('falls back to text heuristics when appMetadata is absent', () => {
    const result = runQaAnalystAgent(REQUEST_WITHOUT_METADATA);
    // "Project" appears mid-sentence as a capitalized noun
    expect(result.functionalScope.coveredEntities).toContain('Project');
  });

  it('returns an array (possibly empty) when no entities can be detected', () => {
    const req: RequirementRequest = {
      userStory: 'as a user i want to do stuff.',
      acceptanceCriteria: ['it should work correctly.'],
    };
    const result = runQaAnalystAgent(req);
    expect(Array.isArray(result.functionalScope.coveredEntities)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Ambiguity detection
// ---------------------------------------------------------------------------

describe('runQaAnalystAgent — ambiguity detection', () => {
  it('flags a blocker ambiguity when acceptanceCriteria is empty', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I interact with the system.',
      acceptanceCriteria: [],
    };
    const result = runQaAnalystAgent(req);
    const blocker = result.ambiguities.find(
      (a: AmbiguityReport) => a.severity === 'blocker' && a.field === 'acceptanceCriteria',
    );
    expect(blocker).toBeDefined();
    expect(blocker?.recommendation).toBeTruthy();
  });

  it('flags a warning when story mentions archiving but no status field exists', () => {
    const result = runQaAnalystAgent(REQUEST_WITH_ARCHIVE_NO_STATUS);
    const warning = result.ambiguities.find(
      (a: AmbiguityReport) => a.field === 'status' && a.severity === 'warning',
    );
    expect(warning).toBeDefined();
    expect(warning?.finding).toMatch(/archiv/i);
  });

  it('does not flag archive/status warning when the status field exists', () => {
    const result = runQaAnalystAgent(FULL_REQUEST);
    const spurious = result.ambiguities.find(
      (a: AmbiguityReport) => a.field === 'status' && a.severity === 'warning',
    );
    expect(spurious).toBeUndefined();
  });

  it('flags a warning when criteria reference a custom action verb absent from appMetadata.actions', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I manage tasks.',
      acceptanceCriteria: ['A task can be assigned to a user.'],
      appMetadata: {
        appName: 'TaskApp',
        models: [{ name: 'Task', fields: [{ name: 'title' }] }],
        actions: [], // explicitly declared but empty — "assign" is missing
      },
    };
    const result = runQaAnalystAgent(req);
    const warning = result.ambiguities.find(
      (a: AmbiguityReport) => a.field === 'action:assign' && a.severity === 'warning',
    );
    expect(warning).toBeDefined();
    expect(warning?.finding).toMatch(/assign/i);
    expect(warning?.recommendation).toMatch(/appMetadata\.actions/i);
  });

  it('does not flag a custom action warning when the action is declared in appMetadata.actions', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I manage tasks.',
      acceptanceCriteria: ['A task can be assigned to a user.'],
      appMetadata: {
        appName: 'TaskApp',
        models: [{ name: 'Task', fields: [{ name: 'title' }] }],
        actions: [{ name: 'Assign', model: 'Task' }],
      },
    };
    const result = runQaAnalystAgent(req);
    const warning = result.ambiguities.find(
      (a: AmbiguityReport) => a.field === 'action:assign',
    );
    expect(warning).toBeUndefined();
  });

  it('does not flag a custom action warning when appMetadata.actions is absent (unannotated app)', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I manage tasks.',
      acceptanceCriteria: ['A task can be assigned to a user.'],
      appMetadata: {
        appName: 'TaskApp',
        models: [{ name: 'Task', fields: [{ name: 'title' }] }],
        // actions not provided — brownfield app not yet annotated
      },
    };
    const result = runQaAnalystAgent(req);
    const warning = result.ambiguities.find(
      (a: AmbiguityReport) => a.field === 'action:assign',
    );
    expect(warning).toBeUndefined();
  });

  it('flags an info ambiguity for entities not present in appMetadata', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I manage Invoices and Tasks.',
      acceptanceCriteria: ['An Invoice can be created with amount and date.'],
      appMetadata: {
        appName: 'BillingApp',
        models: [{ name: 'Task', fields: [] }],
      },
    };
    const result = runQaAnalystAgent(req);
    const info = result.ambiguities.find(
      (a: AmbiguityReport) => a.field === 'Invoices' && a.severity === 'info',
    );
    expect(info).toBeDefined();
  });

  it('reports no ambiguities for a well-specified request with matching metadata', () => {
    const wellSpecified: RequirementRequest = {
      userStory: 'As a user I create and view Tasks.',
      acceptanceCriteria: [
        'A Task can be created with a title.',
        'The task list displays all existing Tasks.',
      ],
      appMetadata: {
        appName: 'CleanApp',
        models: [{ name: 'Task', fields: [{ name: 'title' }] }],
      },
    };
    const result = runQaAnalystAgent(wellSpecified);
    expect(result.ambiguities).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Actor extraction
// ---------------------------------------------------------------------------

describe('runQaAnalystAgent — actor extraction', () => {
  it('extracts the actor role from a standard "As a X, I want" user story', () => {
    const result = runQaAnalystAgent(MINIMAL_REQUEST);
    expect(result.functionalScope.actors).toContain('project manager');
  });

  it('extracts the actor from "As an admin" phrasing', () => {
    const req: RequirementRequest = {
      userStory: 'As an admin I want to manage users.',
      acceptanceCriteria: ['An admin can delete any user record.'],
    };
    const result = runQaAnalystAgent(req);
    expect(result.functionalScope.actors).toContain('admin');
  });

  it('returns an empty actors array when the user story has no "As a" pattern', () => {
    const req: RequirementRequest = {
      userStory: 'Users need to be able to create tasks.',
      acceptanceCriteria: ['A task can be created with a title.'],
    };
    const result = runQaAnalystAgent(req);
    expect(result.functionalScope.actors).toEqual([]);
  });

  it('actors array is always present on the result', () => {
    const result = runQaAnalystAgent(MINIMAL_REQUEST);
    expect(Array.isArray(result.functionalScope.actors)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Business flow grouping
// ---------------------------------------------------------------------------

describe('runQaAnalystAgent — business flows', () => {
  it('groups behaviors by matched entity into named flows', () => {
    const result = runQaAnalystAgent(FULL_REQUEST);
    const flowNames = result.businessFlows.map((f: BusinessFlow) => f.name);
    expect(flowNames.some((n) => n.toLowerCase().includes('task'))).toBe(true);
  });

  it('each business flow references valid behavior IDs', () => {
    const result = runQaAnalystAgent(FULL_REQUEST);
    const validIds = new Set(result.testableBehaviors.map((b) => b.id));
    for (const flow of result.businessFlows) {
      for (const id of flow.behaviorIds) {
        expect(validIds.has(id)).toBe(true);
      }
    }
  });

  it('returns an empty businessFlows array when there are no behaviors', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I interact with the system.',
      acceptanceCriteria: [],
    };
    const result = runQaAnalystAgent(req);
    expect(result.businessFlows).toEqual([]);
  });

  it('places unmatched behaviors in a "General flow" bucket', () => {
    const req: RequirementRequest = {
      userStory: 'as a user i want to do stuff.',
      acceptanceCriteria: ['it should work correctly.'],
    };
    const result = runQaAnalystAgent(req);
    // No entity detected → all behaviors fall into General flow
    const general = result.businessFlows.find((f: BusinessFlow) => f.name === 'General flow');
    expect(general).toBeDefined();
    expect(general?.behaviorIds).toHaveLength(result.testableBehaviors.length);
  });

  it('businessFlows is always an array on the result', () => {
    const result = runQaAnalystAgent(MINIMAL_REQUEST);
    expect(Array.isArray(result.businessFlows)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Risk detection
// ---------------------------------------------------------------------------

describe('runQaAnalystAgent — risk detection', () => {
  it('returns an empty risks array when no risks are detected', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I create tasks.',
      acceptanceCriteria: [
        'A task can be created with a title.',
        'The form should not submit without a title.',
      ],
    };
    const result = runQaAnalystAgent(req);
    expect(result.risks).toEqual([]);
  });

  it('flags a security risk when a permission behavior has no negative counterpart', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I manage records.',
      acceptanceCriteria: ['Only admin users can delete records.'],
    };
    const result = runQaAnalystAgent(req);
    const securityRisk = result.risks.find((r: RiskReport) => r.riskType === 'security');
    expect(securityRisk).toBeDefined();
    expect(securityRisk?.description).toMatch(/unauthorized/i);
  });

  it('does not flag a security risk when a permission behavior has a negative sibling', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I manage records.',
      acceptanceCriteria: [
        'Only admin users can delete records.',
        'A non-admin user should not be able to delete records.',
      ],
    };
    const result = runQaAnalystAgent(req);
    const securityRisk = result.risks.find((r: RiskReport) => r.riskType === 'security');
    expect(securityRisk).toBeUndefined();
  });

  it('flags a performance risk when pagination keyword is present but no boundary behavior exists', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I view records.',
      acceptanceCriteria: ['The list supports pagination for large datasets.'],
    };
    const result = runQaAnalystAgent(req);
    const perfRisk = result.risks.find((r: RiskReport) => r.riskType === 'performance');
    expect(perfRisk).toBeDefined();
    expect(perfRisk?.behaviorId).toBe('GENERAL');
  });

  it('risks array is always present on the result', () => {
    const result = runQaAnalystAgent(MINIMAL_REQUEST);
    expect(Array.isArray(result.risks)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// QA Test Generator Agent
// ---------------------------------------------------------------------------

describe('runQaTestGeneratorAgent — input validation', () => {
  it('throws when analysis is null', () => {
    expect(() => runQaTestGeneratorAgent(null as unknown as QAAnalysisResult)).toThrow(
      '[QATestGeneratorAgent] Invalid analysis payload.',
    );
  });

  it('throws when testableBehaviors is missing', () => {
    expect(() =>
      runQaTestGeneratorAgent({} as unknown as QAAnalysisResult),
    ).toThrow('[QATestGeneratorAgent] Invalid analysis payload.');
  });

  it('does not throw for a valid analysis with behaviors', () => {
    const analysis = runQaAnalystAgent(MINIMAL_REQUEST);
    expect(() => runQaTestGeneratorAgent(analysis)).not.toThrow();
  });
});

describe('runQaTestGeneratorAgent — output structure', () => {
  let analysis: QAAnalysisResult;
  let result: QATestGeneratorResult;

  beforeEach(() => {
    analysis = runQaAnalystAgent(FULL_REQUEST);
    result = runQaTestGeneratorAgent(analysis);
  });

  it('returns a unique UUID id on each call', () => {
    const a = runQaTestGeneratorAgent(analysis);
    const b = runQaTestGeneratorAgent(analysis);
    expect(a.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(a.id).not.toBe(b.id);
  });

  it('sets analysisId to the source analysis id', () => {
    expect(result.analysisId).toBe(analysis.id);
  });

  it('sets generatedAt to a valid ISO 8601 timestamp', () => {
    expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
  });

  it('generates one test case per testable behavior', () => {
    expect(result.testCases).toHaveLength(analysis.testableBehaviors.length);
  });
});

describe('runQaTestGeneratorAgent — test case definitions', () => {
  let analysis: QAAnalysisResult;
  let result: QATestGeneratorResult;

  beforeEach(() => {
    analysis = runQaAnalystAgent(FULL_REQUEST);
    result = runQaTestGeneratorAgent(analysis);
  });

  it('assigns sequential IDs starting from TC-001', () => {
    expect(result.testCases[0].id).toBe('TC-001');
    expect(result.testCases[1].id).toBe('TC-002');
  });

  it('maps each test case behaviorId to the corresponding TestableBehavior id', () => {
    result.testCases.forEach((tc, idx) => {
      expect(tc.behaviorId).toBe(analysis.testableBehaviors[idx].id);
    });
  });

  it('prefixes each test case title with "Verify"', () => {
    for (const tc of result.testCases) {
      expect(tc.title).toMatch(/^Verify /);
    }
  });

  it('inherits the behavior type on the test case', () => {
    result.testCases.forEach((tc, idx) => {
      expect(tc.type).toBe(analysis.testableBehaviors[idx].type);
    });
  });

  it('includes non-empty preconditions on every test case', () => {
    for (const tc of result.testCases) {
      expect(tc.preconditions.length).toBeGreaterThan(0);
    }
  });

  it('sets assertions equal to the behavior expectedOutcomes', () => {
    result.testCases.forEach((tc, idx) => {
      expect(tc.assertions).toEqual(analysis.testableBehaviors[idx].expectedOutcomes);
    });
  });
});

describe('runQaTestGeneratorAgent — Gherkin scenarios', () => {
  it('prefixes the scenario title with "Scenario:"', () => {
    const analysis = runQaAnalystAgent(MINIMAL_REQUEST);
    const result = runQaTestGeneratorAgent(analysis);
    for (const tc of result.testCases) {
      expect(tc.gherkin.title).toMatch(/^Scenario:/);
    }
  });

  it('generates at least one Gherkin step per test case', () => {
    const analysis = runQaAnalystAgent(FULL_REQUEST);
    const result = runQaTestGeneratorAgent(analysis);
    for (const tc of result.testCases) {
      expect(tc.gherkin.steps.length).toBeGreaterThan(0);
    }
  });

  it('starts Gherkin steps with Given', () => {
    const analysis = runQaAnalystAgent(MINIMAL_REQUEST);
    const result = runQaTestGeneratorAgent(analysis);
    for (const tc of result.testCases) {
      if (tc.gherkin.steps.length > 0) {
        expect(tc.gherkin.steps[0].keyword).toBe('Given');
      }
    }
  });

  it('includes a When step when there are multiple flow steps', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I create tasks.',
      acceptanceCriteria: ['A user can create a Task from the task list.'],
    };
    const analysis = runQaAnalystAgent(req);
    const result = runQaTestGeneratorAgent(analysis);
    const steps = result.testCases[0].gherkin.steps;
    const whenStep = steps.find((s) => s.keyword === 'When');
    expect(whenStep).toBeDefined();
  });

  it('includes a Then step derived from expectedOutcomes', () => {
    const analysis = runQaAnalystAgent(MINIMAL_REQUEST);
    const result = runQaTestGeneratorAgent(analysis);
    for (const tc of result.testCases) {
      const thenStep = tc.gherkin.steps.find((s) => s.keyword === 'Then');
      expect(thenStep).toBeDefined();
    }
  });

  it('uses And for subsequent steps beyond the first When-level step', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I delete tasks.',
      acceptanceCriteria: ['A task can be deleted by its creator.'],
    };
    const analysis = runQaAnalystAgent(req);
    const result = runQaTestGeneratorAgent(analysis);
    const steps = result.testCases[0].gherkin.steps;
    const andSteps = steps.filter((s) => s.keyword === 'And');
    expect(andSteps.length).toBeGreaterThanOrEqual(1);
  });

  it('produces only Given and Then when there is exactly one flow step', () => {
    const singleStepAnalysis: QAAnalysisResult = {
      id: 'test-id',
      appName: 'TestApp',
      functionalScope: { coveredEntities: [], actors: [], testedEndpoints: [] },
      testableBehaviors: [
        {
          id: 'TB-001',
          title: 'Single step behavior',
          flowSteps: ['Navigate to the section'],
          expectedOutcomes: ['The section is visible'],
          type: 'positive',
        },
      ],
      businessFlows: [],
      ambiguities: [],
      risks: [],
      rulesApplied: [],
      generatedAt: new Date().toISOString(),
    };
    const result = runQaTestGeneratorAgent(singleStepAnalysis);
    const steps = result.testCases[0].gherkin.steps;
    const keywords = steps.map((s) => s.keyword);
    expect(keywords).toContain('Given');
    expect(keywords).toContain('Then');
    expect(keywords).not.toContain('When');
  });
});

describe('runQaTestGeneratorAgent — coverage metrics', () => {
  it('sets totalBehaviors equal to the number of testable behaviors', () => {
    const analysis = runQaAnalystAgent(FULL_REQUEST);
    const result = runQaTestGeneratorAgent(analysis);
    expect(result.coverage.totalBehaviors).toBe(analysis.testableBehaviors.length);
  });

  it('sets coveredBehaviors equal to the number of generated test cases', () => {
    const analysis = runQaAnalystAgent(FULL_REQUEST);
    const result = runQaTestGeneratorAgent(analysis);
    expect(result.coverage.coveredBehaviors).toBe(result.testCases.length);
  });

  it('reports 100% coverage when every behavior has a test case', () => {
    const analysis = runQaAnalystAgent(FULL_REQUEST);
    const result = runQaTestGeneratorAgent(analysis);
    expect(result.coverage.percentage).toBe(100);
  });

  it('reports 0% coverage when no behaviors exist', () => {
    const emptyAnalysis: QAAnalysisResult = {
      id: 'empty-id',
      appName: 'EmptyApp',
      functionalScope: { coveredEntities: [], actors: [], testedEndpoints: [] },
      testableBehaviors: [],
      businessFlows: [],
      ambiguities: [],
      risks: [],
      rulesApplied: [],
      generatedAt: new Date().toISOString(),
    };
    const result = runQaTestGeneratorAgent(emptyAnalysis);
    expect(result.coverage.percentage).toBe(0);
    expect(result.coverage.totalBehaviors).toBe(0);
    expect(result.coverage.coveredBehaviors).toBe(0);
    expect(result.coverage.uncoveredBehaviors).toEqual([]);
  });

  it('returns an array for uncoveredBehaviors', () => {
    const analysis = runQaAnalystAgent(MINIMAL_REQUEST);
    const result = runQaTestGeneratorAgent(analysis);
    expect(Array.isArray(result.coverage.uncoveredBehaviors)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// QA Automation Coder Agent
// ---------------------------------------------------------------------------

describe('runQaAutomationCoderAgent — input validation', () => {
  it('throws error on null or invalid input', () => {
    expect(() => runQaAutomationCoderAgent(null as unknown as QATestGeneratorResult)).toThrow(
      '[QAAutomationCoderAgent] Invalid generator result payload.',
    );
    expect(() => runQaAutomationCoderAgent({} as unknown as QATestGeneratorResult)).toThrow(
      '[QAAutomationCoderAgent] Invalid generator result payload.',
    );
  });
});

describe('runQaAutomationCoderAgent — output and generation rules', () => {
  let generatorResult: QATestGeneratorResult;

  beforeEach(() => {
    const analysis = runQaAnalystAgent(MINIMAL_REQUEST);
    generatorResult = runQaTestGeneratorAgent(analysis);
  });

  it('generates a unique UUID id and matches details', () => {
    const res = runQaAutomationCoderAgent(generatorResult);
    expect(res.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(res.generatorId).toBe(generatorResult.id);
    expect(new Date(res.generatedAt).toISOString()).toBe(res.generatedAt);
    expect(res.generatedFiles).toHaveLength(1);
    expect(res.generatedFiles[0].filePath).toBe(
      'apps/project-management-app/frontend/tests/e2e/GeneratedWorkflows.spec.ts',
    );
  });

  it('generates string blocks containing exact DrumrTestKit imports and setup', () => {
    const res = runQaAutomationCoderAgent(generatorResult);
    const content = res.generatedFiles[0].content;

    expect(content).toContain(`import { test } from '@playwright/test';`);
    expect(content).toContain(`import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';`);
    expect(content).toContain(`let testKit!: DrumrTestKit;`);
    expect(content).toContain(`testKit = new DrumrTestKit(page);`);
    expect(content).toContain(`await testKit.loginAsAdmin();`);
    expect(content).not.toContain(`login('admin@drumr.com'`);
  });

  it('compiles correct Playwright test descriptions matching titles from test generator', () => {
    const res = runQaAutomationCoderAgent(generatorResult);
    const content = res.generatedFiles[0].content;

    for (const tc of generatorResult.testCases) {
      const safeTitle = tc.title.replace(/`/g, '\\`');
      expect(content).toContain(`test(\`${safeTitle}\`, async () => {`);
    }
  });

  it('contains NO raw Playwright or DOM selectors under standard DOM-agnostic rules', () => {
    const res = runQaAutomationCoderAgent(generatorResult);
    const content = res.generatedFiles[0].content;

    expect(content).not.toContain('page.locator');
    expect(content).not.toContain('page.$');
    expect(content).not.toContain('page.click');
    expect(content).not.toContain('page.fill');
  });

  it('contains no ghost sub-namespace calls that do not exist on DrumrTestKit', () => {
    const res = runQaAutomationCoderAgent(generatorResult);
    const content = res.generatedFiles[0].content;

    expect(content).not.toContain('testKit.views.');
    expect(content).not.toContain('testKit.tables.');
    expect(content).not.toContain('testKit.forms.');
    expect(content).not.toContain('testKit.feedback.');
  });

  it('emits waitForTable before clickCreateInTable', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I create tasks.',
      acceptanceCriteria: ['A user can create a Task from the task list.'],
    };
    const analysis = runQaAnalystAgent(req);
    const result = runQaTestGeneratorAgent(analysis);
    const res = runQaAutomationCoderAgent(result);
    const content = res.generatedFiles[0].content;

    const tableIdx = content.indexOf('waitForTable');
    const createIdx = content.indexOf('clickCreateInTable');
    expect(tableIdx).toBeGreaterThanOrEqual(0);
    expect(createIdx).toBeGreaterThan(tableIdx);
  });

  it('emits submitSave for edit-flow test cases', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I edit tasks.',
      acceptanceCriteria: ['A task can be edited to update its title or due date.'],
    };
    const analysis = runQaAnalystAgent(req);
    const result = runQaTestGeneratorAgent(analysis);
    const editTc = result.testCases.find((tc) => /edit|update/i.test(tc.title));
    if (editTc) {
      const res = runQaAutomationCoderAgent(result);
      const content = res.generatedFiles[0].content;
      expect(content).toContain('submitSave');
    }
  });

  it('translates delete-flow steps to manage dropdown + confirmDelete', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I delete tasks.',
      // Use the infinitive "delete" so ACTION_STEP_MAP \bdelete\b regex fires
      acceptanceCriteria: ['An admin can delete a task from the task list.'],
    };
    const analysis = runQaAnalystAgent(req);
    const result = runQaTestGeneratorAgent(analysis);
    const res = runQaAutomationCoderAgent(result);
    const content = res.generatedFiles[0].content;

    expect(content).toContain('clickManageDropdown');
    expect(content).toContain('clickManageOption');
    expect(content).toContain('confirmDelete');
  });

  it('translates locate/open steps to clickTableRow and waitForDrawer', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I view tasks.',
      acceptanceCriteria: ['A task detail view can be opened from the task list.'],
    };
    const analysis = runQaAnalystAgent(req);
    const result = runQaTestGeneratorAgent(analysis);
    const res = runQaAutomationCoderAgent(result);
    const content = res.generatedFiles[0].content;

    expect(content).toContain('clickTableRow');
  });

  it('translates search-flow steps to searchInTable', () => {
    const req: RequirementRequest = {
      userStory: 'As a user I search for tasks.',
      acceptanceCriteria: ['A user can search for a task by title in the task list.'],
    };
    const analysis = runQaAnalystAgent(req);
    const result = runQaTestGeneratorAgent(analysis);
    const res = runQaAutomationCoderAgent(result);
    const content = res.generatedFiles[0].content;

    expect(content).toContain('searchInTable');
  });

  it('emits TODO comments (not empty steps) for genuinely unrecognised step text', () => {
    const analysis = runQaAnalystAgent(MINIMAL_REQUEST);
    const result = runQaTestGeneratorAgent(analysis);
    const res = runQaAutomationCoderAgent(result);
    const content = res.generatedFiles[0].content;

    // Any unrecognised step must emit a // TODO: comment — not a silent empty block
    if (content.includes('// ')) {
      expect(content).toMatch(/\/\/ TODO:/);
    }
  });

  it('escapes backtick characters in test case titles to avoid broken generated TypeScript', () => {
    const analysis = runQaAnalystAgent(MINIMAL_REQUEST);
    const resultWithBacktick = runQaTestGeneratorAgent(analysis);
    // Inject a backtick into the first title to test escaping
    resultWithBacktick.testCases[0].title = 'Verify the `title` field is required';
    const res = runQaAutomationCoderAgent(resultWithBacktick);
    const content = res.generatedFiles[0].content;
    // The backtick inside the title must be escaped (backslash + backtick in the output string)
    expect(content).toContain('Verify the \\`title\\` field is required');
    // An unescaped backtick immediately after 'the ' would indicate broken TS syntax
    expect(content).not.toContain('test(`Verify the `title`');
  });
});
