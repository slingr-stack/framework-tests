import { randomUUID } from 'node:crypto';
import type { QATestGeneratorResult, QAAutomationCoderResult, TestCaseDefinition } from './types.js';

/**
 * Derives a best-effort entity route from a Gherkin step text.
 * Looks for a capitalized noun immediately before "list", "section", or "page"
 * and converts it to a kebab-case path (e.g. "Tasks list" → "/tasks").
 * Falls back to "/entity-list" when no entity can be detected so the generated
 * file still compiles — the developer replaces it with the real route.
 */
function deriveEntityPath(stepText: string): string {
  const match = stepText.match(/navigate to the\s+(\w+)\s+(?:list|section|page)/i);
  if (match) {
    return `/${match[1].toLowerCase()}s`;
  }
  return '/entity-list';
}

/**
 * Translates Gherkin keyword and text steps into physical DrumrTestKit API code strings.
 *
 * API source: qa/drumr-test-kit.ts — only methods that exist on the real DrumrTestKit
 * class are emitted. Every pattern maps to an exact method signature from that file.
 *
 * Coverage map (step text → DrumrTestKit call):
 *   "Navigate to …"         → navigateTo(path) + waitForTable()
 *   "Locate the target …"   → clickTableRow('<Entity Name>')
 *   "Open the record …"     → waitForDrawer()
 *   "Click "Create/New""    → clickCreateInTable()
 *   "Click "Edit""          → clickManageDropdown() + clickManageOption(/edit/i)
 *   "Click "Delete""        → clickManageDropdown() + clickManageOption(/delete/i)
 *   "Click "Archive""       → clickManageOption(/archive/i)
 *   "Confirm the deletion"  → confirmDelete()
 *   "Confirm the action"    → confirmDelete()
 *   "Fill in …"             → waitForForm('title') + fillField('title', value)
 *   "Modify the fields"     → clearAndFillField('title', 'Updated Value')
 *   "Submit the form"       → submitCreate() or submitSave() (edit flows)
 *   "Save changes"          → submitSave()
 *   "Enter a search …"      → searchInTable('search term')
 *   "Submit or trigger …"   → (handled inside searchInTable — no-op step)
 *   "Apply filter …"        → searchInTable('filter term')
 *   "Observe the filtered …"→ expectTableContains('Expected Value')
 *   "Enter credentials"     → (handled by loginAsAdmin in beforeEach — no-op step)
 *   "Trigger the logout …"  → logout()
 *   "Click "Assign""        → clickActionsDropdown() + clickActionOption(/assign/i)
 *   "Select the assignee"   → selectFirstOption('Assignee')
 *   "Confirm the assignment"→ executeDialog(/assign/i)
 *   "Verify: …" / "reflects"→ expectSuccessFeedback() or expectTextVisible(text)
 */
