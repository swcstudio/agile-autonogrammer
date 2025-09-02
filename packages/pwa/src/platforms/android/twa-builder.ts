/**
 * Android TWA (Trusted Web Activity) Builder
 * Generates and manages Android TWA configurations
 */

import type { AndroidDeployment } from '../../deployment/manifest';

// ============================================================================
// Types
// ============================================================================

export interface TWAConfig {
  // Package Information
  packageName: string;
  appName: string;
  launcherName: string;
  versionCode: number;
  versionName: string;
  
  // Web App Details
  hostName: string;
  defaultUrl: string;
  launchUrl: string;
  
  // Display
  displayMode: 'standalone' | 'fullscreen' | 'immersive';
  orientation: 'portrait' | 'landscape' | 'any' | 'sensor';
  themeColor: string;
  backgroundColor: string;
  navigationColor: string;
  navigationColorDark: string;
  navigationDividerColor: string;
  navigationDividerColorDark: string;
  statusBarColor: string;
  
  // Icons
  iconUrl: string;
  maskableIconUrl?: string;
  monochromeIconUrl?: string;
  splashScreenUrl?: string;
  
  // Signing
  sha256Fingerprints: string[];
  
  // Features
  enableNotifications: boolean;
  enableLocationDelegation: boolean;
  enablePlayBilling: boolean;
  enableDigitalAssetLinks: boolean;
  enableSiteSettingsShortcut: boolean;
  enableCrashReporting: boolean;
  
  // Fallback
  fallbackType: 'customtabs' | 'webview';
  enableUrlBarHiding: boolean;
  
  // Shortcuts
  shortcuts: TWAShortcut[];
  
  // Advanced
  retainedBundles?: string[];
  additionalTrustedOrigins?: string[];
  googlePlayTrack?: 'production' | 'beta' | 'alpha' | 'internal';
}

export interface TWAShortcut {
  name: string;
  shortName: string;
  url: string;
  icon: string;
}

export interface TWAAssetLinks {
  relation: string[];
  target: {
    namespace: string;
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
}

export interface TWAManifest {
  packageName: string;
  host: string;
  name: string;
  launcherName: string;
  display: string;
  themeColor: string;
  navigationColor: string;
  backgroundColor: string;
  enableNotifications: boolean;
  startUrl: string;
  iconUrl: string;
  splashScreenFadeOutDuration: number;
  signingKey: {
    alias: string;
    path: string;
  };
  appVersionName: string;
  appVersionCode: number;
  minSdkVersion: number;
  targetSdkVersion: number;
  useBrowserOnChromeOS: boolean;
  orientation: string;
  isChromeOSOnly: boolean;
  fingerprints: string[];
  additionalTrustedOrigins: string[];
  retainedBundles: string[];
  appVersion: string;
}

// ============================================================================
// TWA Builder Class
// ============================================================================

export class TWABuilder {
  private config: TWAConfig;
  
  constructor(config: TWAConfig) {
    this.config = config;
  }

  /**
   * Generate TWA manifest for Bubblewrap
   */
  generateTWAManifest(): TWAManifest {
    return {
      packageName: this.config.packageName,
      host: this.config.hostName,
      name: this.config.appName,
      launcherName: this.config.launcherName,
      display: this.config.displayMode,
      themeColor: this.config.themeColor,
      navigationColor: this.config.navigationColor,
      backgroundColor: this.config.backgroundColor,
      enableNotifications: this.config.enableNotifications,
      startUrl: this.config.launchUrl,
      iconUrl: this.config.iconUrl,
      splashScreenFadeOutDuration: 300,
      signingKey: {
        alias: 'android',
        path: './android.keystore'
      },
      appVersionName: this.config.versionName,
      appVersionCode: this.config.versionCode,
      minSdkVersion: 21, // Android 5.0
      targetSdkVersion: 33, // Android 13
      useBrowserOnChromeOS: false,
      orientation: this.config.orientation,
      isChromeOSOnly: false,
      fingerprints: this.config.sha256Fingerprints,
      additionalTrustedOrigins: this.config.additionalTrustedOrigins || [],
      retainedBundles: this.config.retainedBundles || [],
      appVersion: this.config.versionName
    };
  }

