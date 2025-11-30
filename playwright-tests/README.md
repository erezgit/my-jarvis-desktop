# Playwright Test Suite for My Jarvis Desktop

## Overview

This directory contains all Playwright end-to-end tests for the My Jarvis Desktop application. Tests are organized by feature area to maintain clarity and avoid conflicts between different testing efforts.

## Directory Structure

```
playwright-tests/
├── README.md                        # This file
├── playwright.config.ts             # Shared Playwright configuration
├── package.json                     # Dependencies for all tests
│
├── helpers/                         # Shared test utilities
│   ├── jarvis-interface.ts         # Helper to interact with Jarvis UI
│   ├── docker-utils.ts             # Docker container management
│   └── test-utils.ts               # Common test utilities
│
├── file-tree/                       # Tests for file tree refresh (Ticket 111)
│   ├── basic-file-ops.spec.ts      # Basic file operations
│   ├── directory-ops.spec.ts       # Directory operations
│   ├── complex-ops.spec.ts         # Complex ticket creation
│   └── edge-cases.spec.ts          # Edge cases and race conditions
│
└── authentication/                  # Tests for API key auth (Ticket 113)
    └── auth-test.spec.ts           # API key authentication tests
```

## Running Tests

### Run All Tests
```bash
cd /Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop/playwright-tests
npm install
npm test
```

### Run Specific Test Suite
```bash
# File tree tests only
npm test file-tree/

# Authentication tests only
npm test authentication/
```

### CRITICAL: Always Use Docker in DEV MODE

**NEVER run the React app standalone for testing!**

```bash
# Navigate to project root
cd /Users/erezfern/Workspace/my-jarvis/spaces/my-jarvis-desktop/projects/my-jarvis-desktop

# Ensure .env file has API key
echo "ANTHROPIC_API_KEY=sk-ant-api03-[KEY]" > .env

# Start Docker in DEV MODE (with hot-reload)
docker compose up -d

# The app runs on http://localhost:3000 in dev mode

# For parallel testing on different ports:
docker compose -p [test-name] run -d --service-ports -p [unique-port]:3000 app

# Run tests from playwright-tests directory
cd playwright-tests
npm install
PLAYWRIGHT_BASE_URL=http://localhost:[unique-port] npm test [test-directory]/

# Clean up
docker compose down
```

**DO NOT**:
- ❌ Run `npm start` or `npm run dev` directly
- ❌ Use production Docker builds
- ❌ Test against standalone React app

**ALWAYS**:
- ✅ Use `docker compose up` for dev mode
- ✅ Test against Docker container only
- ✅ Verify hot-reload is working

## Port Allocation

To avoid conflicts between parallel testing efforts:
- **3000**: Main development instance
- **3001**: Authentication tests (Ticket 113)
- **3002**: File tree tests (Ticket 111)
- **3003-3099**: Available for future test suites

## Adding New Tests

1. Create a new directory for your feature area
2. Add your test files (*.spec.ts)
3. Use shared helpers from the `helpers/` directory
4. Update this README with your test suite information
5. Document any specific setup requirements

## Test Conventions

- Use descriptive test names
- Group related tests with `test.describe()`
- Use data-testid attributes for element selection
- Clean up after tests (close connections, stop containers)
- Add comments for complex test logic

## Dependencies

All test suites share these dependencies:
- @playwright/test
- @types/node
- TypeScript

Feature-specific dependencies should be documented in the respective test suite directories.

## Continuous Integration

Tests can be run in CI/CD pipelines using:
```bash
# Headless mode for CI
npm run test:ci
```

## Troubleshooting

### Port Already in Use
If you get a port conflict error, check which containers are running:
```bash
docker ps
```

### Tests Timing Out
Increase the timeout in playwright.config.ts or individual tests:
```typescript
test.setTimeout(60000); // 60 seconds
```

### Container Not Accessible
Ensure Docker Desktop is running and the container started successfully:
```bash
docker logs test-container-[ticket-number]
```

---

**Note**: This is a shared testing infrastructure. Please coordinate with other developers when running tests to avoid conflicts.