#!/usr/bin/env node
// Usage: node scripts/sql.mjs "SELECT * FROM custom_rss_feeds LIMIT 5"
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = process.argv[2];
if (!sql) { console.error('Usage: node scripts/sql.mjs "SQL QUERY"'); process.exit(1); }

const { data, error } = await supabase.rpc('exec_sql', { query: sql });
if (error) {
  // Fallback: if exec_sql doesn't exist, try direct table query for simple SELECTs
  const tableMatch = sql.match(/from\s+(\w+)/i);
  if (tableMatch) {
    const { data: d2, error: e2 } = await supabase.from(tableMatch[1]).select('*').limit(10);
    if (e2) console.error('Error:', e2.message);
    else console.table(d2);
  } else {
    console.error('Error:', error.message);
    console.error('Tip: For DDL statements, use Supabase Dashboard > SQL Editor');
  }
} else {
  console.table(data);
}
