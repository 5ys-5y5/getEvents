/**
 * Model Summary Service - Aggregate trade performance by model
 * Per US2: Calculate percentile-based caps and performance metrics
 *
 * Provides model-level analytics for trading strategy optimization
 */

import { percentile } from '../lib/percentile.js';

/**
 * Aggregate all returns for a specific model
 * Per T029: Collect all non-null returns from trades belonging to modelName
 *
 * @param {string} modelName - Model identifier (e.g., 'MODEL-0')
 * @param {Array} trades - Array of TradeRecord objects
 * @returns {Array<number>} Flat array of all completed return rates
 *
 * @example
 * const returns = aggregateModelReturns('MODEL-0', trades);
 * // Returns: [0.015, -0.008, 0.022, 0.010, ...]
 */
export function aggregateModelReturns(modelName, trades) {
  const allReturns = [];

  // Filter trades for this model
  const modelTrades = trades.filter(t => t.modelName === modelName);

  // Collect all non-null returns from all D+N horizons
  for (const trade of modelTrades) {
    for (const returnRecord of trade.returns) {
      if (returnRecord !== null && typeof returnRecord.returnRate === 'number') {
        allReturns.push(returnRecord.returnRate);
      }
    }
  }

  return allReturns;
}

/**
 * Calculate optimal holding period (average day of maximum return)
 * Per T030: Find which D+N horizon yields best returns on average
 *
 * @param {Array} trades - Array of TradeRecord objects for a model
 * @returns {number|null} Average optimal holding days (1-14), or null if insufficient data
 *
 * @example
 * const optimalDays = calculateOptimalHoldingDays(modelTrades);
 * // Returns: 7.3 (meaning D+7 is optimal on average)
 */
export function calculateOptimalHoldingDays(trades) {
  if (trades.length === 0) {
    return null;
  }

  const maxReturnDays = [];

  for (const trade of trades) {
    let maxReturn = -Infinity;
    let maxDay = null;

    // Find the day with maximum cumulative return
    for (let i = 0; i < trade.returns.length; i++) {
      const returnRecord = trade.returns[i];
      if (returnRecord !== null && returnRecord.cumulativeReturn !== null) {
        if (returnRecord.cumulativeReturn > maxReturn) {
          maxReturn = returnRecord.cumulativeReturn;
          maxDay = i + 1; // D+1 to D+14
        }
      }
    }

    if (maxDay !== null) {
      maxReturnDays.push(maxDay);
    }
  }

  if (maxReturnDays.length === 0) {
    return null;
  }

  // Calculate average
  const sum = maxReturnDays.reduce((acc, day) => acc + day, 0);
  return sum / maxReturnDays.length;
}

/**
 * Calculate suggested cap percentiles
 * Per T031 and data-model.md VR-016 to VR-018:
 *   - suggestedMaxCap: 20th percentile (conservative profit target)
 *   - suggestedLowCap: 5th percentile (aggressive loss limit)
 *
 * @param {Array<number>} allReturns - Flat array of all return rates
 * @returns {{maxCap: number|null, lowCap: number|null}}
 *
 * @example
 * const caps = calculateSuggestedCaps([0.01, 0.02, 0.03, 0.04, 0.05]);
 * // Returns: { maxCap: 0.018, lowCap: 0.0105 }
 */
export function calculateSuggestedCaps(allReturns) {
  // Per FR-014: Require at least 3 returns for percentile calculation
  if (allReturns.length < 3) {
    return {
      maxCap: null,
      lowCap: null
    };
  }

  // Calculate percentiles using custom percentile function
  const maxCap = percentile(allReturns, 20); // 20th percentile
  const lowCap = percentile(allReturns, 5);  // 5th percentile

  return {
    maxCap,
    lowCap
  };
}

/**
 * Calculate average return and win rate
 * Per T032 and FR-011 to FR-013:
 *   - avgReturn: arithmetic mean of all returns
 *   - winRate: proportion of positive returns (0.0 to 1.0)
 *
 * @param {Array<number>} allReturns - Flat array of all return rates
 * @returns {{avgReturn: number|null, winRate: number|null}}
 *
 * @example
 * const stats = calculateAvgReturnAndWinRate([0.01, -0.02, 0.03]);
 * // Returns: { avgReturn: 0.0067, winRate: 0.667 }
 */
export function calculateAvgReturnAndWinRate(allReturns) {
  if (allReturns.length === 0) {
    return {
      avgReturn: null,
      winRate: null
    };
  }

  // Calculate average return
  const sum = allReturns.reduce((acc, r) => acc + r, 0);
  const avgReturn = sum / allReturns.length;

  // Calculate win rate (proportion of positive returns)
  const wins = allReturns.filter(r => r > 0).length;
  const winRate = wins / allReturns.length;

  return {
    avgReturn,
    winRate
  };
}

/**
 * Generate complete model summary
 * Per T033: Orchestrate all model-level calculations
 *
 * @param {string} modelName - Model identifier
 * @param {Array} allTrades - All trades in cache (will be filtered by modelName)
 * @returns {Object} ModelSummary object per data-model.md
 *
 * @example
 * const summary = generateModelSummary('MODEL-0', cache.trades);
 * // Returns: { modelName, tradeCount, suggestedMaxCap, suggestedLowCap, avgReturn, winRate }
 */
export function generateModelSummary(modelName, allTrades) {
  // Filter trades for this model
  const modelTrades = allTrades.filter(t => t.modelName === modelName);
  const tradeCount = modelTrades.length;

  // Aggregate all returns
  const allReturns = aggregateModelReturns(modelName, allTrades);

  // Calculate suggested caps (null if < 3 returns per FR-014)
  const { maxCap, lowCap } = calculateSuggestedCaps(allReturns);

  // Calculate average return and win rate
  const { avgReturn, winRate } = calculateAvgReturnAndWinRate(allReturns);

  return {
    modelName,
    tradeCount,
    suggestedMaxCap: maxCap,
    suggestedLowCap: lowCap,
    avgReturn,
    winRate
  };
}

export default {
  aggregateModelReturns,
  calculateOptimalHoldingDays,
  calculateSuggestedCaps,
  calculateAvgReturnAndWinRate,
  generateModelSummary
};
