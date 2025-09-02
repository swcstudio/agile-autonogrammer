import type React from 'react';
import { useEffect, useState } from 'react';
import { aiTestGenerator } from '../ai-test-generator';
import { generateComponentTest } from '../component-test-generator';
import { coverageAnalyzer } from '../coverage-analyzer';
import { VisualRegressionTester } from '../visual-regression';

// Example Component for Testing
interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  onEdit?: (userId: string) => void;
  onDelete?: (userId: string) => void;
  isAdmin?: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit, onDelete, isAdmin = false }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleDelete = async () => {
    if (!onDelete || !window.confirm('Are you sure?')) return;

    setIsDeleting(true);
    try {
      await onDelete(user.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="user-card" data-testid={`user-card-${user.id}`}>
      <div className="user-avatar">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} />
        ) : (
          <div className="avatar-placeholder">{user.name[0]}</div>
        )}
      </div>

      <div className="user-info">
        <h3>{user.name}</h3>
        <p>{user.email}</p>

        <button onClick={() => setShowDetails(!showDetails)} aria-expanded={showDetails}>
          {showDetails ? 'Hide' : 'Show'} Details
        </button>

        {showDetails && (
          <div className="user-details">
            <p>ID: {user.id}</p>
            <p>Role: {isAdmin ? 'Admin' : 'User'}</p>
          </div>
        )}
      </div>

      <div className="user-actions">
        {onEdit && (
          <button onClick={() => onEdit(user.id)} aria-label="Edit user">
            Edit
          </button>
        )}

        {onDelete && isAdmin && (
          <button onClick={handleDelete} disabled={isDeleting} aria-label="Delete user">
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
};

// Example: Generate AI-powered tests
async function generateTestsExample() {
  console.log('🤖 Generating AI-powered tests for UserCard component...\n');

  // 1. Analyze component and generate tests
  const componentInfo = await aiTestGenerator.analyzeComponent('./UserCard.tsx');
  const testSuite = await aiTestGenerator.generateTests(componentInfo);

  console.log(`✅ Generated ${testSuite.testCount} tests`);
  console.log(`📊 Estimated coverage: ${testSuite.coverage}%\n`);

  // 2. Generate component-specific tests
  const componentTests = generateComponentTest({
    name: 'UserCard',
    props: [
      { name: 'user', type: 'object', required: true },
      { name: 'onEdit', type: 'function', required: false },
      { name: 'onDelete', type: 'function', required: false },
      { name: 'isAdmin', type: 'boolean', required: false },
    ],
    events: [
      { name: 'onClick', handler: 'handleEdit' },
      { name: 'onClick', handler: 'handleDelete' },
    ],
    states: [
      { name: 'isDeleting', setter: 'setIsDeleting', initialValue: false },
      { name: 'showDetails', setter: 'setShowDetails', initialValue: false },
    ],
    effects: [],
    filePath: './UserCard.tsx',
  });

  console.log('📝 Generated component test file:\n');
  console.log(componentTests.substring(0, 500) + '...\n');

  // 3. Generate mock data
  const mockUsers = await aiTestGenerator.generateMockData(
    {
      id: { type: 'uuid' },
      name: { type: 'string', format: 'fullName' },
      email: { type: 'string', format: 'email' },
      avatar: { type: 'string', format: 'url', required: false },
    },
    5
  );

  console.log('🎭 Generated mock data:');
  console.log(JSON.stringify(mockUsers, null, 2).substring(0, 300) + '...\n');

  // 4. Suggest test improvements
  const suggestions = await aiTestGenerator.suggestTestImprovements('./UserCard.test.tsx');

  console.log('💡 Test improvement suggestions:');
  suggestions.slice(0, 3).forEach((suggestion, i) => {
    console.log(`${i + 1}. ${suggestion}`);
  });
}

// Example: Visual regression testing
async function visualRegressionExample() {
  console.log('\n📸 Running visual regression tests...\n');

  const visualTester = new VisualRegressionTester({
    baseUrl: 'http://localhost:6006', // Storybook URL
    screenshotDir: './tests/visual/screenshots',
    threshold: 0.1,
    viewports: [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 375, height: 812, name: 'mobile' },
    ],
  });

  await visualTester.setup();

  try {
    // Test component variants
    const results = await visualTester.testComponent('UserCard', [
      { user: { id: '1', name: 'John Doe', email: 'john@example.com' } },
      { user: { id: '2', name: 'Jane Smith', email: 'jane@example.com' }, isAdmin: true },
      {
        user: {
          id: '3',
          name: 'Bob Johnson',
          email: 'bob@example.com',
          avatar: 'https://via.placeholder.com/150',
        },
      },
    ]);

    // Generate report
    const reportPath = await visualTester.generateReport(results);
    console.log(`✅ Visual regression report generated: ${reportPath}`);

    // Check results
    const failed = Array.from(results.values()).filter((r) => !r.passed);
    if (failed.length > 0) {
      console.log(`\n⚠️  ${failed.length} visual tests failed!`);
      failed.forEach((test) => {
        console.log(`- ${test.screenshotPath}: ${test.diffPercentage.toFixed(2)}% difference`);
      });
    } else {
      console.log('\n✅ All visual tests passed!');
    }
  } finally {
    await visualTester.teardown();
  }
}

