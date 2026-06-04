const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '../../utils/allFunctions.js');

function getFunctionBody(source, functionName) {
  const start = source.indexOf(`async function ${functionName}`);
  if (start === -1) return '';
  const nextFunction = source.indexOf('\nasync function ', start + 1);
  return source.slice(start, nextFunction === -1 ? source.length : nextFunction);
}

describe('allFunctions Prisma connection usage', () => {
  test('awaits async getPrisma in Facebook webhook entry points', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    for (const functionName of [
      'handleFacebookComment',
      'handleFacebookMessage',
      'diagnoseFacebookSending'
    ]) {
      const body = getFunctionBody(source, functionName);
      expect(body).toContain('const prisma = await getPrisma();');
      expect(body).not.toContain('const prisma = getPrisma();');
    }
  });

  test('guards Facebook comment handling against page-authored self loops', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const body = getFunctionBody(source, 'handleFacebookComment');

    expect(source).toContain('function isPageAuthoredFacebookComment');
    expect(body).toContain('isPageAuthoredFacebookComment({ senderId, pageId: resolvedPageId, pageData })');
    expect(body).toContain('Ignoring page-authored comment');
  });
});
