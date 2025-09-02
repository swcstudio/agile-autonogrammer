/**
 * Install Prompt Manager
 * Intelligently manages PWA and native app installation prompts
 */

import type { PWAConfig, PlatformInfo, NativeAppInfo } from '../types';
import { React } from '@katalyst/hooks';

export class InstallPromptManager {
  private config: PWAConfig;
  private promptContainer: HTMLElement | null = null;
  private isPromptShowing = false;
  
  constructor(config: PWAConfig) {
    this.config = config;
  }

  /**
   * Show native app suggestion prompt
   */
  showNativeAppPrompt(
    nativeApp: NativeAppInfo, 
    platform: PlatformInfo,
    onInstallPWA: () => void,
    onInstallNative: () => void
  ): void {
    if (this.isPromptShowing) return;
    
    this.isPromptShowing = true;
    this.createPromptContainer();
    
    const prompt = this.createNativePrompt(
      nativeApp,
      platform,
      onInstallPWA,
      onInstallNative
    );
    
    this.promptContainer!.innerHTML = prompt;
    this.attachPromptHandlers(onInstallPWA, onInstallNative);
    
    // Animate in
    requestAnimationFrame(() => {
      this.promptContainer!.classList.add('katalyst-prompt-visible');
    });
  }

  /**
   * Show PWA install prompt
   */
  showPWAPrompt(
    platform: PlatformInfo,
    instructions: string[],
    onInstall: () => void,
    onDismiss: () => void
  ): void {
    if (this.isPromptShowing) return;
    
    this.isPromptShowing = true;
    this.createPromptContainer();
    
    const prompt = this.createPWAPrompt(platform, instructions, onInstall);
    
    this.promptContainer!.innerHTML = prompt;
    this.attachPWAHandlers(onInstall, onDismiss);
    
    // Animate in
    requestAnimationFrame(() => {
      this.promptContainer!.classList.add('katalyst-prompt-visible');
    });
  }

  /**
   * Create prompt container
   */
  private createPromptContainer(): void {
    if (this.promptContainer) return;
    
    this.promptContainer = document.createElement('div');
    this.promptContainer.id = 'katalyst-install-prompt';
    this.promptContainer.className = 'katalyst-prompt-container';
    
    // Add styles
    const styles = `
      <style>
        .katalyst-prompt-container {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 999999;
          transform: translateY(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }
        
        .katalyst-prompt-container.katalyst-prompt-visible {
          transform: translateY(0);
        }
        
        .katalyst-prompt-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.2);
          border-radius: 24px 24px 0 0;
          max-width: 600px;
          margin: 0 auto;
          position: relative;
        }
        
        @media (min-width: 768px) {
          .katalyst-prompt-card {
            margin: 16px auto;
            border-radius: 24px;
          }
        }
        
        .katalyst-prompt-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        
        .katalyst-prompt-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        .katalyst-prompt-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }
        
        .katalyst-prompt-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: white;
          padding: 8px;
          flex-shrink: 0;
        }
        
        .katalyst-prompt-icon img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .katalyst-prompt-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
          line-height: 1.3;
        }
        
        .katalyst-prompt-subtitle {
          font-size: 14px;
          opacity: 0.9;
          margin: 4px 0 0 0;
        }
        
        .katalyst-prompt-description {
          font-size: 16px;
          line-height: 1.5;
          margin-bottom: 20px;
          opacity: 0.95;
        }
        
        .katalyst-prompt-features {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .katalyst-prompt-feature {
          background: rgba(255, 255, 255, 0.2);
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 14px;
        }
        
        .katalyst-prompt-actions {
          display: flex;
          gap: 12px;
          flex-direction: column;
        }
        
        @media (min-width: 480px) {
          .katalyst-prompt-actions {
            flex-direction: row;
          }
        }
        
        .katalyst-prompt-button {
          flex: 1;
          padding: 14px 24px;
          border-radius: 12px;
          border: none;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        
        .katalyst-prompt-button-primary {
          background: white;
          color: #667eea;
        }
        
        .katalyst-prompt-button-primary:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .katalyst-prompt-button-secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          backdrop-filter: blur(10px);
        }
        
        .katalyst-prompt-button-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        .katalyst-prompt-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 20px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }
        
        .katalyst-prompt-option {
          text-align: center;
        }
        
        .katalyst-prompt-option-title {
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 16px;
        }
        
        .katalyst-prompt-option-features {
          font-size: 14px;
          opacity: 0.9;
          line-height: 1.4;
        }
        
        .katalyst-prompt-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.25);
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 8px;
        }
        
        .katalyst-prompt-instructions {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }
        
        .katalyst-prompt-instructions-title {
          font-weight: 600;
          margin-bottom: 12px;
        }
        
        .katalyst-prompt-instructions-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .katalyst-prompt-instructions-item {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
          opacity: 0.95;
        }
        
        .katalyst-prompt-instructions-number {
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .katalyst-prompt-pulse {
          animation: pulse 2s infinite;
        }
      </style>
    `;
    
    this.promptContainer.innerHTML = styles;
    document.body.appendChild(this.promptContainer);
  }