// Example: Coverage analysis
async function coverageAnalysisExample() {
  console.log('\n📊 Analyzing test coverage...\n');

  // Analyze coverage
  const coverage = await coverageAnalyzer.analyzeCoverage('./coverage');

  console.log('Coverage Summary:');
  console.log(
    `- Statements: ${coverage.statements.percentage}% (${coverage.statements.covered}/${coverage.statements.total})`
  );
  console.log(
    `- Branches: ${coverage.branches.percentage}% (${coverage.branches.covered}/${coverage.branches.total})`
  );
  console.log(
    `- Functions: ${coverage.functions.percentage}% (${coverage.functions.covered}/${coverage.functions.total})`
  );
  console.log(
    `- Lines: ${coverage.lines.percentage}% (${coverage.lines.covered}/${coverage.lines.total})`
  );

  // Find uncovered code
  const uncovered = await coverageAnalyzer.findUncoveredCode('./coverage');

  if (uncovered.size > 0) {
    console.log('\n⚠️  Uncovered code found:');
    uncovered.forEach((lines, file) => {
      console.log(`\n${file}:`);
      console.log(`  Lines: ${lines.slice(0, 5).join(', ')}${lines.length > 5 ? '...' : ''}`);
    });
  }

  // Suggest missing tests
  const suggestions = await coverageAnalyzer.suggestMissingTests('./src', './tests');

  if (suggestions.length > 0) {
    console.log('\n💡 Missing test suggestions:');
    suggestions.slice(0, 5).forEach((suggestion) => {
      console.log(`- [${suggestion.severity.toUpperCase()}] ${suggestion.description}`);
    });
  }

  // Generate HTML report
  const reportPath = await coverageAnalyzer.generateCoverageReport('./coverage', 'html');
  console.log(`\n📄 HTML coverage report generated: ${reportPath}`);
}

// Example: Mutation testing
async function mutationTestingExample() {
  console.log('\n🧬 Running mutation tests...\n');

  const { spawn } = await import('node:child_process');

  return new Promise((resolve) => {
    const stryker = spawn('npx', ['stryker', 'run'], {
      stdio: 'inherit',
    });

    stryker.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Mutation testing completed successfully!');
        console.log('📄 Report available at: reports/mutation/index.html');
      } else {
        console.log('\n❌ Mutation testing failed with code:', code);
      }
      resolve(code);
    });
  });
}

// Run all examples
export async function runAllExamples() {
  console.log('🚀 Katalyst-React AI-Powered Testing Examples\n');
  console.log('='.repeat(50) + '\n');

  try {
    await generateTestsExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await visualRegressionExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await coverageAnalysisExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await mutationTestingExample();

    console.log('\n' + '='.repeat(50));
    console.log('\n🎉 All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// CLI entry point
if (import.meta.main) {
  runAllExamples();
}
