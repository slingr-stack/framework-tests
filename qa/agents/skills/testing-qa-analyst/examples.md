# Examples: QA Analysis Output

> Sample `QAAnalysisResult` JSON produced by the analyst stage. Use this as the expected shape for stage 1 output.

---

## Input

**User story:**
> As a project manager, I want to create tasks with a title, description, and assigned project so that work can be tracked.

**Acceptance criteria:**
1. A task must have a title (required).
2. A task must be linked to a project (required).
3. A task title must not exceed 255 characters.
4. Only authenticated users can create tasks.
5. An invalid task (missing required fields) must show a validation error.

---

## Output (`stage-1-analysis.json`)

```json
{
  "id": "qa-analysis-001",
  "appName": "project-management-app",
  "functionalScope": {
    "coveredEntities": ["Task"],
    "actors": ["project manager", "authenticated user"],
    "testedEndpoints": ["/tasks"]
  },
  "testableBehaviors": [
    {
      "id": "TB-001",
      "title": "Task requires a title to be saved",
      "type": "positive",
      "flowSteps": [
        "Navigate to the task list",
        "Click 'Create'",
        "Fill in required fields",
        "Submit the form"
      ],
      "expectedOutcomes": [
        "Task is created and visible in the list"
      ]
    },
    {
      "id": "TB-002",
      "title": "Task must be linked to a project",
      "type": "positive",
      "flowSteps": [
        "Navigate to the task list",
        "Click 'Create'",
        "Select a project from the Project field",
        "Submit the form"
      ],
      "expectedOutcomes": [
        "Task is created with the selected project assigned"
      ]
    },
    {
      "id": "TB-003",
      "title": "Task title must not exceed 255 characters",
      "type": "boundary",
      "flowSteps": [
        "Navigate to the task list",
        "Click 'Create'",
        "Enter a title with 256 characters",
        "Submit the form"
      ],
      "expectedOutcomes": [
        "Validation error is shown and task is not created"
      ]
    },
    {
      "id": "TB-004",
      "title": "Only authenticated users can create tasks",
      "type": "permission",
      "flowSteps": [
        "Navigate to the login page",
        "Enter credentials",
        "Submit the login form",
        "Navigate to the task list",
        "Click 'Create'"
      ],
      "expectedOutcomes": [
        "Unauthenticated access is blocked",
        "Authenticated users can proceed to the create form"
      ]
    },
    {
      "id": "TB-005",
      "title": "Invalid task submission shows validation error",
      "type": "negative",
      "flowSteps": [
        "Navigate to the task list",
        "Click 'Create'",
        "Leave required fields empty",
        "Submit the form"
      ],
      "expectedOutcomes": [
        "Validation error is shown",
        "Task is not created"
      ]
    }
  ],
  "businessFlows": [
    {
      "name": "Task Creation",
      "behaviorIds": ["TB-001", "TB-002", "TB-003", "TB-004", "TB-005"]
    }
  ],
  "ambiguities": [],
  "risks": [
    {
      "behaviorId": "TB-004",
      "riskType": "missing-permission",
      "description": "Permission boundary: only authenticated users can create tasks. Missing this could expose task creation to anonymous users."
    },
    {
      "behaviorId": "TB-003",
      "riskType": "missing-boundary",
      "description": "Title length constraint is untested. Exceeding the limit could cause a database error instead of a user-facing validation message."
    }
  ],
  "rulesApplied": [
    "permission > boundary > negative > positive classification priority"
  ],
  "generatedAt": "2026-06-18T00:00:00.000Z"
}
```

---

## Ambiguity report example

When a behavior cannot be fully resolved:

```json
{
  "ambiguities": [
    {
      "field": "assignee",
      "finding": "Criterion 2 mentions 'assigned project' but does not specify whether the project field is a reference or a free-text input.",
      "severity": "warning",
      "recommendation": "Confirm field type in app metadata or with the product owner before generating the test."
    }
  ]
}
```
