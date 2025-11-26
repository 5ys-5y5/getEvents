# Financial Event API - Technical Research & Decisions

## 1. Language Choice: Node.js vs Python

**Decision: Node.js (Express.js)**

**Rationale:**
Node.js is 40-70% faster for I/O-bound operations, making it ideal for a financial API handling concurrent external HTTP calls and NDJSON streaming. Its non-blocking, event-driven architecture excels at handling real-time data streaming with minimal overhead. Both Render.com and the deployment pipeline provide excellent support for Node.js applications with straightforward Git-based deployment.

**Alternatives:**
Python with FastAPI offers superior raw performance for CPU-bound numerical computations and has excellent async support via ASGI, but requires additional configuration for optimal streaming performance and introduces slightly more operational complexity for file caching and concurrent API calls. Python is 40% slower at I/O operations critical to this API's use case.

---

## 2. Web Framework

**Decision: Express.js**

**Rationale:**
Express.js offers minimal middleware overhead while maintaining excellent streaming support through Node.js native streams. It has a mature ecosystem with battle-tested libraries for rate limiting, request parsing, and error handling. Express provides straightforward request/response handling for file caching and external API coordination without unnecessary abstraction layers.

**Alternatives:**
Fastify would provide slightly better raw throughput (~10% faster), but Express's ecosystem maturity and simpler debugging experience outweigh marginal performance gains for this use case. Nest.js introduces unnecessary complexity for a single-endpoint API.

---

## 3. HTTP Client Library

**Decision: axios with axios-retry plugin**

**Rationale:**
Axios provides promise-based request handling with excellent async/await compatibility. The axios-retry plugin enables robust handling of FMP API timeouts and rate limits through configurable exponential backoff strategies. Built-in timeout configuration and shouldResetTimeout option ensure per-attempt timeout resets, critical for handling slow responses from external APIs.

**Alternatives:**
Got.js offers built-in retry capabilities and streams support, but requires less-familiar configuration patterns and lacks the extensive axios-retry ecosystem. Fetch API lacks retry logic without additional libraries, making error handling more complex for financial data reliability requirements.

---

## 4. Date Manipulation

**Decision: date-fns-tz (date-fns with timezone support)**

**Rationale:**
date-fns-tz provides dependency-free IANA timezone support via the Intl API, keeping bundle size small while ensuring accurate ISO 8601 formatting for financial events. It offers explicit UTC handling with timezone-aware conversion functions, critical for preventing date-related bugs in financial reporting. Works seamlessly with JavaScript's native Date objects.

**Alternatives:**
Luxon provides stronger internal date/time abstractions and first-class timezone objects, but adds ~15KB to bundle size and introduces additional API complexity. For simple ISO 8601 formatting and UTC conversions required by FMP API, date-fns-tz is sufficient and more performant.

---

## 5. Testing Framework

**Decision: Jest**

**Rationale:**
Jest provides built-in mocking capabilities without third-party dependencies, critical for contract testing against FMP API responses. Its powerful module and function mocking system simplifies isolated testing of HTTP client logic and rate limiting. Jest includes snapshot testing, coverage reporting, and parallel execution—all essential for maintaining financial API reliability and test documentation.

**Alternatives:**
Vitest offers faster test execution and modern ESM support but provides less mature contract testing patterns for HTTP mocking. Since test speed is not critical for this project and Jest's ecosystem is significantly more mature, Jest's comprehensive built-in features justify the slightly slower execution.

---

## 6. API Mocking for Contract Tests

**Decision: Nock**

**Rationale:**
Nock's recorder capability automatically generates mock definitions from real FMP API responses, enabling efficient contract test setup and maintenance. It works transparently with any HTTP client library (axios, fetch, etc.) by intercepting Node.js HTTP requests. Nock allows saving recorded responses as JSON files for version control and test reproducibility.

