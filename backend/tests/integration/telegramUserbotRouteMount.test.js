const fs = require('fs');
const path = require('path');

describe('Telegram userbot route registration', () => {
  test('server mounts legacy userbot chat routes under /api/v1/userbot', () => {
    const serverSource = fs.readFileSync(
      path.resolve(__dirname, '../../server.js'),
      'utf8'
    );

    expect(serverSource).toContain(
      'const userbotRoutes = require("./routes/userbotRoutes");'
    );
    expect(serverSource).toContain(
      'app.use("/api/v1/userbot", userbotRoutes);'
    );
  });
});

