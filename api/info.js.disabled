export default function handler(req, res) {
  const packageInfo = {
    name: "agile-programmers",
    version: "2.0.0",
    description: "AI-powered terminal assistant that understands your codebase, edits files, runs commands, and automates development workflows.",
    homepage: "https://github.com/swcstudio/agile-programmers",
    repository: {
      type: "git",
      url: "git+https://github.com/shareAI-lab/kode.git"
    },
    author: "swcstudio <ove@spectrumwebco.com.au>",
    license: "Apache-2.0",
    features: [
      "AI-powered code analysis and generation",
      "Multi-model AI support (Claude, GPT-4, etc.)",
      "Interactive terminal interface",
      "Advanced tool system with permissions",
      "WASM module integration",
      "Enterprise-ready deployment",
      "Security-first architecture"
    ],
    installation: {
      npm: "npm install -g agile-programmers",
      pnpm: "pnpm install -g agile-programmers",
      npx: "npx agile-programmers"
    },
    quickStart: [
      "agile --help     # View available commands",
      "agile            # Start interactive mode",
      "agile build      # Run build commands",
      "agile test       # Run test suite"
    ],
    status: "active",
    lastUpdated: new Date().toISOString()
  };

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.status(200).json(packageInfo);
}