<!--
Sync Impact Report:
- Version: 1.0.0 → 1.1.0 (Added code quality, testing, and performance principles)
- Change Type: MINOR (New principle additions)
- Principles Modified:
  - Added: VI. Code Quality & Readability
  - Added: VII. Testing Discipline
  - Added: VIII. Minimal Dependencies
- Sections Updated:
  - Technical Standards: Added code quality standards
  - Quality Gates: Added coverage requirements
- Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check gate compatible
  ✅ spec-template.md - Requirements sections align
  ✅ tasks-template.md - Task structure supports new principles
- Follow-up: None
- Rationale: User-requested principles for code quality, testing discipline, and performance optimization through minimal dependencies
-->

# GetEvents Constitution

## Core Principles

### I. API-First Design

Every feature must be designed around external API integration patterns. API interactions MUST be abstracted into services with clear contracts. Field mapping configurations MUST be externalized (JSON/config files) to enable API provider changes without code modifications. All API responses MUST be normalized to internal schemas before business logic processing.

**Rationale**: Financial data providers change frequently. Decoupling API specifics from business logic ensures maintainability and provider flexibility.

### II. Data Integrity & Validation

All external API data MUST be validated against defined schemas before persistence or processing. Field mappings MUST enforce type safety. Timestamp data MUST be normalized to UTC. Missing or malformed data MUST be logged with provider/endpoint context and handled gracefully without silent failures.

**Rationale**: Financial data accuracy is non-negotiable. Validation catches provider changes early and ensures downstream reliability.

### III. Configuration-Driven Architecture

API endpoints, field mappings, and provider configurations MUST be externalized in structured files (JSON/YAML). Code MUST read configurations at runtime. Adding new data sources or event types MUST NOT require code changes to core logic, only configuration updates.

**Rationale**: The ApiList.json pattern demonstrates this project's need for dynamic provider management. This principle formalizes that approach.

### IV. Observability & Debugging

All API calls MUST log: provider, endpoint, parameters, response status, latency. Cache hits/misses MUST be tracked. Errors MUST include enough context to reproduce the request. Structured logging (JSON format) is REQUIRED for production environments.

**Rationale**: Debugging third-party API issues requires detailed context. Financial data troubleshooting demands audit trails.

### V. Testability Through Contracts

External API dependencies MUST be mockable via contracts. Contract tests MUST verify field mappings match provider responses. Integration tests MUST use recorded API fixtures to ensure consistent test data. Live API tests MUST be isolated and flagged (not blocking CI).

**Rationale**: Financial APIs have rate limits and costs. Contract-based testing enables rapid development without live API dependency.

### VI. Code Quality & Readability

Code MUST be concise and self-explanatory. Comments MUST be minimized - use them only for complex business logic or non-obvious decisions. Variable and function names MUST clearly convey intent. Code readability takes precedence over cleverness.

**Rationale**: Self-documenting code reduces maintenance burden and accelerates onboarding. Comments become stale; clear code remains accurate.

### VII. Testing Discipline

Core business logic MUST have test coverage. Minimum 70% code coverage is REQUIRED across the codebase. Critical paths (data validation, API response normalization, financial calculations) MUST achieve higher coverage. Tests MUST be readable and serve as usage documentation.

**Rationale**: Financial data systems require reliability. High test coverage catches regressions early and serves as living documentation of expected behavior.

### VIII. Minimal Dependencies

External libraries MUST be justified by significant value. Prefer standard library solutions when sufficient. Each dependency MUST be evaluated for: maintenance status, security track record, bundle size impact. Avoid dependencies for trivial functionality that can be implemented in <50 lines.

**Rationale**: Dependencies introduce security risks, maintenance burden, and complexity. Minimal dependencies improve security posture, reduce attack surface, and simplify dependency management.

## Technical Standards

### API Integration Requirements

- All API clients MUST implement retry logic with exponential backoff
- Rate limiting MUST be enforced per provider configuration
- API keys MUST be loaded from environment variables, never hardcoded
- Timeout values MUST be configurable per endpoint
- Response caching MUST be implemented for data with known staleness windows

### Data Schema Standards

- Internal data models MUST be provider-agnostic
- Field naming MUST follow camelCase convention
- Date/time fields MUST use ISO 8601 format internally
- Numeric precision MUST match financial accuracy requirements (no floating point for currency)
- Schema validation MUST use typed validation library (e.g., JSON Schema, Pydantic, Zod)

### Security Requirements

- API credentials MUST be stored in secure configuration (environment variables, secrets manager)
- Sensitive data in logs MUST be redacted (API keys, personal data)
- All external API calls MUST use HTTPS
- Input validation MUST sanitize user-provided parameters before API interpolation

### Code Quality Standards

- Functions SHOULD be small and single-purpose
- Maximum function length: 50 lines (excluding tests)
- Maximum file length: 300 lines (excluding tests)
- Cyclomatic complexity SHOULD stay below 10 per function
- Magic numbers MUST be replaced with named constants
- Dead code MUST be removed (no commented-out code in commits)

## Development Workflow

### Feature Development

1. **Specification First**: Define user stories with acceptance criteria before implementation
2. **Configuration Before Code**: Update API configuration files before writing integration logic
3. **Contract Tests First** (if tests required): Define expected API contracts, verify they fail
4. **Implement & Validate**: Code implementation, then validate against contract tests
5. **Integration Verification**: Test with live API (manually or in isolated test suite)

### Code Review Requirements

- All PRs MUST include updated configuration files if API changes are made
- Field mappings MUST be reviewed for data type compatibility
- Error handling MUST be verified for all API failure scenarios
- Logging MUST be checked for sufficient debugging context
- Code readability MUST be verified - reviewer should understand logic without author explanation
- New dependencies MUST be justified in PR description

### Quality Gates

- Contract tests MUST pass (if tests are included)
- Code coverage MUST meet or exceed 70% for new/modified code
- Schema validation MUST be present for all new data sources
- API configuration MUST be validated against JSON schema
- No hardcoded API keys or endpoints in code (linter enforced where possible)
- Linter and formatter checks MUST pass

## Governance

### Constitution Authority

This constitution supersedes ad-hoc development practices. All features, code reviews, and architectural decisions MUST comply with these principles. Deviations MUST be documented in the Complexity Tracking section of plan.md with explicit justification.

### Amendment Process

1. Proposed amendments MUST be documented with rationale
2. Amendments affecting existing features require impact analysis
3. Version bumping follows semantic versioning:
   - **MAJOR**: Principle removal or fundamental governance change
   - **MINOR**: New principle addition or section expansion
   - **PATCH**: Clarifications, wording improvements, typo fixes
4. Amended constitution MUST trigger template synchronization check

### Compliance Review

- All `/speckit.plan` outputs MUST include Constitution Check gate
- Plan documents MUST justify any complexity violations in Complexity Tracking table
- Implementation tasks MUST reference applicable principles when relevant
- Periodic reviews SHOULD verify codebase alignment with principles

### Living Document

This constitution is a living document. As the project evolves, principles may be refined. Use `/speckit.constitution` to update this file. Always maintain backward compatibility with existing feature specifications unless a MAJOR version change is justified.

**Version**: 1.1.0 | **Ratified**: 2025-11-25 | **Last Amended**: 2025-11-25
