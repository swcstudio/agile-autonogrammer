# Vercel Deployment Guide - Agile Programmers

## Problem Analysis

The original deployment failed with `ERR_INVALID_THIS` errors when pnpm tried to fetch package metadata from the npm registry. This error typically indicates:

1. **Network connectivity issues** between Vercel's build servers and npm registry
2. **pnpm version compatibility** with Node.js version in build environment
3. **URLSearchParams binding issues** in the Node.js runtime

## Applied Fixes

### 1. Enhanced .npmrc Configuration
```ini
# Registry configuration
registry=https://registry.npmjs.org/

# Network timeout settings
fetch-timeout=60000
fetch-retry-mintimeout=10000
fetch-retry-maxtimeout=60000

# Strict SSL and security
strict-ssl=true

# Resolution strategy
resolution-strategy=highest

# Shamefully hoist for compatibility
shamefully-hoist=true

# Node linker for better compatibility
node-linker=isolated
```

### 2. Vercel Build Configuration (vercel.json)
- **Fallback build strategy**: Uses `build-fallback.js` to try multiple package managers
- **Environment variables**: Set proper Node.js version and npm registry settings
- **Timeout configurations**: Extended timeouts for network operations

### 3. Multi-Strategy Build Script (build-fallback.js)
The build script tries multiple strategies in order:
1. **pnpm** with enhanced network configuration
2. **npm** with legacy peer deps
3. **yarn** as secondary fallback
4. **bun** if available locally

### 4. Security Audit
Created `SECURITY_AUDIT.md` documenting:
- High-risk AI/ML dependencies
- API key management recommendations
- Data privacy considerations
- Continuous security monitoring setup

## Deployment Steps

### Option 1: Use New Configuration (Recommended)
1. **Commit the new files**:
   ```bash
   git add .npmrc vercel.json build-fallback.js SECURITY_AUDIT.md VERCEL_DEPLOYMENT_GUIDE.md
   git commit -m "fix: Add robust Vercel deployment configuration with fallback strategies"
   git push
   ```

2. **Redeploy on Vercel**:
   - The new configuration should automatically resolve the registry issues
   - Build will try multiple package managers if pnpm fails

### Option 2: Force npm Installation (Alternative)
If pnpm issues persist, modify `vercel.json`:
```json
{
  "buildCommand": "npm install --legacy-peer-deps && npm run build",
  "installCommand": "echo 'Using npm instead of pnpm'"
}
```

### Option 3: Use Bun Runtime (Experimental)
For potentially faster builds:
```json
{
  "buildCommand": "bun install && bun run build",
  "installCommand": "curl -fsSL https://bun.sh/install | bash"
}
```

## Environment Variables to Set

In your Vercel dashboard, add these environment variables:

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_VERSION` | `18.17.0` | Ensure consistent Node.js version |
| `NPM_CONFIG_REGISTRY` | `https://registry.npmjs.org/` | Force npm registry |
| `NPM_CONFIG_FETCH_TIMEOUT` | `60000` | Network timeout |
| `PNPM_VERSION` | `10.14.0` | Pin pnpm version |

## Security Considerations

### API Keys and Secrets
Ensure these are properly set in Vercel environment variables:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY` 
- Any other AI service credentials

### Dependency Security
- Regular audit: `npm audit --audit-level=moderate`
- Monitor for security advisories on AI/ML packages
- Consider using `npm ci` in production for exact dependency matching

## Monitoring and Debugging

### Build Logs
- Check Vercel build logs for specific error messages
- Look for network timeout issues or registry connectivity problems

### Runtime Monitoring
- Monitor API usage and rate limits for AI services
- Set up alerts for unusual AI API consumption patterns
- Track deployment success/failure rates

## Troubleshooting

### If Build Still Fails

1. **Check Network Issues**:
   ```bash
   # Test registry connectivity
   curl -I https://registry.npmjs.org/
   ```

2. **Try Manual Build Locally**:
   ```bash
   node build-fallback.js
   ```

3. **Use Vercel CLI for Local Testing**:
   ```bash
   vercel build
   ```

4. **Check Vercel Function Logs**:
   - Use Vercel dashboard to inspect runtime logs
   - Look for AI API errors or timeout issues

### Common Issues

| Issue | Solution |
|-------|----------|
| Registry timeout | Increase fetch timeout in .npmrc |
| pnpm version mismatch | Pin pnpm version in package.json engines |
| AI API failures | Check environment variables and API quotas |
| Build memory issues | Reduce concurrent builds or upgrade Vercel plan |

## Next Steps

1. **Deploy and test** with the new configuration
2. **Set up monitoring** for build and runtime performance
3. **Review AI API usage** patterns after successful deployment
4. **Implement continuous security audits** for dependencies

---

*Last updated: $(date)*
*Security audit required: Every 30 days*