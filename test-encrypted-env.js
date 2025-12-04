// Test encrypted environment variables and Supabase connection
import { loadEncryptedEnvToProcess } from './src/lib/envEncryption.js';
import { createClient } from '@supabase/supabase-js';

async function testEncryptedEnv() {
  console.log('=== Testing Encrypted Environment Variables ===\n');

  // Step 1: Load encrypted environment variables
  console.log('Step 1: Loading Encrypted Environment Variables');
  console.log('------------------------------------------------');
  try {
    const loadedVars = await loadEncryptedEnvToProcess(true);
    const keys = Object.keys(loadedVars);
    console.log(`✅ Loaded ${keys.length} encrypted variables:`);
    keys.forEach(key => {
      const value = loadedVars[key];
      if (key.includes('KEY') || key.includes('ANON')) {
        console.log(`   ${key}: ${value.substring(0, 20)}...${value.substring(value.length - 10)} (masked)`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    });
    console.log('');
  } catch (error) {
    console.error(`❌ Failed to load: ${error.message}\n`);
    process.exit(1);
  }

  // Step 2: Check required Supabase credentials
  console.log('Step 2: Verify Supabase Credentials');
  console.log('------------------------------------------------');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  console.log(`SUPABASE_URL: ${supabaseUrl ? '✅ ' + supabaseUrl : '❌ Not set'}`);
  console.log(`SUPABASE_ANON_KEY: ${supabaseKey ? '✅ Set (length: ' + supabaseKey.length + ')' : '❌ Not set'}`);
  console.log('');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing!\n');
    process.exit(1);
  }

  // Step 3: Test Supabase connection
  console.log('Step 3: Testing Supabase Connection');
  console.log('------------------------------------------------');
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      db: { schema: 'public' }
    });

    console.log('✅ Supabase client created');

    // Test query
    const { data, error } = await supabase
      .from('analyst_records')
      .select('ticker', { count: 'exact', head: true });

    if (error) {
      console.error(`❌ Database query failed: ${error.message}`);
      console.error(`   Error code: ${error.code}`);
      process.exit(1);
    }

    console.log('✅ Database connection successful\n');
  } catch (err) {
    console.error(`❌ Exception: ${err.message}\n`);
    process.exit(1);
  }

  // Step 4: Check analyst_records for tickers A and AA
  console.log('Step 4: Query Tickers A and AA');
  console.log('------------------------------------------------');
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      db: { schema: 'public' }
    });

    const { data, error, count } = await supabase
      .from('analyst_records')
      .select('ticker, published_date, analyst_name, price_trend', { count: 'exact' })
      .in('ticker', ['A', 'AA'])
      .order('published_date', { ascending: false })
      .limit(5);

    if (error) {
      console.error(`❌ Query failed: ${error.message}`);
      process.exit(1);
    }

    console.log(`✅ Found ${count} total records for tickers A, AA`);
    console.log(`Showing first ${data.length} records:\n`);

    for (const record of data) {
      console.log(`Ticker: ${record.ticker}, Date: ${record.published_date}, Analyst: ${record.analyst_name}`);

      if (record.price_trend) {
        const trendKeys = Object.keys(record.price_trend);
        const filledKeys = trendKeys.filter(key => {
          const val = record.price_trend[key];
          return val && typeof val === 'object' && val.close !== null;
        });
        console.log(`  price_trend: ${filledKeys.length}/${trendKeys.length} horizons filled`);

        if (filledKeys.length > 0) {
          const sampleKey = filledKeys[0];
          const sampleData = record.price_trend[sampleKey];
          console.log(`  Sample (${sampleKey}): open=${sampleData.open}, close=${sampleData.close}, date=${sampleData.actualDate}`);
        } else {
          console.log(`  All horizons are null or empty`);
        }
      } else {
        console.log(`  price_trend: NULL`);
      }
      console.log('');
    }
  } catch (err) {
    console.error(`❌ Exception: ${err.message}\n`);
    process.exit(1);
  }

  console.log('=== All Tests Passed ===');
  console.log('✅ Encrypted environment variables working');
  console.log('✅ Supabase connection working');
  console.log('\nIf refreshAnalystLog still not updating, check server logs during execution.');
}

testEncryptedEnv();
