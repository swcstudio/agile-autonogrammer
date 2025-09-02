/**
 * Claude Code Max Authentication
 * Handles Google Sign-In authentication for Claude Code Max plan
 */

import { OAuth2Client } from 'google-auth-library';
import { EventEmitter } from 'events';
import open from 'open';
import http from 'http';
import url from 'url';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface ClaudeAuthConfig {
  clientId?: string;
  redirectUri?: string;
  port?: number;
  cachePath?: string;
}

export interface ClaudeAuthToken {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiryDate?: number;
  userEmail?: string;
  userName?: string;
}

export class ClaudeCodeAuth extends EventEmitter {
  private oauth2Client: OAuth2Client;
  private server?: http.Server;
  private config: ClaudeAuthConfig;
  private authToken?: ClaudeAuthToken;
  private cachePath: string;

  constructor(config: ClaudeAuthConfig = {}) {
    super();
    
    this.config = {
      clientId: config.clientId || process.env.CLAUDE_GOOGLE_CLIENT_ID || 
                '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com', // Claude's OAuth client ID
      redirectUri: config.redirectUri || `http://localhost:${config.port || 3000}/callback`,
      port: config.port || 3000,
      cachePath: config.cachePath || path.join(os.homedir(), '.katalyst', 'claude-auth.json')
    };

    this.cachePath = this.config.cachePath!;

    this.oauth2Client = new OAuth2Client(
      this.config.clientId,
      process.env.CLAUDE_GOOGLE_CLIENT_SECRET, // If needed
      this.config.redirectUri
    );
  }

