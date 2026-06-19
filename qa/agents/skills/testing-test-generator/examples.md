# Examples: QA test generator output

> Sample `QATestGeneratorResult` JSON produced by Stage 2. Based on the task creation `QAAnalysisResult` in `testing-qa-analyst/examples.md`.

---

## Output (`stage-2-test-cases.json`)

```json
{
  "id": "qa-generator-001",
  "analysisId": "qa-analysis-001",
  "testCases": [
    {
      "id": "TC-001",
      "behaviorId": "TB-001",
      "title": "Task requires a title to be saved",
      "type": "positive",
      "preconditions": [
        "User is authenticated",
        "Task list page is open"
      ],
      "gherkin": {
        "title": "Task requires a title to be saved",
        "steps": [
          { "keyword": "Given", "text": "I am authenticated and on the task list page" },
          { "keyword": "When", "text": "I open the Create Task form and fill in the title and all required fields" },
          { "keyword": "And", "text": "I submit the form" },
          { "keyword": "Then", "text": "the new task is visible in the task list" }
        ]
      },
      "assertions": [
        "Task appears in the list after creation"
      ]
    },
    {
      "id": "TC-002",
      "behaviorId": "TB-002",
      "title": "Task must be linked to a project",
      "type": "positive",
      "preconditions": [
        "User is authenticated",
        "At least one project exists",
        "Task list page is open"
      ],
      "gherkin": {
        "title": "Task must be linked to a project",
        "steps": [
          { "keyword": "Given", "text": "I am authenticated, at least one project exists, and I am on the task list page" },
          { "keyword": "When", "text": "I open the Create Task form, fill in the title, select a project, and submit" },
          { "keyword": "Then", "text": "the task is created and shows the selected project" }
        ]
      },
      "assertions": [
        "Task is created with the selected project name visible"
      ]
    },
    {
      "id": "TC-003",
      "behaviorId": "TB-003",
      "title": "Task title must not exceed 255 characters",
      "type": "boundary",
      "preconditions": [
        "User is authenticated",
        "Task list page is open"
      ],
      "gherkin": {
        "title": "Task title must not exceed 255 characters",
        "steps": [
          { "keyword": "Given", "text": "I am authenticated and on the task list page" },
          { "keyword": "When", "text": "I open the Create Task form, enter a title with 256 characters, and submit" },
          { "keyword": "Then", "text": "a validation error message is shown" },
          { "keyword": "But", "text": "the task is not added to the list" }
        ]
      },
      "assertions": [
        "Validation error message is visible",
        "Task does not appear in the list"
      ]
    },
    {
      "id": "TC-004",
      "behaviorId": "TB-004",
      "title": "Only authenticated users can create tasks",
      "type": "permission",
      "preconditions": [
        "App is running"
      ],
      "gherkin": {
        "title": "Only authenticated users can create tasks",
        "steps": [
          { "keyword": "Given", "text": "the app is running" },
          { "keyword": "When", "text": "I log in with valid credentials" },
          { "keyword": "And", "text": "I navigate to the task list and click Create" },
          { "keyword": "Then", "text": "the Create Task form is accessible" }
        ]
      },
      "assertions": [
        "Unauthenticated navigation is redirected to login",
        "Authenticated users can reach the Create Task form"
      ]
    },
    {
      "id": "TC-005",
      "behaviorId": "TB-005",
      "title": "Invalid task submission shows validation error",
      "type": "negative",
      "preconditions": [
        "User is authenticated",
        "Task list page is open"
      ],
      "gherkin": {
        "title": "Invalid task submission shows validation error",
        "steps": [
          { "keyword": "Given", "text": "I am authenticated and on the task list page" },
          { "keyword": "When", "text": "I open the Create Task form and submit it without filling required fields" },
          { "keyword": "Then", "text": "a validation error is shown for each missing required field" },
          { "keyword": "But", "text": "the task is not saved" }
        ]
      },
      "assertions": [
        "Validation errors are shown for each missing required field",
        "Task does not appear in the list"
      ]
    }
  ],
  "coverage": {
    "totalBehaviors": 5,
    "coveredBehaviors": 5,
    "percentage": 100,
    "uncoveredBehaviors": []
  },
  "generatedAt": "2026-06-18T00:00:00.000Z"
}
```