**Alternatives:**
Mock Service Worker (MSW) offers cross-platform browser/Node support and GraphQL capabilities, but adds unnecessary complexity for backend-only testing. MSW's request matching syntax is more verbose than Nock for simple REST API mocking. For Node.js-only contract testing, Nock's simplicity and record/replay features are superior.

---

## 7. FMP API Rate Limits & Backoff Strategy

**Research Findings:**

### Rate Limit Details:
- **Parallel Requests:** Limited to 4 requests per second (can be removed via support contact)
- **Bandwidth Limits (30-day trailing):**
  - Free plan: 500MB
  - Starter: 20GB
  - Premium: 50GB
  - Ultimate: 150GB
  - Build: 100GB
  - Enterprise: 1TB+
- **Daily Reset:** API call limits reset daily at 3 PM EST
- **Free Tier:** 250 total requests lifetime (requires plan upgrade after)

### Rate Limiting Strategy:

**Decision: Queue-based request throttling with exponential backoff**

**Rationale:**
Implement a request queue that respects the 4 requests/second parallel limit, ensuring FMP API stability. Exponential backoff with jitter handles transient 429 (Too Many Requests) and 5xx errors, preventing API blacklisting. Track bandwidth usage per 30-day window to avoid exceeding plan limits; log warnings at 80% threshold.

**Implementation Approach:**
- Use `axios-retry` with exponential backoff: `retryDelay = initialDelay * (2 ^ retryCount) + random(0, jitter)`
- Implement request queue using `p-queue` npm package for maximum concurrency control
- Configure shouldResetTimeout: true to reset timeout on each retry attempt
- Cache validated event lists to minimize repeated FMP API calls
- Monitor and log rate limit headers (X-RateLimit-Remaining, X-RateLimit-Reset)

---

## Summary of Decisions

| Category | Decision | Rationale |
|----------|----------|-----------|
| **Language** | Node.js | 40-70% faster I/O, native streaming, Render.com support |
| **Framework** | Express.js | Minimal overhead, mature ecosystem, excellent streaming |
| **HTTP Client** | axios + axios-retry | Promise-based, robust retry/timeout, configurable backoff |
| **Date Library** | date-fns-tz | Lightweight, ISO 8601 safe, timezone-aware UTC handling |
| **Testing** | Jest | Built-in mocking, contract testing, snapshot support |
| **API Mocking** | Nock | Record/replay, transparent HTTP interception, JSON persistence |
| **Rate Limiting** | Queue + Exponential Backoff | Respects 4 req/s limit, prevents API blacklisting, bandwidth tracking |

---

## Sources

- [Financial Modeling Prep API Pricing & Rate Limits](https://site.financialmodelingprep.com/developer/docs/pricing)
- [Node.js vs Python Performance Comparison](https://dev.to/m-a-h-b-u-b/nodejs-vs-python-real-benchmarks-performance-insights-and-scalability-analysis-4dm5)
- [Render.com Language Support Documentation](https://render.com/docs/language-support)
- [Express.js vs FastAPI Framework Comparison](https://medium.com/@imad14205/comparing-fastapi-and-express-js-a-comprehensive-analysis-b2359b7b66d4)
- [Axios Retry Plugin Documentation](https://github.com/softonic/axios-retry)
- [date-fns-tz Timezone Support](https://www.npmjs.com/package/date-fns-tz)
- [Comparing date-fns-tz and Luxon](https://medium.com/@sungbinkim98/comparing-date-fns-tz-and-luxon-55aee1bab550)
- [Jest Testing Framework Documentation](https://jestjs.io/)
- [Vitest vs Jest Comparison](https://betterstack.com/community/guides/scaling-nodejs/vitest-vs-jest/)
- [Nock HTTP Mocking Library](https://github.com/nock/nock)
- [Nock vs Mock Service Worker Comparison](https://apps.theodo.com/en/article/nock-vs-msw-i-tested-both-and-here-is-what-i-learned)
