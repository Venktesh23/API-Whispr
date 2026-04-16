# Contributing to API-Whispr

Thank you for your interest in contributing to API-Whispr! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Report unethical behavior to maintainers

## Getting Started

### Prerequisites
- Node.js 18+
- Git
- npm or yarn
- Basic knowledge of React, Next.js, and JavaScript/TypeScript

### Development Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/API-Whispr.git
cd API-Whispr

# Install dependencies
npm install

# Create a feature branch
git checkout -b feature/your-feature-name

# Start development server
npm run dev
```

## Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/descriptive-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions

### 2. Make Your Changes
- Write clean, readable code
- Follow ESLint rules
- Add comments for complex logic
- Keep commits atomic and meaningful

### 3. Test Your Changes
```bash
# Run linting
npm run lint

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run all tests
npm run test:ci
```

### 4. Commit Your Changes
```bash
git add .
git commit -m "feat: description of changes"
```

Commit message format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style (formatting, semicolons, etc.)
- `refactor:` Code restructuring
- `test:` Adding/updating tests
- `chore:` Build, dependencies, CI/CD

### 5. Push and Create a Pull Request
```bash
git push origin feature/your-feature-name
```

## Pull Request Guidelines

### PR Title Format
- Be descriptive: "Add authentication to API endpoints"
- Start with type tag: `[FEATURE]`, `[FIX]`, `[DOCS]`
- Example: `[FEATURE] Add authentication to API endpoints`

### PR Description Template
```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] Code refactoring

## Related Issues
Fixes #123

## Testing
Describe testing performed:
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests passing
```

## Code Style Guide

### JavaScript/React Standards
```javascript
// Use const by default, let if needed
const message = 'Hello';

// Use arrow functions
const handleClick = () => {
  console.log('Clicked');
};

// Use destructuring
const { name, email } = user;

// Use template literals
const greeting = `Hello, ${name}!`;

// Use async/await over .then()
const data = await fetchData();
```

### File Organization
```
components/
  MyComponent.jsx          # Component file
  MyComponent.module.css   # Component styles
  
utils/
  helpers.js               # Utility functions
  helpers.test.js         # Unit tests
```

### Component Structure
```javascript
import React, { useState, useEffect } from 'react';

/**
 * Component description
 * @param {Object} props - Component props
 * @returns {JSX.Element}
 */
const MyComponent = ({ prop1, prop2 }) => {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Effect logic
  }, []);

  const handleClick = () => {
    // Handler logic
  };

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};

export default MyComponent;
```

## Testing Requirements

### When to Write Tests
- [ ] New API endpoints
- [ ] New utility functions
- [ ] New components
- [ ] Bug fixes

### Test Coverage Targets
- Utilities: 90%+
- Components: 80%+
- API routes: 85%+

Example test:
```javascript
describe('MyComponent', () => {
  test('renders correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Hello')).toBeInTheDocument();
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    const { getByRole } = render(
      <MyComponent onClick={handleClick} />
    );
    fireEvent.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Documentation Standards

### README Updates
- Include new features in README
- Update API documentation
- Add examples for new functionality

### Code Comments
```javascript
// Good: Explains WHY, not WHAT
// Cache results to prevent redundant API calls
const cachedResults = useCallback(() => {...}, [deps]);

// Bad: Obvious from code
// Set state to user data
setState(userData);

// Good: JSDoc for functions
/**
 * Analyzes an OpenAPI spec
 * @param {Object} spec - The OpenAPI specification
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeSpec(spec) {
  // Implementation
}
```

## Common Tasks

### Adding a New API Endpoint
1. Create handler in `pages/api/`
2. Add input validation
3. Add error handling
4. Write tests
5. Update API documentation

### Adding a New Component
1. Create component file in `components/`
2. Add prop validation
3. Write component tests
4. Document with JSDoc
5. Add to component showcase

### Adding a New Feature
1. Create feature branch
2. Implement feature
3. Add tests (unit + integration)
4. Update documentation
5. Create pull request with clear description

## Reporting Issues

### Bug Report Template
```markdown
## Description
Clear description of the bug.

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Environment
- Node version: 
- OS: 
- Browser: 

## Screenshots
If applicable
```

### Feature Request Template
```markdown
## Description
Clear description of feature.

## Use Case
Why this feature is needed.

## Proposed Solution
Your suggestion for implementation.

## Alternatives Considered
Other approaches if any.
```

## Performance Considerations

- [ ] Optimize re-renders with React.memo
- [ ] Use useCallback for event handlers
- [ ] Implement lazy loading for routes
- [ ] Optimize database queries
- [ ] Use caching appropriately

## Security Best Practices

- [ ] No hardcoded API keys
- [ ] Validate all inputs
- [ ] Sanitize user data
- [ ] Use environment variables
- [ ] Review security implications
- [ ] Never commit sensitive data

## Review Process

Your PR will be reviewed by maintainers for:
1. Code quality and style
2. Test coverage
3. Documentation completeness
4. Performance implications
5. Security concerns

Feedback will be provided if changes are needed.

## Getting Help

- Check existing issues and PRs
- Review documentation
- Ask in discussions
- Ping maintainers in PRs
- Reference similar implementations

## Setting Commits

Good commit messages help with:
- Understanding changes quickly
- Generating changelogs
- Tracking issues
- Code archaeology

Example:
```
fix: prevent race condition in response handler

Introduce a request id and client token to prevent 
multiple requests from being processed incorrectly 
by background worker processes.

Fixes #123
```

## Merging PRs

Requirements before merge:
- [ ] All tests passing
- [ ] Code review approved
- [ ] No merge conflicts
- [ ] Documentation updated
- [ ] Changelog entry added

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)

## Questions?

Feel free to:
- Open a discussion
- Ask in existing issues
- Create a new issue for clarification
- Contact maintainers directly

Thank you for contributing! 🎉
