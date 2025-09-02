import type { ComponentInfo } from './types';

export class ComponentTestGenerator {
  generateComponentTest(info: ComponentInfo): string {
    const imports = this.generateImports(info);
    const setup = this.generateSetup(info);
    const renderTests = this.generateRenderTests(info);
    const propTests = this.generatePropTests(info);
    const eventTests = this.generateEventTests(info);
    const stateTests = this.generateStateTests(info);
    const accessibilityTests = this.generateAccessibilityTests(info);
    const snapshotTests = this.generateSnapshotTests(info);

    return `${imports}

${setup}

describe('${info.name}', () => {
${renderTests}
${propTests}
${eventTests}
${stateTests}
${accessibilityTests}
${snapshotTests}
});`;
  }

  private generateImports(info: ComponentInfo): string {
    const imports = [
      `import { describe, test, expect, beforeEach, afterEach } from '@katalyst/test-utils';`,
      `import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';`,
      `import userEvent from '@testing-library/user-event';`,
      `import { axe, toHaveNoViolations } from 'jest-axe';`,
      `import { ${info.name} } from './${info.name}';`,
    ];

    // Add additional imports based on component needs
    if (info.states.length > 0) {
      imports.push(`import { renderHook, act } from '@testing-library/react-hooks';`);
    }

    if (info.props.some((p) => p.type.includes('function'))) {
      imports.push(`import { jest } from '@jest/globals';`);
    }

    return imports.join('\n');
  }

  private generateSetup(info: ComponentInfo): string {
    return `
// Extend expect with accessibility matchers
expect.extend(toHaveNoViolations);

// Default props for testing
const defaultProps = {
${info.props
  .filter((p) => p.required)
  .map((p) => `  ${p.name}: ${this.getDefaultValue(p.type)}`)
  .join(',\n')}
};

// Test utilities
const renderComponent = (props = {}) => {
  return render(<${info.name} {...defaultProps} {...props} />);
};

// Cleanup after each test
afterEach(() => {
  cleanup();
});`;
  }

  private generateRenderTests(info: ComponentInfo): string {
    return `
  describe('Rendering', () => {
    test('renders without crashing', () => {
      const { container } = renderComponent();
      expect(container).toBeInTheDocument();
    });

    test('renders with minimum required props', () => {
      const { container } = render(
        <${info.name}
${info.props
  .filter((p) => p.required)
  .map((p) => `          ${p.name}={${this.getDefaultValue(p.type)}}`)
  .join('\n')}
        />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    test('renders children when provided', () => {
      const { getByText } = render(
        <${info.name} {...defaultProps}>
          <span>Test Child</span>
        </${info.name}>
      );
      expect(getByText('Test Child')).toBeInTheDocument();
    });

    test('applies className when provided', () => {
      const { container } = renderComponent({ className: 'custom-class' });
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });`;
  }

  private generatePropTests(info: ComponentInfo): string {
    if (info.props.length === 0) return '';

    const propTests = info.props
      .map((prop) => {
        if (prop.type.includes('function')) {
          return this.generateCallbackPropTest(info.name, prop);
        } else if (prop.type === 'boolean') {
          return this.generateBooleanPropTest(info.name, prop);
        } else if (prop.type === 'string' || prop.type === 'number') {
          return this.generateValuePropTest(info.name, prop);
        } else if (prop.type.includes('[]')) {
          return this.generateArrayPropTest(info.name, prop);
        } else {
          return this.generateObjectPropTest(info.name, prop);
        }
      })
      .join('\n');

    return `
  describe('Props', () => {
${propTests}
  });`;
  }

  private generateCallbackPropTest(componentName: string, prop: ComponentProp): string {
    const eventTrigger = this.getEventTrigger(prop.name);
    return `
    test('${prop.name} callback is called correctly', async () => {
      const ${prop.name} = jest.fn();
      const { getByRole } = renderComponent({ ${prop.name} });
      
      ${eventTrigger}
      
      expect(${prop.name}).toHaveBeenCalled();
    });`;
  }

