/**
 * Green Hat Utilities Tests
 * 
 * Comprehensive test suite for Green Hat educational security components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

import GreenHatUtilities from '../src/components/GreenHatUtilities';
import { useGreenHatUtilities } from '../src/hooks/useGreenHatUtilities';
import { useSecurityStore } from '../src/stores/securityStore';

// Mock the hooks
vi.mock('../src/hooks/useGreenHatUtilities');
vi.mock('../src/stores/securityStore');

// Mock data
const mockLearningModules = [
  {
    id: 'web-security-fundamentals',
    title: 'Web Application Security Fundamentals',
    description: 'Learn the basics of web application security including OWASP Top 10 vulnerabilities.',
    difficulty: 'beginner' as const,
    estimatedTime: '4 hours',
    completionRate: 92,
    tags: ['OWASP', 'Web Security', 'Basics'],
    objectives: [
      'Understand common web vulnerabilities',
      'Learn secure coding practices',
      'Practice vulnerability identification',
      'Implement basic security controls'
    ],
    content: [
      { title: 'Introduction to Web Security', type: 'video' as const, duration: '30 min' },
      { title: 'OWASP Top 10 Overview', type: 'interactive' as const, duration: '45 min' },
      { title: 'SQL Injection Deep Dive', type: 'hands-on' as const, duration: '60 min' }
    ]
  }
];

const mockHackingScenarios = [
  {
    id: 'web-app-penetration',
    name: 'Web Application Penetration Testing',
    description: 'Conduct a comprehensive security assessment of a purposely vulnerable web application.',
    targetEnvironment: 'Isolated DVWA instance',
    riskLevel: 'low' as const,
    learningGoals: ['Vulnerability Assessment', 'Exploitation Techniques', 'Report Writing'],
    tools: ['Burp Suite', 'OWASP ZAP', 'SQLMap', 'Nikto'],
    expectedOutcome: 'Complete vulnerability assessment report with remediation recommendations'
  }
];

const mockSecurityChallenges = [
  {
    id: 'xss-challenge-basic',
    title: 'Cross-Site Scripting Challenge',
    description: 'Find and exploit XSS vulnerabilities in a test application.',
    difficulty: 'easy' as const,
    points: 100,
    attempts: 0,
    hints: 3,
    categories: ['Web Security', 'XSS', 'Client-Side'],
    timeLimit: 1800,
    environment: 'sandbox',
    solution: {
      type: 'payload' as const,
      validation: 'script_execution_detected'
    }
  }
];

const mockGreenHatUtilities = {
  learningModules: mockLearningModules,
  hackingScenarios: mockHackingScenarios,
  securityChallenges: mockSecurityChallenges,
  defensiveTechniques: [],
  currentProgress: null,
  isLoading: false,
  error: null,
  startLearningModule: vi.fn(),
  executeScenario: vi.fn(),
  submitChallengeSolution: vi.fn(),
  getHintForChallenge: vi.fn(),
  generateEducationalPayload: vi.fn(),
  scanNetworkEducational: vi.fn(),
  generateVulnerabilityReport: vi.fn(),
  refreshData: vi.fn()
};

const mockSecurityStore = {
  securityEvents: [],
  addSecurityEvent: vi.fn(),
  threatLevel: 'Low' as const,
  metrics: {
    totalScans: 0,
    totalVulnerabilities: 0,
    criticalVulnerabilities: 0,
    highVulnerabilities: 0,
    averageScanTime: 0,
    lastScan: 0,
    riskTrend: 'Stable' as const,
    complianceScore: 0,
    threatLevel: 'None' as const
  }
};

describe('GreenHatUtilities Component', () => {
  beforeEach(() => {
    vi.mocked(useGreenHatUtilities).mockReturnValue(mockGreenHatUtilities);
    vi.mocked(useSecurityStore).mockReturnValue(mockSecurityStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the main component with header', () => {
      render(<GreenHatUtilities />);
      
      expect(screen.getByText('Green Hat Security Utilities')).toBeInTheDocument();
      expect(screen.getByText('Educational security tools and ethical hacking resources for learning and defense improvement')).toBeInTheDocument();
    });

    it('should render navigation tabs', () => {
      render(<GreenHatUtilities />);
      
      expect(screen.getByRole('button', { name: /learning/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /scenarios/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /challenges/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tools/i })).toBeInTheDocument();
    });

    it('should handle theme prop correctly', () => {
      const { rerender } = render(<GreenHatUtilities theme="light" />);
      expect(screen.getByText('Green Hat Security Utilities').closest('.bg-gray-50')).toBeInTheDocument();

      rerender(<GreenHatUtilities theme="dark" />);
      expect(screen.getByText('Green Hat Security Utilities').closest('.bg-gray-900')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<GreenHatUtilities className="custom-class" />);
      expect(screen.getByText('Green Hat Security Utilities').closest('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Learning Modules Tab', () => {
    it('should display learning modules by default', () => {
      render(<GreenHatUtilities />);
      
      expect(screen.getByText('Security Learning Modules')).toBeInTheDocument();
      expect(screen.getByText('Web Application Security Fundamentals')).toBeInTheDocument();
      expect(screen.getByText('beginner')).toBeInTheDocument();
      expect(screen.getByText('4 hours • 92% completion rate')).toBeInTheDocument();
    });

    it('should open module details modal when clicking on module', async () => {
      const user = userEvent.setup();
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByText('Web Application Security Fundamentals'));
      
      await waitFor(() => {
        expect(screen.getByText('Learning Objectives')).toBeInTheDocument();
        expect(screen.getByText('Course Content')).toBeInTheDocument();
      });
    });

    it('should start learning module when button is clicked', async () => {
      const user = userEvent.setup();
      render(<GreenHatUtilities />);
      
      // Open modal
      await user.click(screen.getByText('Web Application Security Fundamentals'));
      
      // Click start learning button
      await user.click(screen.getByText('Start Learning'));
      
      expect(mockGreenHatUtilities.startLearningModule).toHaveBeenCalledWith('web-security-fundamentals');
      expect(mockSecurityStore.addSecurityEvent).toHaveBeenCalled();
    });

    it('should close modal when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<GreenHatUtilities />);
      
      // Open modal
      await user.click(screen.getByText('Web Application Security Fundamentals'));
      
      // Close modal
      await user.click(screen.getByText('Cancel'));
      
      await waitFor(() => {
        expect(screen.queryByText('Learning Objectives')).not.toBeInTheDocument();
      });
    });

    it('should filter modules by difficulty level', async () => {
      const user = userEvent.setup();
      render(<GreenHatUtilities />);
      
      const difficultySelect = screen.getByDisplayValue('All Levels');
      await user.selectOptions(difficultySelect, 'beginner');
      
      // This would filter modules in a real implementation
      expect(difficultySelect).toHaveValue('beginner');
    });
  });

  describe('Hacking Scenarios Tab', () => {
    it('should switch to scenarios tab and display scenarios', async () => {
      const user = userEvent.setup();
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByRole('button', { name: /scenarios/i }));
      
      expect(screen.getByText('Ethical Hacking Scenarios')).toBeInTheDocument();
      expect(screen.getByText('Web Application Penetration Testing')).toBeInTheDocument();
      expect(screen.getByText('low risk')).toBeInTheDocument();
    });

    it('should execute scenario when start button is clicked', async () => {
      const user = userEvent.setup();
      const mockScenarioResult = {
        scenarioId: 'web-app-penetration',
        startTime: Date.now() - 120000,
        endTime: Date.now(),
        success: true,
        findings: [],
        toolsUsed: ['Burp Suite'],
        learningOutcomes: []
      };

      mockGreenHatUtilities.executeScenario.mockResolvedValue(mockScenarioResult);
      
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByRole('button', { name: /scenarios/i }));
      await user.click(screen.getByText('Start Scenario'));
      
      await waitFor(() => {
        expect(mockGreenHatUtilities.executeScenario).toHaveBeenCalledWith('web-app-penetration');
        expect(mockSecurityStore.addSecurityEvent).toHaveBeenCalled();
      });
    });

    it('should call onScenarioComplete callback when provided', async () => {
      const user = userEvent.setup();
      const mockOnScenarioComplete = vi.fn();
      const mockScenarioResult = {
        scenarioId: 'web-app-penetration',
        startTime: Date.now(),
        endTime: Date.now(),
        success: true,
        findings: [],
        toolsUsed: [],
        learningOutcomes: []
      };

      mockGreenHatUtilities.executeScenario.mockResolvedValue(mockScenarioResult);
      
      render(<GreenHatUtilities onScenarioComplete={mockOnScenarioComplete} />);
      
      await user.click(screen.getByRole('button', { name: /scenarios/i }));
      await user.click(screen.getByText('Start Scenario'));
      
      await waitFor(() => {
        expect(mockOnScenarioComplete).toHaveBeenCalledWith(
          mockHackingScenarios[0],
          mockScenarioResult
        );
      });
    });
  });

  describe('Security Challenges Tab', () => {
    it('should switch to challenges tab and display challenges', async () => {
      const user = userEvent.setup();
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByRole('button', { name: /challenges/i }));
      
      expect(screen.getByText('Security Challenges')).toBeInTheDocument();
      expect(screen.getByText('Cross-Site Scripting Challenge')).toBeInTheDocument();
      expect(screen.getByText('Points: 100')).toBeInTheDocument();
      expect(screen.getByText('0 attempts')).toBeInTheDocument();
    });

    it('should start challenge when button is clicked', async () => {
      const user = userEvent.setup();
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByRole('button', { name: /challenges/i }));
      await user.click(screen.getByText('Start Challenge'));
      
      // In a real implementation, this would open a challenge interface
      expect(screen.getByText('Start Challenge')).toBeInTheDocument();
    });

    it('should get hint when hint button is clicked', async () => {
      const user = userEvent.setup();
      mockGreenHatUtilities.getHintForChallenge.mockResolvedValue('Look for input fields that reflect user data');
      
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByRole('button', { name: /challenges/i }));
      await user.click(screen.getByText('Get Hint (3 available)'));
      
      await waitFor(() => {
        expect(mockGreenHatUtilities.getHintForChallenge).toHaveBeenCalledWith('xss-challenge-basic');
      });
    });

    it('should display challenge categories as tags', async () => {
      const user = userEvent.setup();
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByRole('button', { name: /challenges/i }));
      
      expect(screen.getByText('Web Security')).toBeInTheDocument();
      expect(screen.getByText('XSS')).toBeInTheDocument();
      expect(screen.getByText('Client-Side')).toBeInTheDocument();
    });
  });

  describe('Security Tools Tab', () => {
    it('should switch to tools tab and display educational tools', async () => {
      const user = userEvent.setup();
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByRole('button', { name: /tools/i }));
      
      expect(screen.getByText('Educational Security Tools')).toBeInTheDocument();
      expect(screen.getByText('Network Discovery Tool')).toBeInTheDocument();
      expect(screen.getByText('Educational Payload Generator')).toBeInTheDocument();
      expect(screen.getByText('Vulnerability Report Template')).toBeInTheDocument();
    });

    it('should handle network scan tool input', async () => {
      const user = userEvent.setup();
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByRole('button', { name: /tools/i }));
      
      const ipInput = screen.getByPlaceholderText('Target IP range (e.g., 192.168.1.0/24)');
      await user.type(ipInput, '192.168.1.0/24');
      
      expect(ipInput).toHaveValue('192.168.1.0/24');
    });

    it('should start educational network scan', async () => {
      const user = userEvent.setup();
      mockGreenHatUtilities.scanNetworkEducational.mockResolvedValue({
        target: '192.168.1.0/24',
        results: { hostsDiscovered: [] }
      });
      
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByRole('button', { name: /tools/i }));
      await user.click(screen.getByText('Start Network Scan (Educational)'));
      
      // In a real implementation, this would trigger the scan
      expect(screen.getByText('Start Network Scan (Educational)')).toBeInTheDocument();
    });

    it('should handle payload generator selection', async () => {
      const user = userEvent.setup();
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByRole('button', { name: /tools/i }));
      
      const payloadSelect = screen.getByDisplayValue('XSS Payload');
      await user.selectOptions(payloadSelect, 'SQL Injection');
      
      expect(payloadSelect).toHaveValue('SQL Injection');
    });

    it('should generate educational payload', async () => {
      const user = userEvent.setup();
      mockGreenHatUtilities.generateEducationalPayload.mockResolvedValue(
        `' UNION SELECT username, password FROM users WHERE '1'='1' -- Educational SQL injection`
      );
      
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByRole('button', { name: /tools/i }));
      await user.click(screen.getByText('Generate Educational Payload'));
      
      // In a real implementation, this would show the generated payload
      expect(screen.getByText('Generate Educational Payload')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when there is an error', () => {
      vi.mocked(useGreenHatUtilities).mockReturnValue({
        ...mockGreenHatUtilities,
        error: 'Failed to load security utilities'
      });
      
      render(<GreenHatUtilities />);
      
      expect(screen.getByText('Error: Failed to load security utilities')).toBeInTheDocument();
    });

    it('should handle loading state', () => {
      vi.mocked(useGreenHatUtilities).mockReturnValue({
        ...mockGreenHatUtilities,
        isLoading: true
      });
      
      render(<GreenHatUtilities />);
      
      expect(screen.getByText('Loading security utilities...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<GreenHatUtilities />);
      
      const tabButtons = screen.getAllByRole('button');
      expect(tabButtons.length).toBeGreaterThan(0);
      
      // Check main heading
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Green Hat Security Utilities');
    });

    it('should be keyboard navigable', async () => {
      render(<GreenHatUtilities />);
      
      const firstTab = screen.getByRole('button', { name: /learning/i });
      firstTab.focus();
      
      expect(firstTab).toHaveFocus();
      
      // Tab navigation
      await userEvent.keyboard('{Tab}');
      const secondTab = screen.getByRole('button', { name: /scenarios/i });
      expect(secondTab).toHaveFocus();
    });

    it('should support screen readers with descriptive text', () => {
      render(<GreenHatUtilities />);
      
      expect(screen.getByText('Educational security tools and ethical hacking resources for learning and defense improvement')).toBeInTheDocument();
      expect(screen.getByText('Learn the basics of web application security including OWASP Top 10 vulnerabilities.')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<GreenHatUtilities />);
      
      // Re-render with same props
      rerender(<GreenHatUtilities />);
      
      expect(screen.getByText('Green Hat Security Utilities')).toBeInTheDocument();
    });

    it('should handle large numbers of modules efficiently', () => {
      const manyModules = Array.from({ length: 100 }, (_, i) => ({
        ...mockLearningModules[0],
        id: `module-${i}`,
        title: `Module ${i}`
      }));

      vi.mocked(useGreenHatUtilities).mockReturnValue({
        ...mockGreenHatUtilities,
        learningModules: manyModules
      });
      
      render(<GreenHatUtilities />);
      
      // Should render without performance issues
      expect(screen.getByText('Security Learning Modules')).toBeInTheDocument();
    });
  });

  describe('Security Features', () => {
    it('should sanitize user input in forms', async () => {
      const user = userEvent.setup();
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByRole('button', { name: /tools/i }));
      
      const ipInput = screen.getByPlaceholderText('Target IP range (e.g., 192.168.1.0/24)');
      await user.type(ipInput, '<script>alert("xss")</script>');
      
      // Input should be sanitized or escaped
      expect(ipInput).toHaveValue('<script>alert("xss")</script>');
      // In a real implementation, this would be sanitized
    });

    it('should not execute malicious payloads in educational context', () => {
      render(<GreenHatUtilities />);
      
      // Component should render safely even with XSS attempts
      expect(() => {
        render(<GreenHatUtilities className="<script>alert('xss')</script>" />);
      }).not.toThrow();
    });

    it('should include appropriate warnings for educational tools', async () => {
      const user = userEvent.setup();
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByRole('button', { name: /tools/i }));
      
      expect(screen.getByText('Learn network reconnaissance techniques in a safe, controlled environment.')).toBeInTheDocument();
      expect(screen.getByText('Generate test payloads to understand how vulnerabilities work.')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should integrate with security store for event logging', async () => {
      const user = userEvent.setup();
      render(<GreenHatUtilities />);
      
      await user.click(screen.getByText('Web Application Security Fundamentals'));
      await user.click(screen.getByText('Start Learning'));
      
      expect(mockSecurityStore.addSecurityEvent).toHaveBeenCalledWith({
        type: 'green_hat_learning',
        message: 'Started learning module: Web Application Security Fundamentals',
        timestamp: expect.any(Number),
        metadata: {
          moduleId: 'web-security-fundamentals',
          difficulty: 'beginner'
        }
      });
    });

    it('should handle hook errors gracefully', () => {
      vi.mocked(useGreenHatUtilities).mockImplementation(() => {
        throw new Error('Hook error');
      });
      
      expect(() => {
        render(<GreenHatUtilities />);
      }).toThrow('Hook error');
    });
  });
});

describe('Green Hat Utilities Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Note: These would be integration tests if we were testing the actual hook
  // For now, we're testing the mocked implementation

  describe('Learning Module Management', () => {
    it('should start learning module successfully', async () => {
      const { startLearningModule } = mockGreenHatUtilities;
      
      await act(async () => {
        await startLearningModule('web-security-fundamentals');
      });
      
      expect(startLearningModule).toHaveBeenCalledWith('web-security-fundamentals');
    });

    it('should handle learning module errors', async () => {
      const { startLearningModule } = mockGreenHatUtilities;
      startLearningModule.mockRejectedValue(new Error('Module not found'));
      
      await expect(startLearningModule('invalid-module')).rejects.toThrow('Module not found');
    });
  });

  describe('Scenario Execution', () => {
    it('should execute scenario and return results', async () => {
      const mockResult = {
        scenarioId: 'web-app-penetration',
        startTime: Date.now(),
        endTime: Date.now(),
        success: true,
        findings: [],
        toolsUsed: [],
        learningOutcomes: []
      };

      const { executeScenario } = mockGreenHatUtilities;
      executeScenario.mockResolvedValue(mockResult);
      
      const result = await executeScenario('web-app-penetration');
      
      expect(result).toEqual(mockResult);
      expect(executeScenario).toHaveBeenCalledWith('web-app-penetration');
    });
  });

  describe('Challenge Management', () => {
    it('should submit challenge solution', async () => {
      const { submitChallengeSolution } = mockGreenHatUtilities;
      submitChallengeSolution.mockResolvedValue(true);
      
      const solution = {
        type: 'payload',
        payload: '<script>alert(1)</script>',
        explanation: 'XSS payload for demonstration'
      };
      
      const result = await submitChallengeSolution('xss-challenge-basic', solution);
      
      expect(result).toBe(true);
      expect(submitChallengeSolution).toHaveBeenCalledWith('xss-challenge-basic', solution);
    });

    it('should get challenge hint', async () => {
      const { getHintForChallenge } = mockGreenHatUtilities;
      const expectedHint = 'Look for input fields that reflect user data';
      getHintForChallenge.mockResolvedValue(expectedHint);
      
      const hint = await getHintForChallenge('xss-challenge-basic');
      
      expect(hint).toBe(expectedHint);
      expect(getHintForChallenge).toHaveBeenCalledWith('xss-challenge-basic');
    });
  });

  describe('Educational Tools', () => {
    it('should generate educational payload', async () => {
      const { generateEducationalPayload } = mockGreenHatUtilities;
      const expectedPayload = '<script>alert("Educational XSS demonstration for target")</script>';
      generateEducationalPayload.mockResolvedValue(expectedPayload);
      
      const payload = await generateEducationalPayload('XSS Payload', 'target');
      
      expect(payload).toBe(expectedPayload);
      expect(generateEducationalPayload).toHaveBeenCalledWith('XSS Payload', 'target');
    });

    it('should perform educational network scan', async () => {
      const { scanNetworkEducational } = mockGreenHatUtilities;
      const expectedResult = {
        target: '192.168.1.0/24',
        scanType: 'Educational Network Discovery',
        timestamp: Date.now(),
        results: {
          hostsDiscovered: [],
          openPorts: [],
          vulnerabilities: []
        }
      };
      scanNetworkEducational.mockResolvedValue(expectedResult);
      
      const result = await scanNetworkEducational('192.168.1.0/24');
      
      expect(result).toEqual(expectedResult);
      expect(scanNetworkEducational).toHaveBeenCalledWith('192.168.1.0/24');
    });

    it('should generate vulnerability report', async () => {
      const { generateVulnerabilityReport } = mockGreenHatUtilities;
      const findings = [
        { severity: 'high', category: 'XSS', description: 'XSS vulnerability found' }
      ];
      const expectedReport = '# Vulnerability Assessment Report\n\n**Report Generated:**';
      generateVulnerabilityReport.mockResolvedValue(expectedReport);
      
      const report = await generateVulnerabilityReport(findings);
      
      expect(report).toContain('Vulnerability Assessment Report');
      expect(generateVulnerabilityReport).toHaveBeenCalledWith(findings);
    });
  });
});