#!/usr/bin/env node

/**
 * Katalyst CHANGELOG Action System
 * 
 * This script automatically generates documentation from CHANGELOG entries.
 * It parses the CHANGELOG.md file and creates/updates corresponding documentation.
 */

import fs from 'fs-extra';
import path from 'path';
import { parse } from 'yaml';
import chalk from 'chalk';
import { marked } from 'marked';
import { z } from 'zod';

// Schema for CHANGELOG entries
const ChangelogEntrySchema = z.object({
  version: z.string(),
  date: z.string(),
  changes: z.object({
    added: z.array(z.string()).optional(),
    changed: z.array(z.string()).optional(),
    deprecated: z.array(z.string()).optional(),
    removed: z.array(z.string()).optional(),
    fixed: z.array(z.string()).optional(),
    security: z.array(z.string()).optional()
  }),
  breaking: z.array(z.object({
    title: z.string(),
    description: z.string(),
    migration: z.string()
  })).optional(),
  packages: z.array(z.object({
    name: z.string(),
    changes: z.array(z.string())
  })).optional()
});

type ChangelogEntry = z.infer<typeof ChangelogEntrySchema>;

interface Documentation {
  type: 'api' | 'guide' | 'migration' | 'release-notes';
  path: string;
  content: string;
}

class ChangelogAction {
  private readonly changelogPath: string;
  private readonly docsPath: string;
  private readonly outputPath: string;

  constructor() {
    const repoRoot = path.resolve(process.cwd());
    this.changelogPath = path.join(repoRoot, 'CHANGELOG.md');
    this.docsPath = path.join(repoRoot, 'documentation/src');
    this.outputPath = path.join(repoRoot, 'documentation/generated');
  }

  /**
   * Parse CHANGELOG.md file
   */
  async parseChangelog(): Promise<ChangelogEntry[]> {
    const content = await fs.readFile(this.changelogPath, 'utf-8');
    const entries: ChangelogEntry[] = [];
    
    // Parse markdown sections
    const sections = content.split(/^## \[/m).slice(1);
    
    for (const section of sections) {
      const lines = section.split('\n');
      const versionMatch = lines[0].match(/^([\d.]+)\] - (\d{4}-\d{2}-\d{2})/);
      
      if (!versionMatch) continue;
      
      const [, version, date] = versionMatch;
      const entry: ChangelogEntry = {
        version,
        date,
        changes: {},
        breaking: [],
        packages: []
      };

      let currentSection: keyof ChangelogEntry['changes'] | null = null;
      let inBreaking = false;
      let inPackages = false;

      for (const line of lines.slice(1)) {
        // Check for section headers
        if (line.startsWith('### Added')) {
          currentSection = 'added';
          inBreaking = false;
          inPackages = false;
        } else if (line.startsWith('### Changed')) {
          currentSection = 'changed';
          inBreaking = false;
          inPackages = false;
        } else if (line.startsWith('### Deprecated')) {
          currentSection = 'deprecated';
          inBreaking = false;
          inPackages = false;
        } else if (line.startsWith('### Removed')) {
          currentSection = 'removed';
          inBreaking = false;
          inPackages = false;
        } else if (line.startsWith('### Fixed')) {
          currentSection = 'fixed';
          inBreaking = false;
          inPackages = false;
        } else if (line.startsWith('### Security')) {
          currentSection = 'security';
          inBreaking = false;
          inPackages = false;
        } else if (line.startsWith('### Breaking Changes')) {
          currentSection = null;
          inBreaking = true;
          inPackages = false;
        } else if (line.startsWith('### Package Updates')) {
          currentSection = null;
          inBreaking = false;
          inPackages = true;
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          const content = line.substring(2).trim();
          
          if (currentSection && entry.changes) {
            if (!entry.changes[currentSection]) {
              entry.changes[currentSection] = [];
            }
            entry.changes[currentSection].push(content);
          } else if (inBreaking) {
            // Parse breaking change format
            const breakingMatch = content.match(/^(.+?):\s*(.+?)(?:\s*->\s*(.+))?$/);
            if (breakingMatch) {
              entry.breaking?.push({
                title: breakingMatch[1],
                description: breakingMatch[2],
                migration: breakingMatch[3] || ''
              });
            }
          } else if (inPackages) {
            // Parse package update format
            const packageMatch = content.match(/^`(@katalyst\/[\w-]+)`:\s*(.+)$/);
            if (packageMatch) {
              const existingPackage = entry.packages?.find(p => p.name === packageMatch[1]);
              if (existingPackage) {
                existingPackage.changes.push(packageMatch[2]);
              } else {
                entry.packages?.push({
                  name: packageMatch[1],
                  changes: [packageMatch[2]]
                });
              }
            }
          }
        }
      }

      entries.push(entry);
    }

    return entries;
  }

