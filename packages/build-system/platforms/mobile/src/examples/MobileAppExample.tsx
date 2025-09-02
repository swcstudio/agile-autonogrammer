/**
 * Katalyst Mobile App Example
 *
 * Demonstrates the complete mobile development workflow
 * using RSpeedy (Lynx) for native iOS and Android deployment
 */

import type React from 'react';
import { useEffect, useState } from 'react';
import {
  AceternityButton,
  AceternityCard,
  useCountUp,
  useInView,
  useTypewriter,
} from '../../design-system';
import {
  AppState,
  Device,
  Permissions,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  useHapticFeedback,
  useRspeedy,
} from '../index';

export const MobileAppExample: React.FC = () => {
  const {
    initialize,
    currentPlatform,
    deviceInfo,
    isInitialized,
    bridgeToNative,
    checkNativeCapabilities,
  } = useRspeedy();

  const { triggerHaptic } = useHapticFeedback();
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [cameraPermission, setCameraPermission] = useState<boolean>(false);
  const { ref, isInView } = useInView();
  const { displayedText } = useTypewriter('Welcome to Katalyst Mobile!', 100);
  const { count } = useCountUp(100, 2000);

  // Initialize mobile system
  useEffect(() => {
    const initializeMobile = async () => {
      await initialize({
        platform: 'both',
        bundleId: 'com.katalyst.example',
        appName: 'Katalyst Mobile Example',
        version: '1.0.0',
        features: {
          nativeNavigation: true,
          biometricAuth: true,
          pushNotifications: true,
          backgroundTasks: true,
          offlineMode: true,
        },
        buildConfig: {
          ios: {
            teamId: 'KATALYST123',
            certificateType: 'development',
            deploymentTarget: '14.0',
          },
          android: {
            minSdkVersion: 24,
            targetSdkVersion: 34,
          },
        },
      });

      // Check device capabilities
      const caps = await checkNativeCapabilities();
      setCapabilities(caps);

      // Request camera permission
      const cameraGranted = await Permissions.request('camera');
      setCameraPermission(cameraGranted);
    };

    initializeMobile();
  }, [initialize, checkNativeCapabilities]);

  // Handle native function calls
  const callNativeFunction = async () => {
    try {
      const result = await bridgeToNative('DeviceInfo', 'getBatteryLevel');
      console.log('Battery level:', result);
      triggerHaptic('success');
    } catch (error) {
      console.error('Native call failed:', error);
      triggerHaptic('error');
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const authenticated = await bridgeToNative('BiometricAuth', 'authenticate', {
        reason: 'Authenticate to access secure features',
      });

      if (authenticated) {
        triggerHaptic('success');
        console.log('Biometric authentication successful');
      } else {
        triggerHaptic('error');
        console.log('Biometric authentication failed');
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      triggerHaptic('error');
    }
  };

  const handlePhotoCapture = async () => {
    if (!cameraPermission) {
      const granted = await Permissions.request('camera');
      if (!granted) {
        triggerHaptic('error');
        return;
      }
      setCameraPermission(true);
    }

    try {
      const photo = await bridgeToNative('Camera', 'takePicture', {
        quality: 0.8,
        allowEditing: true,
      });

      console.log('Photo captured:', photo);
      triggerHaptic('success');
    } catch (error) {
      console.error('Photo capture failed:', error);
      triggerHaptic('error');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <AceternityCard variant="glass" className="m-4 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{displayedText}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Running on {currentPlatform} •{' '}
            {Platform.isIOS() ? 'iOS' : Platform.isAndroid() ? 'Android' : 'Web'}
          </p>
          {deviceInfo && (
            <p className="text-sm text-gray-500 mt-2">
              {deviceInfo.model} • {deviceInfo.osVersion}
            </p>
          )}
        </div>
      </AceternityCard>

      {/* Stats Card */}
      <AceternityCard variant="holographic" className="mx-4 mb-4 p-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">{count}%</div>
          <p className="text-gray-600 dark:text-gray-400">System Performance</p>
        </div>
      </AceternityCard>

      {/* Device Capabilities */}
      <AceternityCard variant="meteors" className="mx-4 mb-4 p-6">
        <h3 className="text-lg font-semibold mb-4">Device Capabilities</h3>
        <div className="grid grid-cols-2 gap-2">
          {capabilities.map((capability, index) => (
            <div
              key={capability}
              className="bg-blue-100 dark:bg-blue-900 px-3 py-2 rounded-md text-sm"
            >
              {capability}
            </div>
          ))}
        </div>
      </AceternityCard>

      {/* Native Function Examples */}
      <div ref={ref} className="mx-4 space-y-4">
        {isInView && (
          <>
            <TouchableOpacity
              onPress={callNativeFunction}
              hapticFeedback="medium"
              className="w-full"
            >
              <AceternityButton
                variant="shimmer"
                gradient={{ from: '#3b82f6', to: '#8b5cf6' }}
                className="w-full py-4"
              >
                Get Battery Level
              </AceternityButton>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBiometricAuth}
              hapticFeedback="medium"
              className="w-full"
            >
              <AceternityButton
                variant="border-magic"
                gradient={{ from: '#10b981', to: '#34d399' }}
                className="w-full py-4"
              >
                Biometric Authentication
              </AceternityButton>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePhotoCapture}
              hapticFeedback="medium"
              className="w-full"
            >
              <AceternityButton variant="aurora" particles={true} className="w-full py-4">
                Take Photo
              </AceternityButton>
            </TouchableOpacity>
          </>
        )}
      </div>

      {/* Status Information */}
      <AceternityCard variant="glass" className="m-4 p-4 mt-auto">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Initialized:</span>
            <span className={isInitialized ? 'text-green-600' : 'text-red-600'}>
              {isInitialized ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Camera Permission:</span>
            <span className={cameraPermission ? 'text-green-600' : 'text-yellow-600'}>
              {cameraPermission ? 'Granted' : 'Not Granted'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>App State:</span>
            <span className="text-blue-600">{AppState.currentState}</span>
          </div>
          <div className="flex justify-between">
            <span>Has Notch:</span>
            <span>{Device.hasNotch() ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span>Pixel Ratio:</span>
            <span>{Device.getPixelRatio()}x</span>
          </div>
        </div>
      </AceternityCard>
    </SafeAreaView>
  );
};

export default MobileAppExample;
