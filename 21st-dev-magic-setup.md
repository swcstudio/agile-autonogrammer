# 21st.dev Magic MCP Server Setup Guide

## Overview
The 21st.dev Magic MCP server enables AI-powered frontend development directly in Claude Code. It's like v0 but integrated into your development workflow, allowing you to create beautiful UI components through natural language descriptions.

## Features
- 🎨 **AI-Powered UI Generation**: Create components by describing them in natural language
- 📚 **Modern Component Library**: Access to pre-built, customizable components
- ⚡ **Real-time Preview**: Instantly see components as you create them
- 🔷 **TypeScript Support**: Full type-safe development
- 🎯 **SVGL Integration**: Access to professional brand assets and logos

## Setup Instructions

### 1. Install the Magic MCP Server

```bash
# Install globally
npm install -g @21st-dev/magic

# Verify installation
which magic
# Should output: /path/to/nodejs/bin/magic
```

### 2. Get Your API Key

1. Visit [21st.dev Magic Console](https://21st.dev/magic/console)
2. Sign up for a free account (includes 10 credits)
3. Generate your API key from the console
4. Copy the API key for configuration

### 3. Configure Claude Code MCP

The Magic MCP server has been added to your Claude Code configuration:

**File**: `~/.claude/claude.mcp.json`

```json
{
  "mcpServers": {
    "@21st-dev/magic": {
      "command": "/home/ubuntu/.asdf/installs/nodejs/22.11.0/bin/magic",
      "args": [],
      "env": {
        "API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

**⚠️ Important**: Replace `YOUR_API_KEY_HERE` with your actual API key from step 2.

### 4. Update API Key

```bash
# Edit the Claude MCP configuration
nano ~/.claude/claude.mcp.json

# Replace YOUR_API_KEY_HERE with your actual API key
```

### 5. Restart Claude Code

After updating the API key, restart Claude Code to activate the Magic MCP server.

## Usage Examples

Once configured, you can use Magic in Claude Code with commands like:

```
Create a modern login form component with:
- Email and password fields
- Remember me checkbox
- Forgot password link
- Social login buttons for Google and GitHub
- Dark mode support
- Responsive design
```

```
Generate a dashboard header with:
- Logo on the left
- Navigation menu in the center
- User profile dropdown on the right
- Search functionality
- Notification bell icon
```

```
Build a pricing cards section with:
- Three tiers (Basic, Pro, Enterprise)
- Feature comparison table
- "Most Popular" badge on middle tier
- Annual/monthly toggle
- Call-to-action buttons
```

## Pricing Plans

- **Free**: $0/month, 10 credits
- **Pro**: $16/month, 100 credits
- **Pro Plus**: $32/month, 200 credits  
- **Scale**: $67/month, 500 credits

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Ensure you've copied the complete API key
   - Verify the key is active in the 21st.dev console
   - Check for extra spaces or characters

2. **MCP Server Not Starting**
   - Verify the magic command path: `which magic`
   - Update the command path in the configuration if different
   - Check logs for error messages

3. **Certificate Issues**
   - If you encounter SSL/certificate errors with npm:
   ```bash
   npm config set strict-ssl false
   ```

### Verification

Test the MCP server is working:

```bash
# This should show JSON-RPC messages
magic --help
```

Expected output includes messages like:
```
{"jsonrpc":"2.0","method":"window/logMessage","params":{"type":3,"message":"Starting server v0.0.46"}}
```

## Advanced Configuration

### Environment Variables
You can also set the API key as an environment variable:

```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export MAGIC_API_KEY="your-api-key-here"
```

Then update the MCP configuration:
```json
{
  "@21st-dev/magic": {
    "command": "/home/ubuntu/.asdf/installs/nodejs/22.11.0/bin/magic",
    "args": [],
    "env": {
      "API_KEY": "${MAGIC_API_KEY}"
    }
  }
}
```

### Project-Specific Configuration
For project-specific setups, you can also add a `.vscode/mcp.json` file to your project:

```json
{
  "mcp": {
    "servers": {
      "@21st-dev/magic": {
        "command": "npx",
        "args": ["-y", "@21st-dev/magic@latest"],
        "env": {
          "API_KEY": "your-project-specific-api-key"
        }
      }
    }
  }
}
```

## Support

- 📖 [Documentation](https://21st.dev/magic)
- 💬 [Discord Community](https://21st.dev/discord)
- 🐛 [GitHub Issues](https://github.com/21st-dev/magic-mcp/issues)

## Next Steps

1. Get your API key from [21st.dev Magic Console](https://21st.dev/magic/console)
2. Update the configuration file with your real API key
3. Restart Claude Code
4. Start creating beautiful UI components with natural language!

---

**Status**: ✅ Magic MCP Server installed and configured  
**Next**: Add your API key and start creating components!