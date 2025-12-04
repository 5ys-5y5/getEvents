// Test Supabase connection and analyst_records table
import { supabase } from './src/config/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('=== Supabase Connection Test ===\n');

  // Step 1: Check environment variables
  console.log('Step 1: Environment Variables');
  console.log('------------------------------');
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✅ Set (length: ' + process.env.SUPABASE_ANON_KEY.length + ')' : '❌ Not set'}`);
  console.log(`USE_DATABASE: ${process.env.USE_DATABASE || 'not set (defaults to true)'}\n`);

  // Step 2: Check Supabase client initialization
  console.log('Step 2: Supabase Client');
  console.log('------------------------------');
  if (!supabase) {
    console.log('❌ Supabase client is NULL');
    console.log('\n🔧 SOLUTION:');
    console.log('1. Create .env file from .env.example');
    console.log('2. Add your Supabase credentials:');
    console.log('   SUPABASE_URL=https://your-project.supabase.co');
    console.log('   SUPABASE_ANON_KEY=your-anon-key-here');
    console.log('3. Restart the server\n');
    process.exit(1);
  }
  console.log('✅ Supabase client initialized\n');

  // Step 3: Test database connection
  console.log('Step 3: Database Connection');
  console.log('------------------------------');
  try {
    const { data, error } = await supabase
      .from('analyst_records')
      .select('ticker, published_date, analyst_name, price_trend')
      .limit(1);

    if (error) {
      console.log(`❌ Database query failed: ${error.message}`);
      console.log(`Error code: ${error.code}`);
      process.exit(1);
    }

    console.log('✅ Database connection successful');
    console.log(`Found ${data.length} record(s)\n`);
  } catch (err) {
    console.log(`❌ Exception: ${err.message}\n`);
    process.exit(1);
  }

  // Step 4: Check analyst_records for tickers A and AA
  console.log('Step 4: Query Tickers A and AA');
  console.log('------------------------------');
  try {
    const { data, error, count } = await supabase
      .from('analyst_records')
      .select('ticker, published_date, analyst_name, price_trend', { count: 'exact' })
      .in('ticker', ['A', 'AA'])
      .order('published_date', { ascending: false })
      .limit(5);

    if (error) {
      console.log(`❌ Query failed: ${error.message}`);
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
        console.log(`  Sample data: ${JSON.stringify(record.price_trend.D1 || record.price_trend.D7 || 'null').substring(0, 80)}...`);
      } else {
        console.log(`  price_trend: NULL or undefined`);
      }
      console.log('');
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}\n`);
    process.exit(1);
  }

  // Step 5: Test write operation
  console.log('Step 5: Test Write Operation');
  console.log('------------------------------');
  try {
    // Try to upsert a test record
    const testRecord = {
      ticker: 'TEST_' + Date.now(),
      published_date: '2024-01-01',
      analyst_name: 'Connection Test',
      price_trend: { D1: { open: 100, high: 101, low: 99, close: 100.5, actualDate: '2024-01-02', targetDate: '2024-01-02' } }
    };

    const { data, error } = await supabase
      .from('analyst_records')
      .upsert(testRecord, { onConflict: 'ticker,published_date,analyst_name' })
      .select('ticker');

    if (error) {
      console.log(`❌ Write failed: ${error.message}`);
      console.log(`Error code: ${error.code}`);
      process.exit(1);
    }

    console.log(`✅ Write operation successful`);
    console.log(`Test record created: ${testRecord.ticker}\n`);

    // Clean up test record
    await supabase
      .from('analyst_records')
      .delete()
      .eq('ticker', testRecord.ticker);

    console.log(`✅ Test record cleaned up\n`);
  } catch (err) {
    console.log(`❌ Exception: ${err.message}\n`);
    process.exit(1);
  }

  console.log('=== All Tests Passed ===');
  console.log('✅ Supabase connection is working correctly');
  console.log('✅ Database read/write operations are functional');
  console.log('\nIf refreshAnalystLog still fails, check server logs for detailed error messages.');
}

testConnection();