  /**
   * Authenticate with Google Sign-In
   */
  async authenticate(): Promise<ClaudeAuthToken> {
    // Check for cached token first
    const cachedToken = await this.loadCachedToken();
    if (cachedToken && this.isTokenValid(cachedToken)) {
      this.authToken = cachedToken;
      this.emit('authenticated', cachedToken);
      return cachedToken;
    }

    // Generate auth URL
    const authUrl = this.generateAuthUrl();
    
    // Start local server to handle callback
    await this.startCallbackServer();

    // Open browser for authentication
    console.log('Opening browser for Google Sign-In...');
    await open(authUrl);

    // Wait for authentication
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stopCallbackServer();
        reject(new Error('Authentication timeout'));
      }, 120000); // 2 minute timeout

      this.once('auth:success', async (token: ClaudeAuthToken) => {
        clearTimeout(timeout);
        this.authToken = token;
        await this.cacheToken(token);
        this.stopCallbackServer();
        resolve(token);
      });

      this.once('auth:error', (error) => {
        clearTimeout(timeout);
        this.stopCallbackServer();
        reject(error);
      });
    });
  }

  /**
   * Generate Google OAuth URL
   */
  private generateAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid'
    ];

    const state = crypto.randomBytes(32).toString('hex');
    this.emit('state:generated', state);

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state,
      prompt: 'select_account'
    });
  }

  /**
   * Start callback server
   */
  private async startCallbackServer(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url!, true);
        
        if (parsedUrl.pathname === '/callback') {
          await this.handleCallback(parsedUrl.query, res);
        } else if (parsedUrl.pathname === '/success') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(this.getSuccessHTML());
        } else if (parsedUrl.pathname === '/error') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(this.getErrorHTML());
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      this.server.listen(this.config.port, () => {
        this.emit('server:started', this.config.port);
        resolve();
      });
    });
  }

  /**
   * Handle OAuth callback
   */
  private async handleCallback(query: any, res: http.ServerResponse): Promise<void> {
    try {
      const { code, state, error } = query;

      if (error) {
        this.emit('auth:error', new Error(error));
        res.writeHead(302, { Location: '/error' });
        res.end();
        return;
      }

      if (!code) {
        this.emit('auth:error', new Error('No authorization code received'));
        res.writeHead(302, { Location: '/error' });
        res.end();
        return;
      }

      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Get user info
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: this.config.clientId!
      });

      const payload = ticket.getPayload();
      
      const authToken: ClaudeAuthToken = {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        idToken: tokens.id_token,
        expiryDate: tokens.expiry_date,
        userEmail: payload?.email,
        userName: payload?.name
      };

      this.emit('auth:success', authToken);
      
      res.writeHead(302, { Location: '/success' });
      res.end();
    } catch (error) {
      this.emit('auth:error', error);
      res.writeHead(302, { Location: '/error' });
      res.end();
    }
  }

  /**
   * Stop callback server
   */
  private stopCallbackServer(): void {
    if (this.server) {
      this.server.close();
      this.server = undefined;
      this.emit('server:stopped');
    }
  }

  /**
   * Cache token to disk
   */
  private async cacheToken(token: ClaudeAuthToken): Promise<void> {
    try {
      const dir = path.dirname(this.cachePath);
      await fs.mkdir(dir, { recursive: true });
      
      const encrypted = this.encryptToken(token);
      await fs.writeFile(this.cachePath, JSON.stringify(encrypted));
      
      this.emit('token:cached');
    } catch (error) {
      this.emit('cache:error', error);
    }
  }

  /**
   * Load cached token
   */
  private async loadCachedToken(): Promise<ClaudeAuthToken | null> {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      const encrypted = JSON.parse(data);
      const token = this.decryptToken(encrypted);
      
      this.emit('token:loaded');
      return token;
    } catch (error) {
      return null;
    }
  }

  /**
   * Encrypt token for storage
   */
  private encryptToken(token: ClaudeAuthToken): any {
    const key = crypto.scryptSync(os.hostname(), 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(JSON.stringify(token), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      data: encrypted,
      iv: iv.toString('hex')
    };
  }

  /**
   * Decrypt token from storage
   */
  private decryptToken(encrypted: any): ClaudeAuthToken {
    const key = crypto.scryptSync(os.hostname(), 'salt', 32);
    const iv = Buffer.from(encrypted.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Check if token is valid
   */
  private isTokenValid(token: ClaudeAuthToken): boolean {
    if (!token.accessToken) return false;
    if (!token.expiryDate) return true;
    
    return token.expiryDate > Date.now();
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<ClaudeAuthToken> {
    if (!this.authToken?.refreshToken) {
      throw new Error('No refresh token available');
    }

    this.oauth2Client.setCredentials({
      refresh_token: this.authToken.refreshToken
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    
    this.authToken = {
      ...this.authToken,
      accessToken: credentials.access_token!,
      expiryDate: credentials.expiry_date
    };

    await this.cacheToken(this.authToken);
    this.emit('token:refreshed', this.authToken);
    
    return this.authToken;
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await fs.unlink(this.cachePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
    
    this.authToken = undefined;
    this.oauth2Client.revokeCredentials();
    this.emit('signed:out');
  }

  /**
   * Get current auth token
   */
  getToken(): ClaudeAuthToken | undefined {
    return this.authToken;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.authToken && this.isTokenValid(this.authToken);
  }

  /**
   * Get success HTML page
   */
  private getSuccessHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
          }
          h1 {
            color: #333;
            margin-bottom: 20px;
          }
          p {
            color: #666;
            margin-bottom: 20px;
          }
          .success-icon {
            font-size: 60px;
            color: #4CAF50;
            margin-bottom: 20px;
          }
          .close-note {
            font-size: 14px;
            color: #999;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>Authentication Successful!</h1>
          <p>You have successfully authenticated with Claude Code Max.</p>
          <p class="close-note">You can close this window and return to your application.</p>
          <script>
            setTimeout(() => window.close(), 3000);
          </script>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get error HTML page
   */
  private getErrorHTML(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Failed</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
          }
          h1 {
            color: #333;
            margin-bottom: 20px;
          }
          p {
            color: #666;
            margin-bottom: 20px;
          }
          .error-icon {
            font-size: 60px;
            color: #f44336;
            margin-bottom: 20px;
          }
          .close-note {
            font-size: 14px;
            color: #999;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon">✗</div>
          <h1>Authentication Failed</h1>
          <p>There was an error authenticating with Google.</p>
          <p>Please try again or check your credentials.</p>
          <p class="close-note">You can close this window and try again.</p>
        </div>
      </body>
      </html>
    `;
  }
}