// Qualitative valuation calculation service
// Per evMethod.json qualitative metric definitions

import { loadApiList, getFmpApiKey, buildApiUrl } from '../lib/configLoader.js';
import { fetchApi } from './fmpClient.js';
import { getCurrentTimestampISO } from '../lib/dateUtils.js';

/**
 * Calculate qualitative valuation metrics
 * Per evMethod.json getQualativeValuation definitions
 *
 * @param {string} ticker - Stock ticker symbol
 * @returns {object} Qualitative metrics
 */
export async function calculateQualitativeValuation(ticker) {
  const apiList = await loadApiList();
  const fmpApiKey = getFmpApiKey();
  const errors = [];

  const metrics = {
    ConsensusTargetPrice: null,
    PriceTargetSummary: null
  };

  // Fetch price target consensus data (targetConsensus, targetHigh, targetLow, targetMedian)
  const consensusConfig = apiList.getQualativeValuation.getPriceTargetConsensus['service-FMP'];
  const consensusUrl = buildApiUrl(consensusConfig.API, { ticker, fmpApiKey });
  const consensusResult = await fetchApi(consensusUrl, consensusConfig.id);

  if (consensusResult.success && consensusResult.data && consensusResult.data.length > 0) {
    const data = consensusResult.data[0];
    metrics.ConsensusTargetPrice = {
      targetConsensus: data.targetConsensus,
      targetHigh: data.targetHigh,
      targetLow: data.targetLow,
      targetMedian: data.targetMedian
    };
  } else {
    errors.push(consensusResult.error || {
      serviceId: consensusConfig.id,
      errorMessage: 'No price target consensus data available',
      timestamp: getCurrentTimestampISO()
    });
  }

  // Fetch price target summary
  const summaryConfig = apiList.getQualativeValuation.getEachPriceTargetConsensusSummary['service-FMP'];
  const summaryUrl = buildApiUrl(summaryConfig.API, { ticker, fmpApiKey });
  const summaryResult = await fetchApi(summaryUrl, summaryConfig.id);

  if (summaryResult.success && summaryResult.data && summaryResult.data.length > 0) {
    metrics.PriceTargetSummary = summaryResult.data[0];
  } else {
    errors.push(summaryResult.error || {
      serviceId: summaryConfig.id,
      errorMessage: 'No price target summary available',
      timestamp: getCurrentTimestampISO()
    });
  }

  return { metrics, errors };
}

export default {
  calculateQualitativeValuation
};
