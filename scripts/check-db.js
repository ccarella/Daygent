const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkDatabase() {
  console.log('Checking database setup...\n');

  // Check if users table exists
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'users');

  if (tablesError) {
    console.error('Error checking tables:', tablesError);
    return;
  }

  console.log('Users table exists:', tables.length > 0);

  // Check RLS policies
  const { data: policies, error: policiesError } = await supabase
    .rpc('get_policies', { table_name: 'users' })
    .catch(() => ({ data: null, error: 'RPC function not available' }));

  if (policiesError) {
    console.log('Could not check RLS policies (this is normal)');
  } else if (policies) {
    console.log('\nRLS Policies on users table:');
    policies.forEach(policy => {
      console.log(`- ${policy.policyname}: ${policy.cmd}`);
    });
  }

  // Try to insert a test user with service role
  console.log('\nTesting service role access...');
  const testUserId = 'test-' + Date.now();
  
  const { error: insertError } = await supabase
    .from('users')
    .insert({
      id: '00000000-0000-0000-0000-000000000000',
      email: `test${Date.now()}@example.com`,
      name: 'Test User',
    });

  if (insertError) {
    console.log('Service role insert test failed:', insertError.message);
    console.log('This might mean the users table needs the migration applied.');
  } else {
    console.log('Service role can insert into users table ✓');
    
    // Clean up test user
    await supabase
      .from('users')
      .delete()
      .eq('id', '00000000-0000-0000-0000-000000000000');
  }
}

checkDatabase();