# Example: Frontend View Integration Test

> A generic pattern for testing a view component that renders real children and mocks the service/API boundary.

## File Location

```text
frontend/tests/integration/myFeatureView.integration.spec.tsx
```

## Full Example

```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyFeatureView } from '../../src/<domain>/views/MyFeatureView';
import * as myService from '../../src/<domain>/services/myService';

// ── Mock the service boundary ──────────────────────────────────
jest.mock('../../src/services/myService');
const mockedService = jest.mocked(myService);

// ── Test data ──────────────────────────────────────────────────
const MOCK_ITEMS = [
  { id: '1', name: 'Alpha', status: 'active' },
  { id: '2', name: 'Beta', status: 'completed' },
];

describe('MyFeatureView — Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Success case ────────────────────────────────────────────

  it('should render items from the service', async () => {
    mockedService.fetchItems.mockResolvedValue(MOCK_ITEMS);

    render(<MyFeatureView />);

    // Wait for async data to appear — avoids act() warnings
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('2 items')).toBeInTheDocument();
  });

  // ── Empty state case ────────────────────────────────────────

  it('should render empty state when no items exist', async () => {
    mockedService.fetchItems.mockResolvedValue([]);

    render(<MyFeatureView />);

    expect(await screen.findByText(/no items/i)).toBeInTheDocument();
  });

  // ── Error case ──────────────────────────────────────────────

  it('should render error message when service fails', async () => {
    mockedService.fetchItems.mockRejectedValue(new Error('Network error'));

    render(<MyFeatureView />);

    expect(await screen.findByText(/failed to load/i)).toBeInTheDocument();
  });

  // ── User interaction ────────────────────────────────────────

  it('should filter items when user types in search', async () => {
    mockedService.fetchItems.mockResolvedValue(MOCK_ITEMS);

    render(<MyFeatureView />);

    // Wait for items to render
    expect(await screen.findByText('Alpha')).toBeInTheDocument();

    // Simulate user typing in search
    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'Beta');

    // Assert filtered results
    await waitFor(() => {
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
    });
  });

  // ── Form submit flow ───────────────────────────────────────

  it('should submit the form and show success feedback', async () => {
    mockedService.fetchItems.mockResolvedValue(MOCK_ITEMS);
    mockedService.saveItem.mockResolvedValue({ id: '3', name: 'Gamma', status: 'active' });

    render(<MyFeatureView />);
    expect(await screen.findByText('Alpha')).toBeInTheDocument();

    // Fill and submit
    await userEvent.click(screen.getByRole('button', { name: /add item/i }));
    await userEvent.type(screen.getByLabelText(/name/i), 'Gamma');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    // Assert success feedback
    await waitFor(() => {
      expect(mockedService.saveItem).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Gamma' }),
      );
    });
  });
});
```

## Key Patterns Demonstrated

| Pattern | Where |
|---------|-------|
| Real view render | `render(<MyFeatureView />)` — not a stub |
| Mocked service boundary | `jest.mock('../../src/services/myService')` |
| Async data loading | `findByText` — waits for async render, avoids `act()` warnings |
| Success case | First test — items render from service data |
| Empty state case | Second test — empty array response |
| Error case | Third test — rejected promise |
| User interaction | Fourth test — `userEvent.type()` for search filtering |
| Form submit flow | Fifth test — fill + submit + verify service call |
| No Playwright | No `page`, `locator`, or browser APIs |
| No raw DOM selectors | RTL queries only: `getByText`, `getByRole`, `getByPlaceholderText`, `getByLabelText` |
| No global console suppression | Each test manages its own expectations |

## When to Use `DrumrIntegrationTestKit`

For frontend integration tests, the kit is most useful when:

- **Asserting mocked API responses** before they reach the component — e.g., verifying that a service stub returns the expected shape with `kit.expectBodyContains()`.
- **Setup/cleanup lifecycle** — `kit.withSetupAndCleanup()` for tests that need scoped teardown.

For most DOM-level assertions, prefer RTL's `screen.getByText()` / `expect(...).toBeInTheDocument()` — they are more readable for component output.

```typescript
// Using kit for response-shape validation before feeding to the component:
import { DrumrIntegrationTestKit, IntegrationResponse } from '@drumr/qa';

const kit = new DrumrIntegrationTestKit();
const response: IntegrationResponse = { status: 200, body: MOCK_ITEMS };
kit.expectOk(response);
kit.expectBodyArray(response);
```

## Avoiding Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `page.goto()` or `page.locator()` | Use RTL: `render()` + `screen.getByText()` |
| `await act(async () => { render(...) })` | Use `await screen.findByText()` instead |
| `jest.spyOn(console, 'error').mockImplementation()` at top | Suppress narrowly inside specific tests only |
| `expect(wrapper.state())` | Assert user-visible output: `screen.getByText()` |
| Snapshot-only assertions | Add behavioral assertions — snapshots alone are not integration tests |
