// Load and validate ApiList.json, evMethod.json
// Per FR-027: Configuration-driven architecture

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root directory (two levels up from src/lib)
const PROJECT_ROOT = join(__dirname, '..', '..');

/**
 * Load and parse a JSON configuration file
 * @param {string} relativePath - Path relative to project root
 * @returns {Promise<Object>} Parsed JSON object
 */
async function loadConfig(relativePath) {
  try {
    const fullPath = join(PROJECT_ROOT, relativePath);
    const content = await readFile(fullPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load config ${relativePath}: ${error.message}`);
  }
}

/**
 * Load ApiList.json configuration
 * @returns {Promise<Object>} ApiList configuration
 */
export async function loadApiList() {
  return loadConfig('docs/ApiList.json');
}

/**
 * Load evMethod.json configuration
 * @returns {Promise<Object>} evMethod configuration
 */
export async function loadEvMethod() {
  return loadConfig('docs/evMethod.json');
}

/**
 * Get FMP API key from environment variable
 * Per FR-025, FR-026: Use FMP_API_KEY environment variable
 * @returns {string|null} FMP API key or null if not set
 */
export function getFmpApiKey() {
  return process.env.FMP_API_KEY || null;
}

/**
 * Replace placeholders in API URL
 * Per FR-024, FR-025: Replace {fmpApiKey}, {fromDate}, {toDate}, {ticker}
 *
 * @param {string} urlTemplate - API URL template with placeholders
 * @param {Object} params - Replacement parameters
 * @param {string} params.fmpApiKey - FMP API key
 * @param {string} [params.fromDate] - From date in YYYY-MM-DD format
 * @param {string} [params.toDate] - To date in YYYY-MM-DD format
 * @param {string} [params.ticker] - Stock ticker symbol
 * @returns {string} URL with placeholders replaced
 */
export function buildApiUrl(urlTemplate, params) {
  let url = urlTemplate;

  // Replace all placeholders
  if (params.fmpApiKey !== undefined) {
    url = url.replace(/{fmpApiKey}/g, params.fmpApiKey || '');
  }
  if (params.fromDate !== undefined) {
    url = url.replace(/{fromDate}/g, params.fromDate);
  }
  if (params.toDate !== undefined) {
    url = url.replace(/{toDate}/g, params.toDate);
  }
  if (params.ticker !== undefined) {
    url = url.replace(/{ticker}/g, params.ticker);
  }

  return url;
}
