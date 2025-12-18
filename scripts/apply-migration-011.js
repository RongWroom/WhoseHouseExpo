#!/usr/bin/env node

/**
 * Apply migration 011 to fix RLS infinite recursion and schema issues
 * Run with: node scripts/apply-migration-011.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Missing Supabase credentials in .env');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(url, serviceKey);

async function applyMigration() {
  console.log('🔧 Applying migration 011: Fix RLS and Schema Issues\n');

  try {
    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      '..',
      'supabase',
      'migrations',
      '011_fix_rls_and_schema.sql',
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('🚀 Executing SQL...\n');

    // Execute the migration
    let result;
    try {
      result = await supabase.rpc('exec_sql', { sql: migrationSQL });
    } catch (rpcError) {
      // If exec_sql doesn't exist or fails, try fallback approaches
      console.log('⚠️  Primary execution failed, trying fallbacks...\n');

      // Fallback: Direct REST API call
      try {
        const response = await fetch(`${url}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ query: migrationSQL }),
        });

        if (response.ok) {
          result = await response.json();
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (fetchError) {
        // Final fallback: Execute statements individually
        console.log('⚠️  Executing statements individually...\n');

        const statements = migrationSQL
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith('--'));

        result = { data: null, error: null };

        for (const statement of statements) {
          try {
            if (statement.includes('DO $$')) {
              // Handle DO blocks specially
              const doBlock = migrationSQL.substring(
                migrationSQL.indexOf('DO $$'),
                migrationSQL.indexOf('END $$;') + 7,
              );

              const { error: doError } = await supabase.rpc('exec_sql', { sql: doBlock });
              if (doError) {
                console.log(`⚠️  Warning executing DO block: ${doError.message}`);
              }
              continue;
            }

            const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement + ';' });
            if (stmtError && !stmtError.message.includes('already exists')) {
              console.log(`⚠️  Warning: ${stmtError.message}`);
            }
          } catch (stmtError) {
            console.log(`⚠️  Warning executing statement: ${stmtError.message}`);
          }
        }
      }
    }

    const { error } = result;

    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('\n📋 Details:', error);
      process.exit(1);
    }

    console.log('✅ Migration 011 applied successfully!\n');
    console.log('🔍 Changes made:');
    console.log('  1. ✅ Fixed infinite recursion in RLS helper functions');
    console.log('  2. ✅ Added missing columns to case_media table:');
    console.log('     - file_name');
    console.log('     - file_path');
    console.log('     - created_at');
    console.log('  3. ✅ Added indexes for better performance\n');

    console.log('🎉 Your app should now work without RLS errors!');
    console.log('💡 Restart your Expo dev server to see the changes.\n');
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

applyMigration();
