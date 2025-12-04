// Valuation calculation service
// Per evMethod.json metric definitions

import { loadEvMethod, loadApiList, getFmpApiKey, buildApiUrl } from '../lib/configLoader.js';
import { fetchApi } from './fmpClient.js';
import { getCurrentTimestampISO } from '../lib/dateUtils.js';
import {
  ttmFromQuarterSumOrScaled,
  avgFromQuarter,
  lastFromQuarter,
  yoyFromQuarter,
  qoqFromQuarter
} from '../lib/valuationHelpers.js';

/**
 * Fetch financial data for a ticker
 * @param {string} ticker - Stock ticker symbol
 * @param {string} fmpApiKey - FMP API key
 * @param {object} apiList - API configuration
 * @returns {object} Financial data (quote, income statement, balance sheet)
 */
async function fetchFinancialData(ticker, fmpApiKey, apiList) {
  const errors = [];

  // Fetch quote data (marketCap, price)
  const quoteConfig = apiList.getQuantitiveValuation.marketCap['service-FMP'];
  const quoteUrl = buildApiUrl(quoteConfig.API, { ticker, fmpApiKey });
  const quoteResult = await fetchApi(quoteUrl, quoteConfig.id);

  let quoteData = null;
  if (quoteResult.success && quoteResult.data && quoteResult.data.length > 0) {
    quoteData = quoteResult.data[0];
  } else {
    errors.push(quoteResult.error || {
      serviceId: quoteConfig.id,
      errorMessage: 'No quote data available',
      timestamp: getCurrentTimestampISO()
    });
  }

  // Fetch income statement (quarterly, limit 4)
  const incomeConfig = apiList.getQuantitiveValuation.getIncomeStatement['service-FMP'];
  const incomeUrl = buildApiUrl(incomeConfig.API, { ticker, fmpApiKey });
  const incomeResult = await fetchApi(incomeUrl, incomeConfig.id);

  let incomeData = [];
  if (incomeResult.success && incomeResult.data) {
    incomeData = incomeResult.data;
  } else {
    errors.push(incomeResult.error || {
      serviceId: incomeConfig.id,
      errorMessage: 'No income statement data available',
      timestamp: getCurrentTimestampISO()
    });
  }

  // Fetch balance sheet (quarterly, limit 4)
  const balanceConfig = apiList.getQuantitiveValuation.getBalanceSheetStatement['service-FMP'];
  const balanceUrl = buildApiUrl(balanceConfig.API, { ticker, fmpApiKey });
  const balanceResult = await fetchApi(balanceUrl, balanceConfig.id);

  let balanceData = [];
  if (balanceResult.success && balanceResult.data) {
    balanceData = balanceResult.data;
  } else {
    errors.push(balanceResult.error || {
      serviceId: balanceConfig.id,
      errorMessage: 'No balance sheet data available',
      timestamp: getCurrentTimestampISO()
    });
  }

  return {
    quote: quoteData,
    incomeStatement: incomeData,
    balanceSheet: balanceData,
    errors
  };
}

/**
 * Extract field values from quarterly data
 * @param {array} data - Quarterly data array
 * @param {string} field - Field name to extract
 * @returns {array} Values array
 */
function extractValues(data, field) {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  return data.map(item => item[field] !== undefined ? item[field] : null);
}

/**
 * Calculate quantitative valuation metrics
 * Per evMethod.json getQuantitiveValuation definitions
 *
 * @param {string} ticker - Stock ticker symbol
 * @returns {object} Quantitative metrics
 */
