#!/usr/bin/env node

/**
 * Script to create an admin account for testing
 * Run with: node scripts/create-admin-account.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.log('Please ensure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env');
  process.exit(1);
}

// Create Supabase admin client with service key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdminUser() {
  console.log('🔧 Creating admin account...\n');

  const email = 'admin@whosehouse.com';
  const password = 'Admin123!';
  const fullName = 'System Administrator';

  try {
    // Create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'admin',
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  Admin user already exists');

        // Try to update the existing user's metadata
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (!listError && users) {
          const existingUser = users.users.find((u) => u.email === email);
          if (existingUser) {
            // Update profile
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                role: 'admin',
                full_name: fullName,
                is_active: true,
              })
              .eq('id', existingUser.id);

            if (!updateError) {
              console.log('✅ Updated existing user to admin role');
              console.log('\n📧 Login credentials:');
              console.log(`   Email: ${email}`);
              console.log(`   Password: ${password}`);
              process.exit(0);
            }
          }
        }
      } else {
        throw authError;
      }
    }

    if (authData?.user) {
      // Create profile record
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role: 'admin',
        organization_id: '00000000-0000-0000-0000-000000000000', // Default org
        is_active: true,
      });

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        // Try to clean up the auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        process.exit(1);
      }

      console.log('✅ Admin account created successfully!\n');
      console.log('📧 Login credentials:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log('\n🔐 Please change the password after first login');
      console.log('🌐 You can now access the admin portal at /(admin)/dashboard');
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

// Run the script
createAdminUser();
