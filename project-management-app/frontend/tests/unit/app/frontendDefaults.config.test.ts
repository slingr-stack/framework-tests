import {
  clearDataModelDefaults,
  getFieldDefaults,
} from '@drumr/framework-frontend';

type FieldEntry = {
  component?: {
    id?: string;
    options?: Record<string, unknown>;
  };
};

function asEntries(config: unknown): FieldEntry[] {
  return Array.isArray(config)
    ? (config as FieldEntry[])
    : [config as FieldEntry];
}

describe('project-management frontend defaults config', () => {
  beforeAll(async () => {
    clearDataModelDefaults();
    await import('../../../src/tasks/config/dataModels');
    await import('../../../src/users/config/dataModels');
    await import('../../../src/projects/config/dataModels');
  });

  afterAll(() => {
    clearDataModelDefaults();
  });

  it('compiles Task wrapper defaults to canonical specs', () => {
    const tagsDefaults = asEntries(getFieldDefaults('Task', 'tags'));
    expect(tagsDefaults[0]?.component?.id).toBe('array.list');
    expect(
      (tagsDefaults[0]?.component?.options?.component as { id?: string })?.id,
    ).toBe('text.label');

    expect(tagsDefaults[1]?.component?.id).toBe('array.list');
    expect(tagsDefaults[1]?.component?.options?.sorting).toBe(false);
    expect(
      (tagsDefaults[1]?.component?.options?.component as { id?: string })?.id,
    ).toBe('text.input');
    expect(
      (
        tagsDefaults[1]?.component?.options?.component as {
          options?: Record<string, unknown>;
        }
      )?.options?.placeholder,
    ).toBe('Enter tag');

    const metadataDefaults = asEntries(getFieldDefaults('Task', 'metadata'));
    expect(metadataDefaults[0]?.component?.id).toBe('array.list');
    expect(
      (metadataDefaults[0]?.component?.options?.component as { id?: string })
        ?.id,
    ).toBe('nestedModel.list');

    const attachmentsDefaults = asEntries(
      getFieldDefaults('Task', 'attachments'),
    );
    expect(attachmentsDefaults[0]?.component?.id).toBe('array.list');
    expect(
      (attachmentsDefaults[0]?.component?.options?.component as { id?: string })
        ?.id,
    ).toBe('file.label');
  });

  it('compiles User wrapper defaults to canonical specs', () => {
    const rolesDefaults = asEntries(getFieldDefaults('User', 'roles'));
    expect(rolesDefaults[0]?.component?.id).toBe('choice.label');

    const addressesDefaults = asEntries(getFieldDefaults('User', 'addresses'));
    expect(addressesDefaults[0]?.component?.id).toBe('array.list');
    expect(
      (addressesDefaults[0]?.component?.options?.component as { id?: string })
        ?.id,
    ).toBe('nestedModel.accordion');
    expect(
      (
        addressesDefaults[0]?.component?.options?.component as {
          options?: Record<string, unknown>;
        }
      )?.options?.defaultExpanded,
    ).toBe(false);
  });

  it('compiles ProjectReport sections defaults to canonical list specs', () => {
    const sectionsDefaults = asEntries(
      getFieldDefaults('ProjectReport', 'sections'),
    );
    expect(sectionsDefaults[0]?.component?.id).toBe('array.list');
    expect(
      (sectionsDefaults[0]?.component?.options?.component as { id?: string })
        ?.id,
    ).toBe('text.label');

    expect(sectionsDefaults[1]?.component?.id).toBe('array.list');
    expect(
      (sectionsDefaults[1]?.component?.options?.component as { id?: string })
        ?.id,
    ).toBe('text.input');
    expect(
      (
        sectionsDefaults[1]?.component?.options?.component as {
          options?: Record<string, unknown>;
        }
      )?.options?.placeholder,
    ).toBe('Enter section');
  });

  it('compiles Project support defaults to canonical card specs', () => {
    const supportDefaults = asEntries(getFieldDefaults('Project', 'support'));
    expect(supportDefaults[0]?.component?.id).toBe('nestedModel.card');
    expect(supportDefaults[0]?.component?.options?.size).toBe('large');
    expect(typeof supportDefaults[0]?.component?.options?.label).toBe(
      'function',
    );
  });
});
