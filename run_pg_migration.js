const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Supabase Connection String format: postgresql://[user]:[password]@[host]:[port]/[db-name]
// If user has the DB password, unfortunately we do not have it unless it's in the environment variable or requested.
// Usually users provide SUPABASE_SERVICE_ROLE_KEY or Anon key.