  private generateBooleanPropTest(componentName: string, prop: ComponentProp): string {
    return `
    test('${prop.name} prop controls visibility/behavior', () => {
      const { rerender, queryByTestId } = renderComponent({ ${prop.name}: false });
      
      // Test false state
      expect(queryByTestId('${prop.name}-element')).not.toBeInTheDocument();
      
      // Test true state
      rerender(<${componentName} {...defaultProps} ${prop.name} />);
      expect(queryByTestId('${prop.name}-element')).toBeInTheDocument();
    });`;
  }

  private generateValuePropTest(componentName: string, prop: ComponentProp): string {
    const testValue = prop.type === 'string' ? '"Test Value"' : '42';
    return `
    test('${prop.name} prop updates content', () => {
      const { getByText, rerender } = renderComponent({ ${prop.name}: ${testValue} });
      
      expect(getByText(${testValue})).toBeInTheDocument();
      
      // Test prop update
      const newValue = ${prop.type === 'string' ? '"Updated Value"' : '100'};
      rerender(<${componentName} {...defaultProps} ${prop.name}={newValue} />);
      expect(getByText(newValue)).toBeInTheDocument();
    });`;
  }

  private generateArrayPropTest(componentName: string, prop: ComponentProp): string {
    return `
    test('${prop.name} prop renders list correctly', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      const { getAllByRole } = renderComponent({ ${prop.name}: items });
      
      const listItems = getAllByRole('listitem');
      expect(listItems).toHaveLength(items.length);
      
      items.forEach((item, index) => {
        expect(listItems[index]).toHaveTextContent(item);
      });
    });`;
  }

  private generateObjectPropTest(componentName: string, prop: ComponentProp): string {
    return `
    test('${prop.name} prop configures component correctly', () => {
      const config = {
        title: 'Test Title',
        enabled: true,
        value: 100
      };
      
      const { getByText, getByRole } = renderComponent({ ${prop.name}: config });
      
      expect(getByText(config.title)).toBeInTheDocument();
      expect(getByRole('button')).toBeEnabled();
    });`;
  }

  private generateEventTests(info: ComponentInfo): string {
    if (info.events.length === 0) return '';

    const eventTests = info.events
      .map(
        (event) => `
    test('${event.name} event handler works correctly', async () => {
      const user = userEvent.setup();
      const ${event.handler} = jest.fn();
      const { getByRole } = renderComponent({ ${event.name}: ${event.handler} });
      
      const element = getByRole('button'); // Adjust selector as needed
      await user.${this.getUserEventMethod(event.name)}(element);
      
      expect(${event.handler}).toHaveBeenCalledTimes(1);
      expect(${event.handler}).toHaveBeenCalledWith(
        expect.objectContaining({
          type: '${event.name.slice(2).toLowerCase()}'
        })
      );
    });`
      )
      .join('\n');

    return `
  describe('Events', () => {
${eventTests}
  });`;
  }

  private generateStateTests(info: ComponentInfo): string {
    if (info.states.length === 0) return '';

    const stateTests = info.states
      .map(
        (state) => `
    test('${state.name} state updates correctly', async () => {
      const { getByRole, getByText } = renderComponent();
      
      // Initial state
      expect(getByText(${JSON.stringify(state.initialValue)})).toBeInTheDocument();
      
      // Update state
      const button = getByRole('button', { name: /update/i });
      await userEvent.click(button);
      
      // Verify state change
      await waitFor(() => {
        expect(getByText('Updated Value')).toBeInTheDocument();
      });
    });`
      )
      .join('\n');

    return `
  describe('State Management', () => {
${stateTests}
  });`;
  }

  private generateAccessibilityTests(info: ComponentInfo): string {
    return `
  describe('Accessibility', () => {
    test('meets WCAG accessibility standards', async () => {
      const { container } = renderComponent();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('has proper ARIA attributes', () => {
      const { getByRole } = renderComponent();
      const element = getByRole('${this.getAriaRole(info.name)}');
      
      expect(element).toHaveAttribute('aria-label');
      expect(element).toHaveAccessibleName();
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      const { getByRole } = renderComponent();
      
      // Tab to element
      await user.tab();
      const element = getByRole('${this.getAriaRole(info.name)}');
      expect(element).toHaveFocus();
      
      // Activate with keyboard
      await user.keyboard('{Enter}');
      // Verify action occurred
    });

    test('has sufficient color contrast', () => {
      const { container } = renderComponent();
      const styles = window.getComputedStyle(container.firstChild);
      
      // This is a simplified check - real implementation would calculate contrast ratio
      expect(styles.color).not.toBe(styles.backgroundColor);
    });
  });`;
  }

