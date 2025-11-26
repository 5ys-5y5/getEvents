import 'dotenv/config';
import { getSymbolCache } from './src/services/cacheManager.js';

const result = await getSymbolCache();
console.log('Type:', typeof result);
console.log('Keys:', Object.keys(result));
console.log('symbols value:', result.symbols);
console.log('symbols type:', typeof result.symbols);
console.log('symbols is Array:', Array.isArray(result.symbols));
console.log('JSON:', JSON.stringify(result));