  /**
   * Generate documentation from changelog entries
   */
  async generateDocs(entries: ChangelogEntry[]): Promise<Documentation[]> {
    const docs: Documentation[] = [];

    for (const entry of entries) {
      // Generate release notes
      docs.push(await this.generateReleaseNotes(entry));

      // Generate migration guide if there are breaking changes
      if (entry.breaking && entry.breaking.length > 0) {
        docs.push(await this.generateMigrationGuide(entry));
      }

      // Generate package-specific documentation
      if (entry.packages && entry.packages.length > 0) {
        for (const pkg of entry.packages) {
          docs.push(await this.generatePackageDocs(pkg, entry.version));
        }
      }

      // Generate API updates
      docs.push(await this.generateAPIUpdates(entry));
    }

    return docs;
  }

  /**
   * Generate release notes documentation
   */
  private async generateReleaseNotes(entry: ChangelogEntry): Promise<Documentation> {
    let content = `# Release Notes - v${entry.version}\n\n`;
    content += `Released on ${entry.date}\n\n`;

    if (entry.changes.added && entry.changes.added.length > 0) {
      content += `## 🎉 New Features\n\n`;
      for (const item of entry.changes.added) {
        content += `- ${item}\n`;
      }
      content += '\n';
    }

    if (entry.changes.changed && entry.changes.changed.length > 0) {
      content += `## 🔄 Changes\n\n`;
      for (const item of entry.changes.changed) {
        content += `- ${item}\n`;
      }
      content += '\n';
    }

    if (entry.changes.fixed && entry.changes.fixed.length > 0) {
      content += `## 🐛 Bug Fixes\n\n`;
      for (const item of entry.changes.fixed) {
        content += `- ${item}\n`;
      }
      content += '\n';
    }

    if (entry.breaking && entry.breaking.length > 0) {
      content += `## ⚠️ Breaking Changes\n\n`;
      for (const breaking of entry.breaking) {
        content += `### ${breaking.title}\n\n`;
        content += `${breaking.description}\n\n`;
        if (breaking.migration) {
          content += `**Migration:** ${breaking.migration}\n\n`;
        }
      }
    }

    return {
      type: 'release-notes',
      path: `releases/v${entry.version}.md`,
      content
    };
  }

  /**
   * Generate migration guide for breaking changes
   */
  private async generateMigrationGuide(entry: ChangelogEntry): Promise<Documentation> {
    let content = `# Migration Guide - v${entry.version}\n\n`;
    content += `This guide helps you migrate from the previous version to v${entry.version}.\n\n`;

    content += `## Breaking Changes\n\n`;

    for (const breaking of entry.breaking || []) {
      content += `### ${breaking.title}\n\n`;
      content += `${breaking.description}\n\n`;
      
      content += `#### Before\n\n`;
      content += `\`\`\`typescript\n// Old implementation\n\`\`\`\n\n`;
      
      content += `#### After\n\n`;
      content += `\`\`\`typescript\n// New implementation\n${breaking.migration}\n\`\`\`\n\n`;
      
      content += `#### Migration Steps\n\n`;
      content += `1. Update your imports\n`;
      content += `2. Modify affected code\n`;
      content += `3. Run tests to verify\n\n`;
    }

    content += `## Automated Migration\n\n`;
    content += `You can use our migration tool to automatically update your code:\n\n`;
    content += `\`\`\`bash\nkatalyst migrate v${entry.version}\n\`\`\`\n\n`;

    return {
      type: 'migration',
      path: `migration/migrate-to-v${entry.version}.md`,
      content
    };
  }

