#!/bin/bash

# 21st.dev Magic API Key Setup Script
# This script helps you configure your Magic API key for Claude Code

echo "🪄 21st.dev Magic API Key Setup"
echo "================================"
echo ""

# Check if MCP config exists
MCP_CONFIG="$HOME/.claude/claude.mcp.json"
if [ ! -f "$MCP_CONFIG" ]; then
    echo "❌ Claude MCP configuration file not found at: $MCP_CONFIG"
    echo "Please ensure Claude Code is installed and configured."
    exit 1
fi

echo "✅ Found Claude MCP configuration"
echo ""

# Check current API key status
if grep -q "YOUR_API_KEY_HERE" "$MCP_CONFIG"; then
    echo "⚠️  API key placeholder detected - setup required"
else
    echo "✅ API key appears to be configured"
    echo ""
    read -p "Do you want to update your existing API key? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

echo ""
echo "📝 To get your API key:"
echo "1. Visit: https://21st.dev/magic/console"
echo "2. Sign up for a free account (includes 10 credits)"
echo "3. Generate your API key from the console"
echo "4. Copy the API key"
echo ""

read -p "Enter your 21st.dev Magic API key: " -r API_KEY

if [ -z "$API_KEY" ]; then
    echo "❌ No API key provided. Setup cancelled."
    exit 1
fi

if [ "$API_KEY" = "YOUR_API_KEY_HERE" ]; then
    echo "❌ Please enter your actual API key, not the placeholder."
    exit 1
fi

# Create backup
cp "$MCP_CONFIG" "$MCP_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
echo "📄 Created backup: $MCP_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"

# Update the API key
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/YOUR_API_KEY_HERE/$API_KEY/g" "$MCP_CONFIG"
else
    # Linux
    sed -i "s/YOUR_API_KEY_HERE/$API_KEY/g" "$MCP_CONFIG"
fi

echo "✅ API key configured successfully!"
echo ""
echo "🚀 Next Steps:"
echo "1. Restart Claude Code to activate the Magic MCP server"
echo "2. Test with a simple prompt like: 'Create a beautiful login form'"
echo "3. Check the usage examples in magic-usage-examples.md"
echo ""
echo "💡 Example prompts to try:"
echo '   "Create a modern dashboard with charts and widgets"'
echo '   "Build a responsive pricing page with three tiers"'
echo '   "Generate a contact form with validation"'
echo ""
echo "Happy coding with Magic! 🪄✨"