function translateStepsToCode(steps: { keyword: string; text: string }[], tc: TestCaseDefinition): string {
  const isEditFlow = tc.type === 'positive' && /edit|update/.test(tc.title.toLowerCase());
  let code = '';

  for (const step of steps) {
    const rawText = step.text.toLowerCase();

    // Navigation
    if (rawText.includes('navigate to the login')) {
      code += `    // beforeEach already calls loginAsAdmin() — login navigation is handled there\n`;
    } else if (rawText.includes('navigate to')) {
      const path = deriveEntityPath(step.text);
      code += `    await testKit.navigateTo('${path}');\n`;
      code += `    await testKit.waitForTable();\n`;

    // Record location and detail opening
    } else if (rawText.includes('locate the target') || rawText.includes('open the target')) {
      code += `    await testKit.clickTableRow('Record Name');\n`;
    } else if (rawText.includes('open the record')) {
      code += `    await testKit.waitForDrawer();\n`;
    } else if (rawText.includes('open the target record')) {
      code += `    await testKit.clickTableRow('Record Name');\n`;
      code += `    await testKit.waitForDrawer();\n`;

    // Create action
    } else if (rawText.includes('click') && (rawText.includes('create') || rawText.includes('new'))) {
      code += `    await testKit.clickCreateInTable();\n`;

    // Edit action
    } else if (rawText.includes('click') && rawText.includes('edit')) {
      code += `    await testKit.clickManageDropdown();\n`;
      code += `    await testKit.clickManageOption(/edit/i);\n`;

    // Delete action
    } else if (rawText.includes('click') && rawText.includes('delete')) {
      code += `    await testKit.clickManageDropdown();\n`;
      code += `    await testKit.clickManageOption(/delete/i);\n`;

    // Archive action
    } else if (rawText.includes('click') && rawText.includes('archive')) {
      code += `    await testKit.clickManageOption(/archive/i);\n`;

    // Assign action
    } else if (rawText.includes('click') && rawText.includes('assign')) {
      code += `    await testKit.clickActionsDropdown();\n`;
      code += `    await testKit.clickActionOption(/assign/i);\n`;

    // Confirmation dialogs
    } else if (rawText.includes('confirm the deletion')) {
      code += `    await testKit.confirmDelete();\n`;
    } else if (rawText.includes('confirm the action') || rawText.includes('confirm the assignment')) {
      code += `    await testKit.confirmDelete();\n`;

    // Form filling — initial create
    } else if (rawText.includes('fill in required') || rawText.includes('fill in the required')) {
      code += `    await testKit.waitForForm('title');\n`;
      code += `    await testKit.fillField('title', 'Automated Test Value');\n`;

    // Form filling — edit / modify
    } else if (rawText.includes('modify the field')) {
      code += `    await testKit.clearAndFillField('title', 'Updated Value');\n`;

    // Select assignee
    } else if (rawText.includes('select the assignee')) {
      code += `    await testKit.selectFirstOption('Assignee');\n`;

    // Submit / save
    } else if (rawText.includes('submit') || rawText.includes('save changes') || rawText.includes('click "save"')) {
      code += isEditFlow
        ? `    await testKit.submitSave();\n`
        : `    await testKit.submitCreate();\n`;

    // Search and filter
    } else if (rawText.includes('enter a search') || rawText.includes('apply filter')) {
      code += `    await testKit.searchInTable('Search Term');\n`;
    } else if (rawText.includes('submit or trigger the filter')) {
      // No-op — searchInTable submits automatically
      code += `    // Filter submission is handled automatically by searchInTable\n`;
    } else if (rawText.includes('observe the filtered') || rawText.includes('observe filtered')) {
      code += `    await testKit.expectTableContains('Expected Value');\n`;

    // Auth steps
    } else if (rawText.includes('enter credentials') || rawText.includes('submit the login')) {
      // No-op — handled by loginAsAdmin in beforeEach
      code += `    // Credentials are resolved via loginAsAdmin() in beforeEach\n`;

    // Logout
    } else if (rawText.includes('logout') || rawText.includes('log out') || rawText.includes('trigger the logout')) {
      code += `    await testKit.logout();\n`;

    // Assertions / verify / reflects
    } else if (rawText.startsWith('verify:') || rawText.startsWith('the system reflects')) {
      const assertionText = step.text.replace(/^verify:\s*/i, '').replace(/^the system reflects:\s*/i, '');
      code += `    await testKit.expectTextVisible('${assertionText.replace(/'/g, "\\'")}');\n`;
    } else if (rawText.includes('reflects') || rawText.includes('verify')) {
      code += `    await testKit.expectSuccessFeedback();\n`;

    // Unrecognised steps — emit a comment so the developer fills them in
    } else {
      code += `    // TODO: ${step.keyword} ${step.text}\n`;
    }
  }
  return code;
}

export function runQaAutomationCoderAgent(generatorResult: QATestGeneratorResult): QAAutomationCoderResult {
  if (!generatorResult || !generatorResult.testCases) {
    throw new Error('[QAAutomationCoderAgent] Invalid generator result payload.');
  }

  const generatedFiles: QAAutomationCoderResult['generatedFiles'] = [];

  // Group or compile code blocks based on TestCaseDefinition Gherkin models
  let fileContent = `import { test } from '@playwright/test';\n`;
  fileContent += `import { DrumrTestKit } from '@drumr/framework-qa/drumr-test-kit';\n\n`;

  fileContent += `test.describe('Automated App Workflows', () => {\n`;
  // Use the definite assignment assertion (!) so TypeScript strict mode does not flag
  // testKit as possibly-uninitialized — beforeEach guarantees assignment before each test.
  fileContent += `  let testKit!: DrumrTestKit;\n\n`;

  fileContent += `  test.beforeEach(async ({ page }) => {\n`;
  fileContent += `    testKit = new DrumrTestKit(page);\n`;
  fileContent += `    await testKit.loginAsAdmin();\n`;
  fileContent += `  });\n\n`;

  for (const tc of generatorResult.testCases) {
    // Use backtick delimiters so single-quotes inside titles (e.g. "shouldn't") don't
    // break the generated TypeScript string. Escape any backtick that appears in the title.
    const safeTitle = tc.title.replace(/`/g, '\\`');
    fileContent += `  test(\`${safeTitle}\`, async () => {\n`;
    fileContent += translateStepsToCode(tc.gherkin.steps, tc);
    fileContent += `  });\n\n`;
  }

  fileContent += `});\n`;

  generatedFiles.push({
    filePath: 'apps/project-management-app/frontend/tests/e2e/GeneratedWorkflows.spec.ts',
    content: fileContent,
  });

  return {
    id: randomUUID(),
    generatorId: generatorResult.id,
    generatedFiles,
    generatedAt: new Date().toISOString(),
  };
}
