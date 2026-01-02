# Contributing to DemoKit

Thank you for your interest in contributing to DemoKit! This guide will help you get started.

## Code of Conduct

Please be respectful and constructive in all interactions. We're building something together.

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+ (for workspace management)
- Git

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/demokit.git
cd demokit

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Development Workflow

```bash
# Watch mode for a specific package
cd packages/core
npm run dev

# Run tests in watch mode
npm test -- --watch

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Project Structure

```
demokit/
├── packages/           # NPM packages
│   ├── core/          # Foundation (fetch interception)
│   ├── react/         # React bindings
│   ├── next/          # Next.js adapter
│   ├── remix/         # Remix adapter
│   ├── react-router/  # React Router adapter
│   ├── tanstack-query/# TanStack Query integration
│   ├── swr/           # SWR integration
│   ├── trpc/          # tRPC integration
│   ├── auth/          # Auth abstraction
│   ├── schema/        # Schema parsing
│   ├── codegen/       # Data generation
│   └── cli/           # CLI tool
├── examples/          # Example applications
└── docs/              # Documentation (Mintlify)
```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed
- Keep changes focused and atomic

### 3. Test Your Changes

```bash
# Run all tests
pnpm test

# Run tests for a specific package
cd packages/core && npm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### 4. Commit Your Changes

We use conventional commits:

```bash
git commit -m "feat(core): add new pattern matching option"
git commit -m "fix(react): resolve hydration mismatch"
git commit -m "docs(readme): update installation instructions"
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting (no code change)
- `refactor` - Code change that neither fixes nor adds
- `perf` - Performance improvement
- `test` - Adding tests
- `chore` - Maintenance tasks

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub.

## Guidelines

### Code Style

- **TypeScript**: All code must be in TypeScript with strict mode
- **No `any`**: Avoid `any` types; use proper typing
- **Functional**: Prefer functional patterns over classes
- **Immutable**: Avoid mutation where possible
- **Small functions**: Keep functions focused and small
- **Descriptive names**: Use clear, descriptive variable/function names

### Testing

- Write tests for all new functionality
- Maintain or improve code coverage
- Test edge cases and error conditions
- Use descriptive test names

```typescript
describe('createDemoInterceptor', () => {
  it('should intercept matching routes', () => {
    // ...
  })

  it('should pass through non-matching routes', () => {
    // ...
  })
})
```

### Documentation

- Update README.md for API changes
- Add JSDoc comments to public APIs
- Update Mintlify docs for significant changes
- Include code examples

```typescript
/**
 * Creates a demo interceptor for mocking API calls.
 *
 * @param options - Interceptor configuration
 * @returns Demo interceptor instance
 *
 * @example
 * ```ts
 * const interceptor = createDemoInterceptor({
 *   fixtures: {
 *     '/api/users': [{ id: '1', name: 'Demo' }]
 *   }
 * })
 * ```
 */
export function createDemoInterceptor(options: InterceptorOptions): DemoInterceptor
```

### Package Guidelines

When modifying packages:

1. **core** - Changes here affect all packages. Be careful!
2. **react** - Keep SSR-safe. Test with Next.js.
3. **Framework adapters** - Follow framework conventions
4. **codegen** - Ensure deterministic output with seeds
5. **schema** - Support multiple schema formats

### Breaking Changes

- Avoid breaking changes when possible
- If necessary, document migration path
- Consider deprecation warnings first
- Update version appropriately (semver)

## Adding a New Package

1. Create package directory under `packages/`
2. Set up `package.json` with proper name (`@demokit-ai/name`)
3. Add `tsconfig.json` extending base config
4. Add `tsup.config.ts` for bundling
5. Add to `pnpm-workspace.yaml`
6. Add README.md with documentation
7. Add tests

## Reporting Issues

### Bug Reports

Include:
- DemoKit version
- Node.js version
- Framework (Next.js, Remix, etc.)
- Minimal reproduction
- Expected vs actual behavior

### Feature Requests

Include:
- Use case description
- Proposed API (if applicable)
- Alternatives considered

## Getting Help

- Open a GitHub issue for bugs/features
- Join our Discord for questions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to DemoKit!
