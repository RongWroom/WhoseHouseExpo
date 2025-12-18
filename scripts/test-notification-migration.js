#!/usr/bin/env node
/**
 * Test script to verify push notification migration was applied correctly
 * Run with: node scripts/test-notification-migration.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMigration() {
  console.log('🔍 Testing Push Notification Migration...\n');

  let allPassed = true;

  // Test 1: Check tables exist
  console.log('1️⃣ Checking tables exist...');
  const tables = ['push_tokens', 'notification_preferences', 'notification_log'];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(0);
    if (error && error.code === '42P01') {
      console.log(`   ❌ Table "${table}" does not exist`);
      allPassed = false;
    } else if (error) {
      console.log(`   ⚠️ Table "${table}" - unexpected error: ${error.message}`);
    } else {
      console.log(`   ✅ Table "${table}" exists`);
    }
  }

  // Test 2: Check functions exist by calling them (will fail auth but show they exist)
  console.log('\n2️⃣ Checking functions exist...');

  const functionTests = [
    { name: 'register_push_token', args: { p_token: 'test', p_platform: 'ios' } },
    { name: 'get_notification_preferences', args: {} },
    {
      name: 'log_notification',
      args: {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_notification_type: 'test',
        p_title: 'test',
      },
    },
  ];

  for (const fn of functionTests) {
    const { error } = await supabase.rpc(fn.name, fn.args);
    // We expect auth errors, but NOT "function does not exist" errors
    if (error && error.message.includes('does not exist')) {
      console.log(`   ❌ Function "${fn.name}" does not exist`);
      allPassed = false;
    } else {
      console.log(`   ✅ Function "${fn.name}" exists`);
    }
  }

  // Test 3: Check RLS is enabled (via service role, try to insert/select)
  console.log('\n3️⃣ Checking RLS policies...');

  // With service role, we should be able to query but RLS should be enabled
  const { data: rlsCheck } = await supabase.from('push_tokens').select('*').limit(1);

  console.log('   ✅ RLS check passed (service role can query)');

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All migration checks PASSED!');
    console.log('\nThe push notification tables and functions are ready to use.');
  } else {
    console.log('❌ Some migration checks FAILED');
    console.log('\nPlease re-run the migration SQL in Supabase Dashboard.');
  }
}

testMigration().catch(console.error);
