#!/usr/bin/env node
/**
 * Seed the database with realistic test data
 * Run with: node scripts/seed-database.js
 *
 * This will create:
 * - 3 social workers
 * - 5 foster carers
 * - 8 cases (children)
 * - Case assignments
 * - Sample messages
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Missing Supabase credentials in .env');
  console.error('   Required: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(url, serviceKey);

// Test data
const socialWorkers = [
  { email: 'sarah.williams@test.com', password: 'Test123!', fullName: 'Sarah Williams' },
  { email: 'james.brown@test.com', password: 'Test123!', fullName: 'James Brown' },
  { email: 'emma.davis@test.com', password: 'Test123!', fullName: 'Emma Davis' },
];

const fosterCarers = [
  { email: 'david.carter@test.com', password: 'Test123!', fullName: 'David Carter' },
  { email: 'lisa.johnson@test.com', password: 'Test123!', fullName: 'Lisa Johnson' },
  { email: 'michael.smith@test.com', password: 'Test123!', fullName: 'Michael Smith' },
  { email: 'rachel.green@test.com', password: 'Test123!', fullName: 'Rachel Green' },
  { email: 'tom.anderson@test.com', password: 'Test123!', fullName: 'Tom Anderson' },
];

const children = [
  { name: 'Alex Thompson', age: 10, status: 'active' },
  { name: 'Jordan Lee', age: 8, status: 'active' },
  { name: 'Casey Morgan', age: 12, status: 'active' },
  { name: 'Riley Parker', age: 9, status: 'active' },
  { name: 'Jamie Wilson', age: 11, status: 'active' },
  { name: 'Taylor Brown', age: 7, status: 'pending' },
  { name: 'Morgan Davis', age: 13, status: 'pending' },
  { name: 'Quinn Miller', age: 10, status: 'closed' },
];

const sampleMessages = [
  'Hi, just checking in on how things are going today.',
  'Alex had a great day at school! Got a gold star in math.',
  'Could we schedule a meeting to discuss the upcoming review?',
  "Thank you for the update. Let's plan to meet next Tuesday.",
  "Just wanted to let you know that Jordan's behavior has improved significantly.",
  "I've noticed some concerns I'd like to discuss with you.",
  'The school trip permission form needs to be signed by Friday.',
  'Great news! Casey made the football team!',
];

async function createUser(email, password, fullName, role) {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role,
      },
    });

    if (error) {
      if (
        error.message.includes('already registered') ||
        error.message.includes('already exists')
      ) {
        // User exists, try to get their ID
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const user = existingUser.users.find((u) => u.email === email);
        if (user) {
          return { userId: user.id, existed: true };
        }
        throw new Error(`User exists but couldn't retrieve ID: ${email}`);
      }
      throw error;
    }

    return { userId: data.user.id, existed: false };
  } catch (err) {
    console.error(`   ❌ Error creating ${email}:`, err.message);
    return null;
  }
}

async function getOrganizationId() {
  // Get the first organization or create a default one
  const { data } = await supabase.from('organizations').select('id').limit(1).single();

  if (data) {
    return data.id;
  }

  // Create default organization
  const { data: newOrg, error: createError } = await supabase
    .from('organizations')
    .insert({
      name: 'Test Care Services',
      settings: { timezone: 'UTC' },
    })
    .select('id')
    .single();

  if (createError) {
    throw new Error(`Failed to create organization: ${createError.message}`);
  }

  return newOrg.id;
}

async function seedDatabase() {
  console.log('\n🌱 Seeding WhoseHouse Database...\n');

  try {
    // Get or create organization
    console.log('📋 Setting up organization...');
    const orgId = await getOrganizationId();
    console.log(`   ✅ Organization ID: ${orgId}\n`);

    // Create or find social workers
    console.log('👔 Setting up Social Workers...');
    const swIds = [];
    for (const sw of socialWorkers) {
      // First try to find existing user
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', sw.email)
        .single();

      if (existingUser) {
        swIds.push(existingUser.id);
        console.log(`   ⚠️  Using existing: ${sw.email}`);
        // Update organization
        await supabase
          .from('profiles')
          .update({ organization_id: orgId })
          .eq('id', existingUser.id);
      } else {
        const result = await createUser(sw.email, sw.password, sw.fullName, 'social_worker');
        if (result) {
          swIds.push(result.userId);
          console.log(`   ✅ Created: ${sw.email}`);
          // Update profile with organization
          await supabase
            .from('profiles')
            .update({ organization_id: orgId })
            .eq('id', result.userId);
        }
      }
    }

    // Create or find foster carers
    console.log('\n🏠 Setting up Foster Carers...');
    const fcIds = [];
    for (const fc of fosterCarers) {
      // First try to find existing user
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', fc.email)
        .single();

      if (existingUser) {
        fcIds.push(existingUser.id);
        console.log(`   ⚠️  Using existing: ${fc.email}`);
        // Update organization
        await supabase
          .from('profiles')
          .update({ organization_id: orgId })
          .eq('id', existingUser.id);
      } else {
        const result = await createUser(fc.email, fc.password, fc.fullName, 'foster_carer');
        if (result) {
          fcIds.push(result.userId);
          console.log(`   ✅ Created: ${fc.email}`);
          // Update profile with organization
          await supabase
            .from('profiles')
            .update({ organization_id: orgId })
            .eq('id', result.userId);
        }
      }
    }

    if (swIds.length === 0 || fcIds.length === 0) {
      console.error('\n❌ Failed to create required users');
      process.exit(1);
    }

    // Create or update cases
    console.log('\n👶 Creating Cases...');
    const caseIds = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const socialWorkerId = swIds[i % swIds.length]; // Distribute among social workers
      const fosterCarerId = i < fosterCarers.length ? fcIds[i] : null; // Assign to foster carers

      const caseNumber = `CASE-2024-${String(i + 1).padStart(4, '0')}`;
      const { data: existingCase } = await supabase
        .from('cases')
        .select('id')
        .eq('case_number', caseNumber)
        .single();

      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .upsert(
          {
            case_number: caseNumber,
            status: child.status,
            social_worker_id: socialWorkerId,
            foster_carer_id: fosterCarerId,
            metadata: {
              child_name: child.name,
              age: child.age,
              school: 'Local Primary School',
              placement_date: new Date(
                Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
          },
          { onConflict: 'case_number' },
        )
        .select('id')
        .single();

      if (caseError || !caseData) {
        console.log(`   ❌ Error creating case for ${child.name}:`, caseError?.message);
      } else {
        caseIds.push({ id: caseData.id, socialWorkerId, fosterCarerId });
        console.log(
          existingCase
            ? `   🔁 Updated: ${child.name} (${child.status})`
            : `   ✅ Created: ${child.name} (${child.status})`,
        );
      }
    }

    // Create sample messages
    console.log('\n💬 Creating Sample Messages...');
    let messageCount = 0;
    for (const caseItem of caseIds) {
      if (!caseItem.fosterCarerId) continue; // Skip cases without foster carers

      // Reset any existing sample messages for this case so the seed can run idempotently
      await supabase.from('messages').delete().eq('case_id', caseItem.id);

      // Create 2-4 messages per case
      const numMessages = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < numMessages; i++) {
        const isFromSocialWorker = Math.random() > 0.5;
        const message = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];

        const { error: msgError } = await supabase.from('messages').insert({
          sender_id: isFromSocialWorker ? caseItem.socialWorkerId : caseItem.fosterCarerId,
          recipient_id: isFromSocialWorker ? caseItem.fosterCarerId : caseItem.socialWorkerId,
          case_id: caseItem.id,
          content: message,
          status: Math.random() > 0.3 ? 'read' : 'delivered', // Most messages are read
          is_urgent: Math.random() > 0.9, // 10% chance of urgent
          created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

        if (msgError) {
          console.error(`   ❌ Message insert failed for case ${caseItem.id}: ${msgError.message}`);
          continue;
        }

        messageCount++;
      }
    }
    console.log(`   ✅ Created ${messageCount} messages\n`);

    // Summary
    console.log('✨ Database Seeded Successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${swIds.length} Social Workers`);
    console.log(`   - ${fcIds.length} Foster Carers`);
    console.log(`   - ${caseIds.length} Cases`);
    console.log(`   - ${messageCount} Messages\n`);

    console.log('🔐 Test Accounts:');
    console.log('\n   Social Workers:');
    socialWorkers.forEach((sw) => {
      console.log(`   - ${sw.email} / ${sw.password}`);
    });
    console.log('\n   Foster Carers:');
    fosterCarers.forEach((fc) => {
      console.log(`   - ${fc.email} / ${fc.password}`);
    });
    console.log('\n');
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seedDatabase();
