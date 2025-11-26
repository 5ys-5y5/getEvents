// Peer ticker evaluation service
// Fetches peer tickers and calculates average quantitative metrics

import { loadApiList, getFmpApiKey, buildApiUrl } from '../lib/configLoader.js';
import { fetchApi } from './fmpClient.js';
import { calculateQuantitativeValuation } from './valuationCalculator.js';
import { getCurrentTimestampISO } from '../lib/dateUtils.js';

/**
 * Get peer tickers for a given ticker
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<object>} Peer ticker list or error
 */
async function getPeerTickers(ticker) {
  const apiList = await loadApiList();
  const fmpApiKey = getFmpApiKey();

  const peerConfig = apiList.peer.getPeerTicker['service-FMP'];
  const peerUrl = buildApiUrl(peerConfig.API, { ticker, fmpApiKey });
  const result = await fetchApi(peerUrl, peerConfig.id);

  if (result.success && result.data && result.data.length > 0) {
    // API returns: [{ symbol: "TICKER", peersList: ["PEER1", "PEER2", "PEER3"] }]
    const peerData = result.data[0];

    if (peerData.peersList) {
      // peersList is already an array
      const peers = Array.isArray(peerData.peersList)
        ? peerData.peersList
        : peerData.peersList.split(',').map(p => p.trim()).filter(p => p);

      return {
        success: true,
        peers
      };
    }
  }

  return {
    success: false,
    error: result.error || {
      serviceId: peerConfig.id,
      errorMessage: 'No peer ticker data available',
      timestamp: getCurrentTimestampISO()
    }
  };
}

/**
 * Calculate average of quantitative metrics across peer tickers
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<object>} Average peer metrics or error
 */
export async function calculatePeerQuantitative(ticker) {
  // Get peer tickers
  const peerResult = await getPeerTickers(ticker);

  if (!peerResult.success || peerResult.peers.length === 0) {
    return {
      peerQuantitative: null,
      error: peerResult.error || {
        serviceId: 'peer-evaluation',
        errorMessage: 'No peer tickers found',
        timestamp: getCurrentTimestampISO()
      }
    };
  }

  const peers = peerResult.peers;
  console.log(`Evaluating ${peers.length} peer tickers for ${ticker}: ${peers.join(', ')}`);

  // Calculate quantitative metrics for each peer
  const peerMetrics = [];
  const errors = [];

  for (const peerTicker of peers) {
    try {
      const peerResult = await calculateQuantitativeValuation(peerTicker);

      if (peerResult.metrics && Object.keys(peerResult.metrics).length > 0) {
        peerMetrics.push(peerResult.metrics);
      }

      if (peerResult.errors && peerResult.errors.length > 0) {
        errors.push(...peerResult.errors);
      }
    } catch (error) {
      errors.push({
        ticker: peerTicker,
        serviceId: 'peer-evaluation',
        errorMessage: error.message,
        timestamp: getCurrentTimestampISO()
      });
    }
  }

  if (peerMetrics.length === 0) {
    return {
      peerQuantitative: null,
      error: {
        serviceId: 'peer-evaluation',
        errorMessage: 'No valid peer metrics calculated',
        timestamp: getCurrentTimestampISO()
      }
    };
  }

  // Calculate average for each metric
  const avgMetrics = {};
  const metricKeys = Object.keys(peerMetrics[0]);

  for (const key of metricKeys) {
    const values = peerMetrics
      .map(m => m[key])
      .filter(val => val !== null && val !== undefined && !isNaN(val));

    if (values.length > 0) {
      avgMetrics[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
    } else {
      avgMetrics[key] = null;
    }
  }

  return {
    peerQuantitative: {
      ...avgMetrics,
      peerCount: peerMetrics.length,
      peerList: peers
    },
    errors: errors.length > 0 ? errors : null
  };
}

export default {
  calculatePeerQuantitative
};