  /**
   * Create native app suggestion prompt
   */
  private createNativePrompt(
    nativeApp: NativeAppInfo,
    platform: PlatformInfo,
    onInstallPWA: () => void,
    onInstallNative: () => void
  ): string {
    const icon = this.config.icons[0]?.src || '/icon-192.png';
    const rating = nativeApp.rating ? `⭐ ${nativeApp.rating.toFixed(1)}` : '';
    const size = nativeApp.size ? `${(nativeApp.size / 1048576).toFixed(1)} MB` : '';
    
    const features = nativeApp.features.slice(0, 3).map(f => 
      `<span class="katalyst-prompt-feature">${this.formatFeature(f)}</span>`
    ).join('');
    
    return `
      <div class="katalyst-prompt-card">
        <button class="katalyst-prompt-close" id="katalyst-prompt-close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
          </svg>
        </button>
        
        <div class="katalyst-prompt-header">
          <div class="katalyst-prompt-icon">
            <img src="${icon}" alt="${this.config.name}">
          </div>
          <div>
            <h3 class="katalyst-prompt-title">
              ${this.config.name}
              <span class="katalyst-prompt-badge">RECOMMENDED</span>
            </h3>
            <p class="katalyst-prompt-subtitle">
              Enhanced experience available
            </p>
          </div>
        </div>
        
        <div class="katalyst-prompt-description">
          Get the best ${this.config.name} experience with our native ${platform.device} app
        </div>
        
        <div class="katalyst-prompt-comparison">
          <div class="katalyst-prompt-option">
            <div class="katalyst-prompt-option-title">Native App</div>
            <div class="katalyst-prompt-option-features">
              ✓ ${this.getNativeAdvantage(platform)}<br>
              ✓ Offline access<br>
              ✓ Push notifications<br>
              ${rating ? `${rating}` : ''}
              ${size ? ` • ${size}` : ''}
            </div>
          </div>
          <div class="katalyst-prompt-option">
            <div class="katalyst-prompt-option-title">Web App</div>
            <div class="katalyst-prompt-option-features">
              ✓ Instant access<br>
              ✓ No download<br>
              ✓ Auto-updates<br>
              Works everywhere
            </div>
          </div>
        </div>
        
        ${features ? `<div class="katalyst-prompt-features">${features}</div>` : ''}
        
        <div class="katalyst-prompt-actions">
          <button class="katalyst-prompt-button katalyst-prompt-button-primary katalyst-prompt-pulse" id="katalyst-install-native">
            ${this.getNativeButtonText(platform.os)}
          </button>
          <button class="katalyst-prompt-button katalyst-prompt-button-secondary" id="katalyst-install-pwa">
            Continue with Web App
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Create PWA install prompt
   */
  private createPWAPrompt(
    platform: PlatformInfo,
    instructions: string[],
    onInstall: () => void
  ): string {
    const icon = this.config.icons[0]?.src || '/icon-192.png';
    
    const instructionsList = instructions.map((step, index) => `
      <li class="katalyst-prompt-instructions-item">
        <span class="katalyst-prompt-instructions-number">${index + 1}</span>
        <span>${step}</span>
      </li>
    `).join('');
    
    return `
      <div class="katalyst-prompt-card">
        <button class="katalyst-prompt-close" id="katalyst-prompt-close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
          </svg>
        </button>
        
        <div class="katalyst-prompt-header">
          <div class="katalyst-prompt-icon">
            <img src="${icon}" alt="${this.config.name}">
          </div>
          <div>
            <h3 class="katalyst-prompt-title">
              Install ${this.config.name}
            </h3>
            <p class="katalyst-prompt-subtitle">
              Add to your ${platform.device}
            </p>
          </div>
        </div>
        
        <div class="katalyst-prompt-description">
          Install this app on your ${platform.device} for a better experience with offline access, faster loading, and home screen convenience.
        </div>
        
        ${platform.browser === 'safari' || platform.browser === 'firefox' ? `
          <div class="katalyst-prompt-instructions">
            <div class="katalyst-prompt-instructions-title">How to install:</div>
            <ul class="katalyst-prompt-instructions-list">
              ${instructionsList}
            </ul>
          </div>
        ` : ''}
        
        <div class="katalyst-prompt-features">
          <span class="katalyst-prompt-feature">⚡ Instant loading</span>
          <span class="katalyst-prompt-feature">📱 Home screen</span>
          <span class="katalyst-prompt-feature">🔔 Notifications</span>
          <span class="katalyst-prompt-feature">📴 Works offline</span>
        </div>
        
        <div class="katalyst-prompt-actions">
          <button class="katalyst-prompt-button katalyst-prompt-button-primary katalyst-prompt-pulse" id="katalyst-install-pwa">
            ${this.getPWAButtonText(platform)}
          </button>
          <button class="katalyst-prompt-button katalyst-prompt-button-secondary" id="katalyst-prompt-later">
            Maybe later
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Attach prompt event handlers
   */
  private attachPromptHandlers(onInstallPWA: () => void, onInstallNative: () => void): void {
    // Close button
    document.getElementById('katalyst-prompt-close')?.addEventListener('click', () => {
      this.hidePrompt();
    });
    
    // Install native button
    document.getElementById('katalyst-install-native')?.addEventListener('click', () => {
      onInstallNative();
      this.hidePrompt();
    });
    
    // Install PWA button
    document.getElementById('katalyst-install-pwa')?.addEventListener('click', () => {
      onInstallPWA();
      this.hidePrompt();
    });
  }

  /**
   * Attach PWA prompt handlers
   */
  private attachPWAHandlers(onInstall: () => void, onDismiss: () => void): void {
    // Close button
    document.getElementById('katalyst-prompt-close')?.addEventListener('click', () => {
      onDismiss();
      this.hidePrompt();
    });
    
    // Install button
    document.getElementById('katalyst-install-pwa')?.addEventListener('click', () => {
      onInstall();
      this.hidePrompt();
    });
    
    // Later button
    document.getElementById('katalyst-prompt-later')?.addEventListener('click', () => {
      onDismiss();
      this.hidePrompt();
    });
  }

  /**
   * Hide the prompt
   */
  hidePrompt(): void {
    if (!this.promptContainer) return;
    
    this.promptContainer.classList.remove('katalyst-prompt-visible');
    
    setTimeout(() => {
      if (this.promptContainer) {
        this.promptContainer.remove();
        this.promptContainer = null;
      }
      this.isPromptShowing = false;
    }, 300);
  }

  /**
   * Format feature name
   */
  private formatFeature(feature: string): string {
    const featureMap: Record<string, string> = {
      'biometrics': '🔐 Biometric Login',
      'ar': '🎭 AR Features',
      'vr': '🥽 VR Support',
      'background-location': '📍 Location Services',
      'file-system': '📁 File Access',
      'system-tray': '🖥️ System Integration',
      'push-notifications': '🔔 Notifications',
      'offline': '📴 Offline Mode',
      'sync': '🔄 Auto Sync',
      'share': '📤 Native Sharing'
    };
    
    return featureMap[feature] || feature;
  }

  /**
   * Get native advantage text
   */
  private getNativeAdvantage(platform: PlatformInfo): string {
    const { device, os } = platform;
    
    if (device === 'mobile' || device === 'tablet') {
      if (os === 'ios') return 'Optimized for iOS';
      if (os === 'android') return 'Material Design';
      return 'Native performance';
    }
    
    if (device === 'desktop') {
      if (os === 'windows') return 'Windows integration';
      if (os === 'macos') return 'macOS native';
      return 'Desktop features';
    }
    
    return 'Enhanced features';
  }

  /**
   * Get native install button text
   */
  private getNativeButtonText(os: PlatformOS): string {
    const buttonText: Record<string, string> = {
      'ios': 'Get from App Store',
      'android': 'Get from Play Store',
      'windows': 'Get from Microsoft Store',
      'macos': 'Get from Mac App Store',
      'linux': 'Download App'
    };
    
    return buttonText[os] || 'Download Native App';
  }

  /**
   * Get PWA install button text
   */
  private getPWAButtonText(platform: PlatformInfo): string {
    if (platform.browser === 'safari' || platform.browser === 'firefox') {
      return 'View Instructions';
    }
    return 'Install Now';
  }
}