  /**
   * Generate assetlinks.json for Digital Asset Links
   */
  generateAssetLinks(): TWAAssetLinks {
    return {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: this.config.packageName,
        sha256_cert_fingerprints: this.config.sha256Fingerprints
      }
    };
  }

  /**
   * Generate Android Manifest XML
   */
  generateAndroidManifest(): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${this.config.packageName}"
    android:versionCode="${this.config.versionCode}"
    android:versionName="${this.config.versionName}">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    ${this.config.enableNotifications ? '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />' : ''}
    ${this.config.enableLocationDelegation ? '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />' : ''}
    ${this.config.enableLocationDelegation ? '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />' : ''}
    
    <!-- Features -->
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/Theme.LauncherActivity"
        android:supportsRtl="true">
        
        <!-- Main TWA Activity -->
        <activity
            android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
            android:exported="true"
            android:label="@string/app_name"
            android:screenOrientation="${this.config.orientation}"
            android:theme="@style/Theme.LauncherActivity">
            
            <meta-data
                android:name="android.support.customtabs.trusted.DEFAULT_URL"
                android:value="${this.config.defaultUrl}" />
                
            <meta-data
                android:name="android.support.customtabs.trusted.STATUS_BAR_COLOR"
                android:resource="@color/statusBarColor" />
                
            <meta-data
                android:name="android.support.customtabs.trusted.NAVIGATION_BAR_COLOR"
                android:resource="@color/navigationBarColor" />
                
            <meta-data
                android:name="android.support.customtabs.trusted.NAVIGATION_BAR_COLOR_DARK"
                android:resource="@color/navigationBarColorDark" />
                
            <meta-data
                android:name="android.support.customtabs.trusted.NAVIGATION_BAR_DIVIDER_COLOR"
                android:resource="@color/navigationDividerColor" />
                
            <meta-data
                android:name="android.support.customtabs.trusted.NAVIGATION_BAR_DIVIDER_COLOR_DARK"
                android:resource="@color/navigationDividerColorDark" />
                
            <meta-data
                android:name="android.support.customtabs.trusted.SPLASH_IMAGE_DRAWABLE"
                android:resource="@drawable/splash" />
                
            <meta-data
                android:name="android.support.customtabs.trusted.SPLASH_SCREEN_BACKGROUND_COLOR"
                android:resource="@color/backgroundColor" />
                
            <meta-data
                android:name="android.support.customtabs.trusted.SPLASH_SCREEN_FADE_OUT_DURATION"
                android:value="300" />
                
            <meta-data
                android:name="android.support.customtabs.trusted.DISPLAY_MODE"
                android:value="${this.config.displayMode}" />
                
            <meta-data
                android:name="android.support.customtabs.trusted.SCREEN_ORIENTATION"
                android:value="${this.getOrientationValue()}" />
            
            <!-- Intent Filters -->
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data
                    android:scheme="https"
                    android:host="${this.config.hostName}" />
            </intent-filter>
        </activity>
        
        ${this.generateShortcutsXML()}
        
        <!-- Browser Fallback Activity -->
        <activity
            android:name="com.google.androidbrowserhelper.trusted.FocusActivity"
            android:exported="false" />
            
        <!-- File Provider for downloads -->
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${this.config.packageName}.provider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/filepaths" />
        </provider>
        
        ${this.config.enableNotifications ? this.generateNotificationService() : ''}
        
