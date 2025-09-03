# Agile Programmers

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)

AI-powered terminal assistant that understands your codebase, edits files, runs commands, and automates development workflows.

## 🚀 Features

- **🧠 AI-Powered Intelligence**: Advanced AI agents with multi-modal capabilities
- **⚡ Lightning Fast**: Built with Bun and modern technologies for maximum performance
- **🔧 Developer Tools**: Comprehensive suite of development tools and automation
- **🌐 Multi-Model Support**: Claude, GPT-4, and other leading AI models
- **🚀 Enterprise Ready**: Production-ready with security audits and monitoring
- **🔒 Security First**: Built-in permission systems and security features

## 📦 Installation

### Global Installation
```bash
# Using npm
npm install -g agile-programmers

# Using pnpm
pnpm install -g agile-programmers

# Using yarn
yarn global add agile-programmers
```

### Quick Start with npx
```bash
npx agile-programmers
```

## 🎯 Usage

### Interactive Mode
```bash
# Start the interactive terminal assistant
agile

# Or with verbose output
agile --verbose
```

### Command Mode
```bash
# View available commands
agile --help

# Run specific tasks
agile build
agile test
agile deploy
```

## 🏗️ Development

This project uses a monorepo structure with Turbo for build orchestration and pnpm for package management.

### Prerequisites
- Node.js 18+
- pnpm 10.14.0
- Bun (recommended for development)

### Setup
```bash
# Clone the repository
git clone https://github.com/swcstudio/agile-programmers.git
cd agile-programmers

# Install dependencies
pnpm install

# Start development mode
pnpm run dev

# Build all packages
pnpm run build
```

### Project Structure
```
agile-programmers/
├── apps/                    # Application entry points
├── packages/               # Shared packages
│   ├── @agile/            # Core agile packages
│   │   ├── ai-agents/     # AI agent system
│   │   ├── ai-core/       # Core AI functionality
│   │   ├── core/          # Framework core
│   │   ├── types/         # TypeScript definitions
│   │   └── utils/         # Utility functions
│   ├── api/               # API layer
│   └── hooks/             # React hooks
├── src/                   # Main application source
├── scripts/              # Build and deployment scripts
└── wasm-modules/         # WebAssembly modules
```

## 🧪 Testing

```bash
# Run all tests
pnpm run test

# Run specific test suites
pnpm run test:ai
pnpm run test:wasm
pnpm run test:security

# Run with coverage
pnpm run test:coverage
```

## 📊 Benchmarking

```bash
# Run AI benchmarks
pnpm run bench:ai

# Run WASM benchmarks
pnpm run bench:wasm
```

## 🚀 Deployment

This project includes Vercel configuration for easy deployment:

1. **GitHub Integration**: Connect your GitHub repository to Vercel
2. **Auto-Deploy**: Pushes to main branch automatically deploy
3. **Environment Variables**: Set up required API keys in Vercel dashboard

### Required Environment Variables
```bash
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key
GOOGLE_AI_API_KEY=your_gemini_api_key  # Optional
HUGGINGFACE_API_KEY=your_hf_api_key    # Optional
```

## 🔧 Configuration

The project supports multiple configuration methods:

- **Global config**: `~/.agile.json`
- **Project config**: `./.agile.json`
- **Environment variables**
- **CLI parameters**

### Example Configuration
```json
{
  "defaultModel": "claude-3-sonnet",
  "models": {
    "claude-3-sonnet": {
      "provider": "anthropic",
      "apiKey": "${ANTHROPIC_API_KEY}"
    },
    "gpt-4": {
      "provider": "openai",
      "apiKey": "${OPENAI_API_KEY}"
    }
  },
  "permissions": {
    "allowFileWrite": true,
    "allowCommandExecution": true,
    "allowNetworkAccess": false
  }
}
```

## 🏛️ Architecture

### Multi-Model AI System
- **Dynamic Model Switching**: Runtime model changes without session restart
- **Load Balancing**: Intelligent request distribution across models
- **Fallback Chains**: Automatic failover to backup models

### Agent System
- **Specialized Agents**: Task-specific AI agents with focused capabilities
- **Collaboration**: Inter-agent communication and task delegation
- **Learning**: Experience-based improvement and adaptation

### Tool Integration
- **MCP Protocol**: Model Context Protocol for extensible tools
- **Permission System**: Granular control over tool access
- **Security**: Built-in sandboxing and validation

## 🔒 Security

Security is a top priority. The system includes:

- **Permission Management**: Granular tool and resource access control
- **Input Validation**: Comprehensive validation of all inputs
- **Secure Execution**: Sandboxed command and file operations
- **Audit Logging**: Complete audit trail of all actions
- **Security Scanning**: Automated security vulnerability scanning

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Style
- Follow TypeScript best practices
- Use Prettier for formatting
- Write comprehensive tests
- Document public APIs

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Claude Code](https://claude.ai/code)
- Powered by [Anthropic's Claude](https://www.anthropic.com/)
- UI framework by [Ink](https://github.com/vadimdemedes/ink)
- Build system by [Turbo](https://turbo.build/)

## 📚 Documentation

- [API Documentation](docs/api.md)
- [Agent Development Guide](docs/agents.md)
- [Deployment Guide](VERCEL_DEPLOYMENT_GUIDE.md)
- [Security Audit](SECURITY_AUDIT.md)

## 🔗 Links

- [GitHub Repository](https://github.com/swcstudio/agile-programmers)
- [Documentation Website](https://agile-programmers.vercel.app)
- [Issue Tracker](https://github.com/swcstudio/agile-programmers/issues)
- [Discussions](https://github.com/swcstudio/agile-programmers/discussions)

---

Built with ❤️ by the Agile Programmers team