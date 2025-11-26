// Test script to debug symbol cache
import 'dotenv/config';
import { getSymbolCache, loadSymbolCache } from './src/services/cacheManager.js';
import { getFmpApiKey } from './src/lib/configLoader.js';

console.log('Testing symbol cache...\n');

console.log('1. Checking API Key:');
const apiKey = getFmpApiKey();
console.log('API Key exists:', !!apiKey);
console.log('API Key (first 10 chars):', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET');

console.log('\n2. Loading existing cache:');
try {
  const cache = await loadSymbolCache();
  console.log('Cache loaded:', {
    symbolCount: cache.symbols?.length || 0,
    hasGeneratedAt: !!cache.meta?.symbolCache_generated_at,
    generatedAt: cache.meta?.symbolCache_generated_at
  });
} catch (error) {
  console.error('Error loading cache:', error.message);
}

console.log('\n3. Getting symbol cache (with auto-refresh):');
try {
  const result = await getSymbolCache();
  console.log('Result:', {
    hasSymbols: !!result.symbols,
    symbolCount: result.symbols?.length || 0,
    hasRefreshError: !!result.refreshError,
    refreshError: result.refreshError
  });
  console.log('\nFull result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