    </application>
</manifest>`;
  }

  /**
   * Generate build.gradle configuration
   */
  generateBuildGradle(): string {
    return `apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services'

android {
    compileSdkVersion 33
    
    defaultConfig {
        applicationId "${this.config.packageName}"
        minSdkVersion 21
        targetSdkVersion 33
        versionCode ${this.config.versionCode}
        versionName "${this.config.versionName}"
        
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        
        // TWA Configuration
        resValue "string", "app_name", "${this.config.appName}"
        resValue "string", "launcher_name", "${this.config.launcherName}"
        resValue "string", "host_name", "${this.config.hostName}"
        resValue "string", "default_url", "${this.config.defaultUrl}"
        resValue "color", "statusBarColor", "${this.config.statusBarColor}"
        resValue "color", "navigationBarColor", "${this.config.navigationColor}"
        resValue "color", "navigationBarColorDark", "${this.config.navigationColorDark}"
        resValue "color", "navigationDividerColor", "${this.config.navigationDividerColor}"
        resValue "color", "navigationDividerColorDark", "${this.config.navigationDividerColorDark}"
        resValue "color", "backgroundColor", "${this.config.backgroundColor}"
        
        // Asset Links
        resValue "string", "asset_statements", """${this.generateAssetStatementsString()}"""
    }
    
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
    
    packagingOptions {
        exclude 'META-INF/DEPENDENCIES'
    }
}

dependencies {
    implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.9.0'
    implementation 'androidx.browser:browser:1.5.0'
    
    ${this.config.enablePlayBilling ? "implementation 'com.android.billingclient:billing:5.2.0'" : ''}
    ${this.config.enableNotifications ? "implementation 'com.google.firebase:firebase-messaging:23.1.2'" : ''}
    ${this.config.enableCrashReporting ? "implementation 'com.google.firebase:firebase-crashlytics:18.3.7'" : ''}
    
    testImplementation 'junit:junit:4.13.2'
    androidTestImplementation 'androidx.test.ext:junit:1.1.5'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.5.1'
}`;
  }

  /**
   * Generate Play Store listing metadata
   */
  generatePlayStoreListing(): any {
    return {
      title: this.config.appName,
      shortDescription: `Access ${this.config.appName} on your Android device`,
      fullDescription: `${this.config.appName} provides a native Android experience with offline support, push notifications, and seamless integration with your device.
      
Features:
• Fast and reliable performance
• Works offline
• Push notifications
• Home screen shortcuts
• Secure and private
• Regular updates
• Material Design interface
${this.config.enableLocationDelegation ? '• Location services' : ''}
${this.config.enablePlayBilling ? '• In-app purchases' : ''}

Install ${this.config.appName} today for the best mobile experience!`,
      
      category: 'PRODUCTIVITY',
      contentRating: 'Everyone',
      
      graphics: {
        icon: this.config.iconUrl,
        featureGraphic: `${this.config.hostName}/feature-graphic.png`,
        screenshots: [
          `${this.config.hostName}/screenshot-1.png`,
          `${this.config.hostName}/screenshot-2.png`,
          `${this.config.hostName}/screenshot-3.png`,
          `${this.config.hostName}/screenshot-4.png`
        ]
      },
      
      contact: {
        email: `support@${this.config.hostName}`,
        website: `https://${this.config.hostName}`,
        privacyPolicy: `https://${this.config.hostName}/privacy`,
        termsOfService: `https://${this.config.hostName}/terms`
      },
      
      distribution: {
        track: this.config.googlePlayTrack || 'production',
        countries: 'all',
        pricing: 'free'
      }
    };
  }

  /**
   * Generate app bundle build script
   */
  generateBuildScript(): string {
    return `#!/bin/bash
# TWA Build Script for ${this.config.appName}

echo "Building ${this.config.appName} TWA..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v java >/dev/null 2>&1 || { echo "Java is required but not installed. Aborting." >&2; exit 1; }

# Install Bubblewrap if not installed
if ! command -v bubblewrap &> /dev/null; then
    echo "Installing Bubblewrap..."
    npm i -g @bubblewrap/cli
fi

# Initialize TWA project
echo "Initializing TWA project..."
bubblewrap init --manifest ./twa-manifest.json

# Generate icons
echo "Generating icons..."
bubblewrap generateicons --icon ${this.config.iconUrl}

# Build APK
echo "Building APK..."
bubblewrap build --skipPwaValidation

# Build App Bundle
echo "Building App Bundle..."
bubblewrap build --skipPwaValidation --bundletool

# Sign the bundle
echo "Signing App Bundle..."
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \\
    -keystore android.keystore \\
    -storepass android \\
    app-release.aab android

echo "Build complete! Files generated:"
echo "  - app-release.apk (for testing)"
echo "  - app-release.aab (for Play Store)"
echo ""
echo "Next steps:"
echo "1. Test the APK on a device: adb install app-release.apk"
echo "2. Upload the AAB to Google Play Console"
echo "3. Configure Digital Asset Links at https://${this.config.hostName}/.well-known/assetlinks.json"
`;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getOrientationValue(): string {
    const orientationMap: Record<string, string> = {
      'portrait': 'portrait',
      'landscape': 'landscape',
      'any': 'unspecified',
      'sensor': 'sensor'
    };
    return orientationMap[this.config.orientation] || 'unspecified';
  }

  private generateShortcutsXML(): string {
    if (!this.config.shortcuts || this.config.shortcuts.length === 0) {
      return '';
    }
    
    return `
        <meta-data
            android:name="android.app.shortcuts"
            android:resource="@xml/shortcuts" />`;
  }

  private generateNotificationService(): string {
    return `
        <!-- FCM Service -->
        <service
            android:name="com.google.firebase.messaging.FirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
        
        <!-- Default notification icon and color -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_notification" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/colorAccent" />`;
  }

  private generateAssetStatementsString(): string {
    const assetLinks = this.generateAssetLinks();
    return JSON.stringify([assetLinks]);
  }

  /**
   * Validate TWA configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate package name
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(this.config.packageName)) {
      errors.push('Invalid package name format');
    }
    
    // Validate version code
    if (this.config.versionCode < 1 || this.config.versionCode > 2100000000) {
      errors.push('Version code must be between 1 and 2100000000');
    }
    
    // Validate SHA256 fingerprints
    if (this.config.sha256Fingerprints.length === 0) {
      errors.push('At least one SHA256 fingerprint is required');
    }
    
    this.config.sha256Fingerprints.forEach((fingerprint, index) => {
      if (!/^[A-F0-9]{2}(:[A-F0-9]{2}){31}$/.test(fingerprint)) {
        errors.push(`Invalid SHA256 fingerprint format at index ${index}`);
      }
    });
    
    // Validate URLs
    try {
      new URL(this.config.defaultUrl);
      new URL(this.config.launchUrl);
    } catch {
      errors.push('Invalid URL format');
    }
    
    // Validate colors
    const colorRegex = /^#[0-9A-F]{6}$/i;
    if (!colorRegex.test(this.config.themeColor)) {
      errors.push('Invalid theme color format');
    }
    if (!colorRegex.test(this.config.backgroundColor)) {
      errors.push('Invalid background color format');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTWAConfig(deployment: AndroidDeployment): TWAConfig {
  return {
    packageName: deployment.twa.packageName,
    appName: deployment.twa.appName || 'Katalyst App',
    launcherName: deployment.twa.launcherName || 'Katalyst',
    versionCode: deployment.directDownload.versionCode,
    versionName: deployment.directDownload.versionName,
    hostName: deployment.twa.hostName,
    defaultUrl: deployment.twa.defaultUrl,
    launchUrl: deployment.twa.defaultUrl,
    displayMode: 'standalone',
    orientation: 'any',
    themeColor: '#667eea',
    backgroundColor: '#ffffff',
    navigationColor: '#ffffff',
    navigationColorDark: '#000000',
    navigationDividerColor: '#e0e0e0',
    navigationDividerColorDark: '#333333',
    statusBarColor: '#667eea',
    iconUrl: '/icon-512.png',
    maskableIconUrl: '/icon-maskable-512.png',
    splashScreenUrl: '/splash.png',
    sha256Fingerprints: deployment.twa.sha256Fingerprints,
    enableNotifications: deployment.features.includes('push-notifications'),
    enableLocationDelegation: deployment.features.includes('location'),
    enablePlayBilling: deployment.features.includes('billing'),
    enableDigitalAssetLinks: true,
    enableSiteSettingsShortcut: true,
    enableCrashReporting: true,
    fallbackType: 'customtabs',
    enableUrlBarHiding: true,
    shortcuts: [],
    additionalTrustedOrigins: [],
    googlePlayTrack: 'production'
  };
}

export default TWABuilder;