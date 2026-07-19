const fs = require('fs/promises');
const os = require('os');
const path = require('path');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClientAsync: jest.fn(),
  executeWithRetry: jest.fn(async (operation) => operation()),
}));

const {
  resolveThemePresetsDirectory,
} = require('../../services/storefrontThemeCatalogService');

const createThemeFile = async (directory, name) => {
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, `${name}.json`),
    JSON.stringify({ id: name, name }),
    'utf8',
  );
};

describe('resolveThemePresetsDirectory', () => {
  let tempRoot;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), 'storefront-theme-presets-'),
    );
  });

  afterEach(async () => {
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
      tempRoot = null;
    }
  });

  test('prefers the readable directory with the larger manifest set', async () => {
    const staleDirectory = path.join(tempRoot, 'frontend', 'src', 'storefront', 'themes');
    const activeDirectory = path.join(
      tempRoot,
      'frontend2',
      'src',
      'storefront',
      'themes',
    );

    await createThemeFile(staleDirectory, 'modern-minimal');
    await createThemeFile(activeDirectory, 'modern-minimal');
    await createThemeFile(activeDirectory, 'bold-fashion');
    await createThemeFile(activeDirectory, 'elegant-luxe');

    const result = await resolveThemePresetsDirectory({
      candidateDirs: [staleDirectory, activeDirectory],
    });

    expect(result.directory).toBe(activeDirectory);
    expect(result.files).toEqual([
      'bold-fashion.json',
      'elegant-luxe.json',
      'modern-minimal.json',
    ]);
  });

  test('throws a clear error when no preset directory can be read', async () => {
    await expect(
      resolveThemePresetsDirectory({
        candidateDirs: [path.join(tempRoot, 'missing-themes')],
      }),
    ).rejects.toThrow(/Unable to resolve storefront theme presets directory/i);
  });
});