  /**
   * Generate package-specific documentation
   */
  private async generatePackageDocs(pkg: { name: string; changes: string[] }, version: string): Promise<Documentation> {
    const packageName = pkg.name.replace('@katalyst/', '');
    let content = `# ${pkg.name} - v${version} Updates\n\n`;

    content += `## Changes\n\n`;
    for (const change of pkg.changes) {
      content += `- ${change}\n`;
    }
    content += '\n';

    // Extract API changes
    const apiChanges = pkg.changes.filter(c => 
      c.includes('API') || 
      c.includes('method') || 
      c.includes('function') ||
      c.includes('component') ||
      c.includes('hook')
    );

    if (apiChanges.length > 0) {
      content += `## API Updates\n\n`;
      for (const change of apiChanges) {
        // Parse API change and generate example
        content += `### ${change}\n\n`;
        content += `\`\`\`typescript\n// Example usage\n\`\`\`\n\n`;
      }
    }

    return {
      type: 'api',
      path: `packages/${packageName}-v${version}.md`,
      content
    };
  }

  /**
   * Generate API reference updates
   */
  private async generateAPIUpdates(entry: ChangelogEntry): Promise<Documentation> {
    let content = `# API Updates - v${entry.version}\n\n`;

    // Extract all API-related changes
    const apiChanges: string[] = [];
    
    for (const [type, changes] of Object.entries(entry.changes)) {
      if (changes) {
        for (const change of changes) {
          if (change.includes('API') || change.includes('method') || change.includes('function')) {
            apiChanges.push(`[${type}] ${change}`);
          }
        }
      }
    }

    if (apiChanges.length > 0) {
      content += `## API Changes\n\n`;
      for (const change of apiChanges) {
        content += `- ${change}\n`;
      }
      content += '\n';
    }

    // Generate TypeScript definitions
    content += `## TypeScript Definitions\n\n`;
    content += `\`\`\`typescript\n`;
    content += `// Updated type definitions for v${entry.version}\n`;
    content += `\`\`\`\n\n`;

    return {
      type: 'api',
      path: `api/updates-v${entry.version}.md`,
      content
    };
  }

  /**
   * Update package documentation files
   */
  async updatePackageDocs(docs: Documentation[]): Promise<void> {
    for (const doc of docs) {
      const fullPath = path.join(this.docsPath, doc.path);
      await fs.ensureDir(path.dirname(fullPath));
      
      // Check if file exists and merge content
      if (await fs.pathExists(fullPath)) {
        const existingContent = await fs.readFile(fullPath, 'utf-8');
        
        // Append new content with separator
        const updatedContent = existingContent + '\n\n---\n\n' + doc.content;
        await fs.writeFile(fullPath, updatedContent);
        
        console.log(chalk.yellow(`📝 Updated: ${doc.path}`));
      } else {
        await fs.writeFile(fullPath, doc.content);
        console.log(chalk.green(`✨ Created: ${doc.path}`));
      }
    }
  }