export async function calculateQuantitativeValuation(ticker) {
  const apiList = await loadApiList();
  const fmpApiKey = getFmpApiKey();
  const evMethod = await loadEvMethod();

  const errors = [];

  // Fetch all required financial data
  const financialData = await fetchFinancialData(ticker, fmpApiKey, apiList);
  errors.push(...financialData.errors);

  const { quote, incomeStatement, balanceSheet } = financialData;

  // Initialize metrics object
  const metrics = {
    PBR: null,
    PSR: null,
    PER: null,
    ROE: null,
    EV_EBITDA: null,
    RunwayYears: null,
    CurrentRatio: null,
    CashToRevenueTTM: null,
    RevenueGrowthYoY: null,
    RevenueGrowthQoQ: null,
    NetIncomeGrowthYoY: null,
    NetIncomeGrowthQoQ: null,
    EBITDAGrowthYoY: null,
    EBITDAGrowthQoQ: null,
    GrossMarginLastQuarter: null,
    GrossMarginTTM: null,
    RNDIntensityTTM: null,
    OperatingMarginTTM: null,
    SharesDilutionYoY: null,
    DebtToEquityAvg: null,
    OtherNonCurrentLiabilitiesToEquityAvg: null,
    NetDebtToEquityAvg: null,
    APICYoY: null
  };

  // Return early if no data available
  if (!quote || incomeStatement.length === 0 || balanceSheet.length === 0) {
    return { metrics, errors };
  }

  const marketCap = quote.marketCap;

  // Extract quarterly values for calculations
  const revenue = extractValues(incomeStatement, 'revenue');
  const netIncome = extractValues(incomeStatement, 'netIncome');
  const ebitda = extractValues(incomeStatement, 'ebitda');
  const grossProfit = extractValues(incomeStatement, 'grossProfit');
  const researchAndDevelopmentExpenses = extractValues(incomeStatement, 'researchAndDevelopmentExpenses');
  const operatingIncome = extractValues(incomeStatement, 'operatingIncome');
  const weightedAverageShsOut = extractValues(incomeStatement, 'weightedAverageShsOut');

  const totalStockholdersEquity = extractValues(balanceSheet, 'totalStockholdersEquity');
  const totalDebt = extractValues(balanceSheet, 'totalDebt');
  const cashAndCashEquivalents = extractValues(balanceSheet, 'cashAndCashEquivalents');
  const cashAndShortTermInvestments = extractValues(balanceSheet, 'cashAndShortTermInvestments');
  const totalCurrentAssets = extractValues(balanceSheet, 'totalCurrentAssets');
  const totalCurrentLiabilities = extractValues(balanceSheet, 'totalCurrentLiabilities');
  const netDebt = extractValues(balanceSheet, 'netDebt');
  const otherNonCurrentLiabilities = extractValues(balanceSheet, 'otherNonCurrentLiabilities');

  // Calculate TTM and aggregated values
  const revenueTTM = ttmFromQuarterSumOrScaled(revenue);
  const netIncomeTTM = ttmFromQuarterSumOrScaled(netIncome);
  const ebitdaTTM = ttmFromQuarterSumOrScaled(ebitda);
  const grossProfitTTM = ttmFromQuarterSumOrScaled(grossProfit);
  const rndTTM = ttmFromQuarterSumOrScaled(researchAndDevelopmentExpenses);
  const operatingIncomeTTM = ttmFromQuarterSumOrScaled(operatingIncome);

  const equityAvg = avgFromQuarter(totalStockholdersEquity);
  const totalDebtLast = lastFromQuarter(totalDebt);
  const cashAndCashEquivalentsLast = lastFromQuarter(cashAndCashEquivalents);
  const cashAndShortTermInvestmentsLast = lastFromQuarter(cashAndShortTermInvestments);
  const totalCurrentAssetsLast = lastFromQuarter(totalCurrentAssets);
  const totalCurrentLiabilitiesLast = lastFromQuarter(totalCurrentLiabilities);
  const totalStockholdersEquityLast = lastFromQuarter(totalStockholdersEquity);

  const avgTotalDebt = avgFromQuarter(totalDebt);
  const avgTotalEquity = avgFromQuarter(totalStockholdersEquity);
  const avgNetDebt = avgFromQuarter(netDebt);
  const avgOtherNCL = avgFromQuarter(otherNonCurrentLiabilities);

  const revenueLast = lastFromQuarter(revenue);
  const grossProfitLast = lastFromQuarter(grossProfit);

  // Calculate growth rates
  const revenueYoY = yoyFromQuarter(revenue);
  const revenueQoQ = qoqFromQuarter(revenue);
  const netIncomeYoY = yoyFromQuarter(netIncome);
  const netIncomeQoQ = qoqFromQuarter(netIncome);
  const ebitdaYoY = yoyFromQuarter(ebitda);
  const ebitdaQoQ = qoqFromQuarter(ebitda);
  const sharesYoY = yoyFromQuarter(weightedAverageShsOut);

  // Compute metrics per evMethod.json formulas

  // PBR = marketCap / totalStockholdersEquity (last)
  if (marketCap && totalStockholdersEquityLast && totalStockholdersEquityLast !== 0) {
    metrics.PBR = marketCap / totalStockholdersEquityLast;
  }

  // PSR = marketCap / revenueTTM
  if (marketCap && revenueTTM && revenueTTM !== 0) {
    metrics.PSR = marketCap / revenueTTM;
  }

  // PER = marketCap / netIncomeTTM
  if (marketCap && netIncomeTTM && netIncomeTTM !== 0) {
    metrics.PER = marketCap / netIncomeTTM;
  }

  // ROE = netIncomeTTM / equityAvg
  if (netIncomeTTM && equityAvg && equityAvg !== 0) {
    metrics.ROE = netIncomeTTM / equityAvg;
  }

  // EV_EBITDA = (marketCap + totalDebtLast - cashAndCashEquivalentsLast) / ebitdaTTM
  if (marketCap && totalDebtLast !== null && cashAndCashEquivalentsLast !== null && ebitdaTTM && ebitdaTTM !== 0) {
    const enterpriseValue = marketCap + totalDebtLast - cashAndCashEquivalentsLast;
    metrics.EV_EBITDA = enterpriseValue / ebitdaTTM;
  }

  // RunwayYears = cashAndShortTermInvestmentsLast / abs(operatingIncomeTTM) if operatingIncomeTTM < 0
  if (operatingIncomeTTM !== null && operatingIncomeTTM < 0 && cashAndShortTermInvestmentsLast) {
    metrics.RunwayYears = cashAndShortTermInvestmentsLast / Math.abs(operatingIncomeTTM);
  }

  // CurrentRatio = totalCurrentAssetsLast / totalCurrentLiabilitiesLast
  if (totalCurrentAssetsLast && totalCurrentLiabilitiesLast && totalCurrentLiabilitiesLast !== 0) {
    metrics.CurrentRatio = totalCurrentAssetsLast / totalCurrentLiabilitiesLast;
  }

  // CashToRevenueTTM = cashAndShortTermInvestmentsLast / revenueTTM
  if (cashAndShortTermInvestmentsLast && revenueTTM && revenueTTM !== 0) {
    metrics.CashToRevenueTTM = cashAndShortTermInvestmentsLast / revenueTTM;
  }

  // Growth rates
  metrics.RevenueGrowthYoY = revenueYoY;
  metrics.RevenueGrowthQoQ = revenueQoQ;
  metrics.NetIncomeGrowthYoY = netIncomeYoY;
  metrics.NetIncomeGrowthQoQ = netIncomeQoQ;
  metrics.EBITDAGrowthYoY = ebitdaYoY;
  metrics.EBITDAGrowthQoQ = ebitdaQoQ;

  // GrossMarginLastQuarter = grossProfitLast / revenueLast
  if (grossProfitLast && revenueLast && revenueLast !== 0) {
    metrics.GrossMarginLastQuarter = grossProfitLast / revenueLast;
  }

  // GrossMarginTTM = grossProfitTTM / revenueTTM
  if (grossProfitTTM && revenueTTM && revenueTTM !== 0) {
    metrics.GrossMarginTTM = grossProfitTTM / revenueTTM;
  }

  // RNDIntensityTTM = rndTTM / revenueTTM
  if (rndTTM && revenueTTM && revenueTTM !== 0) {
    metrics.RNDIntensityTTM = rndTTM / revenueTTM;
  }

  // OperatingMarginTTM = operatingIncomeTTM / revenueTTM
  if (operatingIncomeTTM && revenueTTM && revenueTTM !== 0) {
    metrics.OperatingMarginTTM = operatingIncomeTTM / revenueTTM;
  }

  // SharesDilutionYoY
  metrics.SharesDilutionYoY = sharesYoY;

  // DebtToEquityAvg = avgTotalDebt / avgTotalEquity
  if (avgTotalDebt && avgTotalEquity && avgTotalEquity !== 0) {
    metrics.DebtToEquityAvg = avgTotalDebt / avgTotalEquity;
  }

  // OtherNonCurrentLiabilitiesToEquityAvg = avgOtherNCL / avgTotalEquity
  if (avgOtherNCL && avgTotalEquity && avgTotalEquity !== 0) {
    metrics.OtherNonCurrentLiabilitiesToEquityAvg = avgOtherNCL / avgTotalEquity;
  }

  // NetDebtToEquityAvg = avgNetDebt / avgTotalEquity
  if (avgNetDebt && avgTotalEquity && avgTotalEquity !== 0) {
    metrics.NetDebtToEquityAvg = avgNetDebt / avgTotalEquity;
  }

  // Note: APICYoY requires additionalPaidInCapital field which is not in current fieldMap
  // Leaving as null for now

  return { metrics, errors };
}

export default {
  calculateQuantitativeValuation
};
