import { randomUUID } from 'node:crypto';
import type {
  QAAnalysisResult,
  QATestGeneratorResult,
  TestCaseDefinition,
  GherkinStep,
} from './types.js';

/**
 * Transforms flow steps and expected outcomes into structured Gherkin steps.
 */
function buildGherkinSteps(flowSteps: string[], expectedOutcomes: string[]): GherkinStep[] {
  if (flowSteps.length === 0 || expectedOutcomes.length === 0) {
    throw new Error(
      '[QATestGeneratorAgent] Each behavior must include at least one flow step and one expected outcome.',
    );
  }

  const steps: GherkinStep[] = [];

  // First step becomes Given
  if (flowSteps.length > 0) {
    steps.push({ keyword: 'Given', text: flowSteps[0] });
  }

  // Intermediate flow steps mapped to When/And
  for (let i = 1; i < flowSteps.length; i++) {
    steps.push({ keyword: i === 1 ? 'When' : 'And', text: flowSteps[i] });
  }

  // Expected outcomes mapped to Then/And
  expectedOutcomes.forEach((outcome, idx) => {
    steps.push({ keyword: idx === 0 ? 'Then' : 'And', text: outcome });
  });

  return steps;
}

export function runQaTestGeneratorAgent(analysis: QAAnalysisResult): QATestGeneratorResult {
  if (!analysis || typeof analysis.id !== 'string' || !Array.isArray(analysis.testableBehaviors)) {
    throw new Error('[QATestGeneratorAgent] Invalid analysis payload.');
  }

  const testCases: TestCaseDefinition[] = [];
  const behaviors = analysis.testableBehaviors;

  behaviors.forEach((behavior, index) => {
    const tcId = `TC-${String(index + 1).padStart(3, '0')}`;

    testCases.push({
      id: tcId,
      behaviorId: behavior.id,
      title: `Verify ${behavior.title}`,
      type: behavior.type,
      gherkin: {
        title: `Scenario: ${behavior.title}`,
        steps: buildGherkinSteps(behavior.flowSteps, behavior.expectedOutcomes),
      },
      preconditions: ['User is authenticated on lower environments', 'Clean state initialized'],
      assertions: behavior.expectedOutcomes,
    });
  });

  const total = behaviors.length;
  const covered = testCases.length;
  const percentage = total > 0 ? Math.round((covered / total) * 100) : 0;

  return {
    id: randomUUID(),
    analysisId: analysis.id,
    testCases,
    coverage: {
      totalBehaviors: total,
      coveredBehaviors: covered,
      percentage,
      uncoveredBehaviors: [],
    },
    generatedAt: new Date().toISOString(),
  };
}