  /**
   * Create migration scripts
   */
  async createMigrationScripts(entries: ChangelogEntry[]): Promise<void> {
    for (const entry of entries) {
      if (!entry.breaking || entry.breaking.length === 0) continue;

      const scriptPath = path.join(
        process.cwd(),
        'scripts',
        'migrations',
        `migrate-to-v${entry.version}.ts`
      );

      const scriptContent = `#!/usr/bin/env node

/**
 * Migration script for v${entry.version}
 * 
 * Breaking changes:
${entry.breaking.map(b => ` * - ${b.title}`).join('\n')}
 */

import { transform } from 'jscodeshift';
import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';

export async function migrate(projectPath: string) {
  console.log('Starting migration to v${entry.version}...');

  // Find all TypeScript/JavaScript files
  const files = glob.sync(path.join(projectPath, '**/*.{ts,tsx,js,jsx}'), {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
  });

  for (const file of files) {
    const source = await fs.readFile(file, 'utf-8');
    let modified = source;

    // Apply transformations for each breaking change
${entry.breaking.map((b, i) => `
    // Breaking change ${i + 1}: ${b.title}
    modified = transform${i}(modified);`).join('\n')}

    if (modified !== source) {
      await fs.writeFile(file, modified);
      console.log('✅ Migrated:', file);
    }
  }

  console.log('Migration complete!');
}

${entry.breaking.map((b, i) => `
function transform${i}(source: string): string {
  // TODO: Implement transformation for: ${b.title}
  // ${b.description}
  // Migration: ${b.migration}
  return source;
}`).join('\n')}

// Run migration if called directly
if (require.main === module) {
  const projectPath = process.argv[2] || process.cwd();
  migrate(projectPath).catch(console.error);
}
`;

      await fs.ensureDir(path.dirname(scriptPath));
      await fs.writeFile(scriptPath, scriptContent);
      await fs.chmod(scriptPath, '755');
      
      console.log(chalk.blue(`🔧 Created migration script: ${scriptPath}`));
    }
  }

  /**
   * Update API reference files
   */
  async updateAPIReference(entries: ChangelogEntry[]): Promise<void> {
    const apiRefPath = path.join(this.docsPath, 'api', 'reference.json');
    
    // Load existing API reference or create new one
    let apiRef: any = {};
    if (await fs.pathExists(apiRefPath)) {
      apiRef = await fs.readJson(apiRefPath);
    }

    for (const entry of entries) {
      // Update version
      apiRef.version = entry.version;
      apiRef.lastUpdated = entry.date;

      // Process package updates
      if (entry.packages) {
        for (const pkg of entry.packages) {
          if (!apiRef.packages) apiRef.packages = {};
          if (!apiRef.packages[pkg.name]) {
            apiRef.packages[pkg.name] = {
              version: entry.version,
              changes: []
            };
          }
          
          apiRef.packages[pkg.name].version = entry.version;
          apiRef.packages[pkg.name].changes.push({
            version: entry.version,
            date: entry.date,
            changes: pkg.changes
          });
        }
      }
    }

    await fs.writeJson(apiRefPath, apiRef, { spaces: 2 });
    console.log(chalk.magenta(`📚 Updated API reference: ${apiRefPath}`));
  }

  /**
   * Main execution
   */
  async run(): Promise<void> {
    console.log(chalk.cyan.bold('\n🚀 Katalyst CHANGELOG Action System\n'));

    try {
      // Parse CHANGELOG
      console.log('📖 Parsing CHANGELOG.md...');
      const entries = await this.parseChangelog();
      console.log(chalk.green(`✅ Found ${entries.length} changelog entries\n`));

      // Generate documentation
      console.log('📝 Generating documentation...');
      const docs = await this.generateDocs(entries);
      console.log(chalk.green(`✅ Generated ${docs.length} documentation files\n`));

      // Update package docs
      console.log('📦 Updating package documentation...');
      await this.updatePackageDocs(docs);

      // Create migration scripts
      console.log('🔧 Creating migration scripts...');
      await this.createMigrationScripts(entries);

      // Update API reference
      console.log('📚 Updating API reference...');
      await this.updateAPIReference(entries);

      console.log(chalk.green.bold('\n✨ Documentation generation complete!\n'));

      // Summary
      console.log('Summary:');
      console.log(`- Processed ${entries.length} versions`);
      console.log(`- Generated ${docs.length} documentation files`);
      console.log(`- Created ${entries.filter(e => e.breaking && e.breaking.length > 0).length} migration guides`);
      
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const action = new ChangelogAction();
  action.run().catch(console.error);
}

export { ChangelogAction, ChangelogEntry, Documentation };