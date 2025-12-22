// Wrapper to run backend TypeScript script from repo root when npm scripts/ts-node resolve path incorrectly
try {
  const dotenv = require('./backend/node_modules/dotenv');
  dotenv.config({ path: './backend/.env' });
} catch (e) {}
require('./backend/node_modules/ts-node/register');
require('./backend/src/scripts/hashPasswords.ts');