  private generateSnapshotTests(info: ComponentInfo): string {
    return `
  describe('Snapshots', () => {
    test('matches snapshot with default props', () => {
      const { container } = renderComponent();
      expect(container.firstChild).toMatchSnapshot();
    });

    test('matches snapshot with all props', () => {
      const allProps = {
${info.props.map((p) => `        ${p.name}: ${this.getSnapshotValue(p.type)}`).join(',\n')}
      };
      
      const { container } = renderComponent(allProps);
      expect(container.firstChild).toMatchSnapshot();
    });
  });`;
  }

  private getDefaultValue(type: string): string {
    if (type.includes('function')) return 'jest.fn()';
    if (type === 'string') return '"Default Text"';
    if (type === 'number') return '0';
    if (type === 'boolean') return 'false';
    if (type.includes('[]')) return '[]';
    if (type === 'object') return '{}';
    return 'null';
  }

  private getSnapshotValue(type: string): string {
    if (type.includes('function')) return 'jest.fn()';
    if (type === 'string') return '"Snapshot Text"';
    if (type === 'number') return '42';
    if (type === 'boolean') return 'true';
    if (type.includes('[]')) return '["Item 1", "Item 2"]';
    if (type === 'object') return '{ key: "value" }';
    return 'null';
  }

  private getEventTrigger(eventName: string): string {
    if (eventName === 'onClick') return 'await userEvent.click(getByRole("button"));';
    if (eventName === 'onChange') return 'await userEvent.type(getByRole("textbox"), "test");';
    if (eventName === 'onSubmit')
      return 'await userEvent.click(getByRole("button", { name: /submit/i }));';
    if (eventName === 'onFocus') return 'await userEvent.tab();';
    if (eventName === 'onBlur') return 'await userEvent.tab(); await userEvent.tab();';
    return 'await userEvent.click(getByRole("button"));';
  }

  private getUserEventMethod(eventName: string): string {
    const eventMap: Record<string, string> = {
      onClick: 'click',
      onDoubleClick: 'dblClick',
      onChange: 'type',
      onFocus: 'tab',
      onBlur: 'tab',
      onKeyDown: 'keyboard',
      onMouseEnter: 'hover',
      onMouseLeave: 'unhover',
    };
    return eventMap[eventName] || 'click';
  }

  private getAriaRole(componentName: string): string {
    const roleMap: Record<string, string> = {
      Button: 'button',
      Input: 'textbox',
      Select: 'combobox',
      Checkbox: 'checkbox',
      Radio: 'radio',
      Link: 'link',
      Dialog: 'dialog',
      Alert: 'alert',
      Tab: 'tab',
      Menu: 'menu',
    };

    // Try to match component name to role
    for (const [key, role] of Object.entries(roleMap)) {
      if (componentName.includes(key)) {
        return role;
      }
    }

    return 'region'; // Generic fallback
  }
}

// Export factory function
export function generateComponentTest(componentInfo: ComponentInfo): string {
  const generator = new ComponentTestGenerator();
  return generator.generateComponentTest(componentInfo);
}

// CLI interface
export async function generateTestFromFile(componentPath: string): Promise<void> {
  const { AITestGenerator } = await import('./ai-test-generator');
  const generator = new AITestGenerator();
  const componentInfo = await generator.analyzeComponent(componentPath);

  const componentGenerator = new ComponentTestGenerator();
  const testContent = componentGenerator.generateComponentTest(componentInfo);

  const testPath = componentPath.replace(/\.(tsx?)$/, '.test.$1');
  await Deno.writeTextFile(testPath, testContent);

  console.log(`✅ Generated test file: ${testPath}`);
  console.log(`📊 Generated ${testContent.match(/test\(/g)?.length || 0} test cases`);
}
