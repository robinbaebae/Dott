/**
 * DB Migration Script
 *
 * Adds:
 * 1. tasks.urgent (boolean, default false)
 * 2. tasks.important (boolean, default false)
 * 3. insights.tags (text[], default '{}')
 *
 * Run: npx tsx scripts/migrate.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(url, key);

async function checkColumn(table: string, column: string): Promise<boolean> {
  // Try selecting the column — if it doesn't exist, we get an error
  const { error } = await supabase.from(table).select(column).limit(1);
  return !error;
}

async function migrate() {
  console.log('🔍 Checking current schema...\n');

  // Check tasks.urgent
  const hasUrgent = await checkColumn('tasks', 'urgent');
  console.log(`  tasks.urgent: ${hasUrgent ? '✅ exists' : '❌ missing'}`);

  // Check tasks.important
  const hasImportant = await checkColumn('tasks', 'important');
  console.log(`  tasks.important: ${hasImportant ? '✅ exists' : '❌ missing'}`);

  // Check insights.tags
  const hasTags = await checkColumn('insights', 'tags');
  console.log(`  insights.tags: ${hasTags ? '✅ exists' : '❌ missing'}`);

  const missing: string[] = [];
  if (!hasUrgent) missing.push('ALTER TABLE tasks ADD COLUMN urgent boolean DEFAULT false;');
  if (!hasImportant) missing.push('ALTER TABLE tasks ADD COLUMN important boolean DEFAULT false;');
  if (!hasTags) missing.push("ALTER TABLE insights ADD COLUMN tags text[] DEFAULT '{}';");

  if (missing.length === 0) {
    console.log('\n✅ All columns already exist. No migration needed.');
    return;
  }

  console.log('\n⚠️  Missing columns detected. Run the following SQL in Supabase SQL Editor:\n');
  console.log('─'.repeat(60));
  console.log(missing.join('\n'));
  console.log('─'.repeat(60));
  console.log('\n📋 Go to: https://supabase.com/dashboard → SQL Editor → paste & run');
}

migrate().catch(console.error);
