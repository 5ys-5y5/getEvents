// NDJSON stream writer
// Per FR-001: Stream NDJSON format (eventRecord* + metaRecord)

/**
 * Write a single NDJSON line to response stream
 * @param {Object} res - Express response object
 * @param {Object} data - Data object to write as JSON line
 */
export function writeNDJsonLine(res, data) {
  res.write(JSON.stringify(data) + '\n');
}

/**
 * Initialize NDJSON stream response
 * Per FR-001: Set appropriate headers for NDJSON streaming
 *
 * @param {Object} res - Express response object
 */
export function initNDJsonStream(res) {
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.status(200);
}

/**
 * End NDJSON stream
 * @param {Object} res - Express response object
 */
export function endNDJsonStream(res) {
  res.end();
}

export default {
  writeNDJsonLine,
  initNDJsonStream,
  endNDJsonStream
};
