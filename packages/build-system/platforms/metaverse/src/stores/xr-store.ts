/**
 * XR Store - Global WebXR State Management
 *
 * Zustand-based state management for WebXR sessions, spatial UI,
 * cross-platform synchronization, and device capabilities
 */

import * as THREE from 'three';
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
export interface XRDevice {
  platform: 'quest' | 'visionpro' | 'hololens' | 'web' | 'unknown';
  model: string;
  os: string;
  version: string;
  capabilities: string[];
  supportedFeatures: string[];
  refreshRate: number;
  resolution: { width: number; height: number };
  fov: { horizontal: number; vertical: number };
}

export interface XRSession {
  id: string;
  mode: 'immersive-vr' | 'immersive-ar' | 'inline';
  startTime: number;
  duration: number;
  platform: string;
  features: string[];
  isActive: boolean;
}

export interface SpatialUIState {
  mode: '2d' | '3d' | 'mixed';
  activeComponents: string[];
  spatialLayout: {
    [componentId: string]: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
      visible: boolean;
      interactive: boolean;
    };
  };
  handsVisible: boolean;
  controllersVisible: boolean;
  eyeTrackingActive: boolean;
  spatialAudioEnabled: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangleCount: number;
  shaderCompilations: number;
  lastUpdated: number;
}

export interface MultiUserState {
  sessionId: string | null;
  localUserId: string | null;
  connectedUsers: {
    [userId: string]: {
      id: string;
      name: string;
      avatar: string;
      position: [number, number, number];
      rotation: [number, number, number];
      handPositions: {
        left?: [number, number, number];
        right?: [number, number, number];
      };
      isActive: boolean;
      lastSeen: number;
    };
  };
  isHost: boolean;
  maxUsers: number;
  voiceChatEnabled: boolean;
  screenSharingActive: boolean;
}

// Main Store Interface
interface XRStore {
  // Session State
  isXRSupported: boolean;
  isXRActive: boolean;
  currentSession: XRSession | null;
  sessionHistory: XRSession[];

  // Device Information
  deviceInfo: XRDevice | null;
  currentPlatform: string | null;

  // Spatial UI
  spatialUI: SpatialUIState;

  // Performance
  performance: PerformanceMetrics;

  // Multi-User Collaboration
  multiUser: MultiUserState;

  // Shared Data (sync between 2D and XR)
  sharedData: Record<string, any>;

  // Settings & Preferences
  settings: {
    handTrackingEnabled: boolean;
    eyeTrackingEnabled: boolean;
    hapticFeedbackEnabled: boolean;
    spatialAudioEnabled: boolean;
    comfortMode: boolean;
    snapTurning: boolean;
    teleportMovement: boolean;
    handInteractionMode: 'ray' | 'direct' | 'both';
    uiScale: number;
    ipd: number; // Interpupillary distance
    playArea: {
      width: number;
      height: number;
      depth: number;
    };
  };

  // Actions
  enterXR: (platform: string, sessionConfig?: any) => void;
  exitXR: () => void;
  updateSession: (updates: Partial<XRSession>) => void;
  setDeviceInfo: (device: XRDevice) => void;

  // Spatial UI Actions
  updateSpatialMode: (mode: SpatialUIState['mode']) => void;
  addSpatialComponent: (id: string, config: SpatialUIState['spatialLayout'][string]) => void;
  updateSpatialComponent: (
    id: string,
    updates: Partial<SpatialUIState['spatialLayout'][string]>
  ) => void;
  removeSpatialComponent: (id: string) => void;
  toggleHandsVisibility: () => void;
  toggleEyeTracking: () => void;

  // Performance Actions
  updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  resetPerformanceMetrics: () => void;

  // Multi-User Actions
  joinMultiUserSession: (sessionId: string, userId: string, userName: string) => void;
  leaveMultiUserSession: () => void;
  updateUserPosition: (
    userId: string,
    position: [number, number, number],
    rotation: [number, number, number]
  ) => void;
  updateUserHands: (
    userId: string,
    hands: MultiUserState['connectedUsers'][string]['handPositions']
  ) => void;
  addUser: (user: MultiUserState['connectedUsers'][string]) => void;
  removeUser: (userId: string) => void;

  // Data Synchronization
  syncWith2D: (data: Record<string, any>) => void;
  syncWithMobile: (data: Record<string, any>) => void;
  broadcastToUsers: (data: any) => void;

  // Settings Actions
  updateSettings: (updates: Partial<XRStore['settings']>) => void;
  resetSettings: () => void;

  // Utility Actions
  clearSessionHistory: () => void;
  exportSessionData: () => string;
  importSessionData: (data: string) => void;
}

// Default values
const defaultSpatialUI: SpatialUIState = {
  mode: '2d',
  activeComponents: [],
  spatialLayout: {},
  handsVisible: false,
  controllersVisible: false,
  eyeTrackingActive: false,
  spatialAudioEnabled: true,
};

const defaultPerformanceMetrics: PerformanceMetrics = {
  fps: 0,
  frameTime: 0,
  memoryUsage: 0,
  drawCalls: 0,
  triangleCount: 0,
  shaderCompilations: 0,
  lastUpdated: 0,
};

const defaultMultiUserState: MultiUserState = {
  sessionId: null,
  localUserId: null,
  connectedUsers: {},
  isHost: false,
  maxUsers: 8,
  voiceChatEnabled: false,
  screenSharingActive: false,
};

const defaultSettings = {
  handTrackingEnabled: true,
  eyeTrackingEnabled: false,
  hapticFeedbackEnabled: true,
  spatialAudioEnabled: true,
  comfortMode: true,
  snapTurning: false,
  teleportMovement: true,
  handInteractionMode: 'both' as const,
  uiScale: 1.0,
  ipd: 64, // Average IPD in mm
  playArea: {
    width: 2.0,
    height: 2.0,
    depth: 2.0,
  },
};

// Create the store
export const useXRStore = create<XRStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial State
        isXRSupported: false,
        isXRActive: false,
        currentSession: null,
        sessionHistory: [],
        deviceInfo: null,
        currentPlatform: null,
        spatialUI: defaultSpatialUI,
        performance: defaultPerformanceMetrics,
        multiUser: defaultMultiUserState,
        sharedData: {},
        settings: defaultSettings,

        // Session Actions
        enterXR: (platform: string, sessionConfig = {}) =>
          set((state) => {
            const newSession: XRSession = {
              id: `session_${Date.now()}`,
              mode: sessionConfig.mode || 'immersive-vr',
              startTime: Date.now(),
              duration: 0,
              platform,
              features: sessionConfig.features || [],
              isActive: true,
            };

            state.isXRActive = true;
            state.currentSession = newSession;
            state.currentPlatform = platform;
            state.spatialUI.mode = '3d';

            // Add to history
            state.sessionHistory.push(newSession);

            // Keep only last 10 sessions in history
            if (state.sessionHistory.length > 10) {
              state.sessionHistory = state.sessionHistory.slice(-10);
            }
          }),

        exitXR: () =>
          set((state) => {
            if (state.currentSession) {
              // Update session duration
              state.currentSession.duration = Date.now() - state.currentSession.startTime;
              state.currentSession.isActive = false;
            }

            state.isXRActive = false;
            state.currentSession = null;
            state.spatialUI.mode = '2d';
            state.spatialUI.handsVisible = false;
            state.spatialUI.eyeTrackingActive = false;
          }),

        updateSession: (updates: Partial<XRSession>) =>
          set((state) => {
            if (state.currentSession) {
              Object.assign(state.currentSession, updates);
            }
          }),

        setDeviceInfo: (device: XRDevice) =>
          set((state) => {
            state.deviceInfo = device;
            state.isXRSupported = true;
          }),

        // Spatial UI Actions
        updateSpatialMode: (mode: SpatialUIState['mode']) =>
          set((state) => {
            state.spatialUI.mode = mode;
          }),

        addSpatialComponent: (id: string, config: SpatialUIState['spatialLayout'][string]) =>
          set((state) => {
            state.spatialUI.activeComponents.push(id);
            state.spatialUI.spatialLayout[id] = config;
          }),

        updateSpatialComponent: (
          id: string,
          updates: Partial<SpatialUIState['spatialLayout'][string]>
        ) =>
          set((state) => {
            if (state.spatialUI.spatialLayout[id]) {
              Object.assign(state.spatialUI.spatialLayout[id], updates);
            }
          }),

        removeSpatialComponent: (id: string) =>
          set((state) => {
            state.spatialUI.activeComponents = state.spatialUI.activeComponents.filter(
              (cId) => cId !== id
            );
            delete state.spatialUI.spatialLayout[id];
          }),

        toggleHandsVisibility: () =>
          set((state) => {
            state.spatialUI.handsVisible = !state.spatialUI.handsVisible;
          }),

        toggleEyeTracking: () =>
          set((state) => {
            state.spatialUI.eyeTrackingActive = !state.spatialUI.eyeTrackingActive;
          }),

        // Performance Actions
        updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) =>
          set((state) => {
            Object.assign(state.performance, metrics);
            state.performance.lastUpdated = Date.now();
          }),

        resetPerformanceMetrics: () =>
          set((state) => {
            state.performance = { ...defaultPerformanceMetrics };
          }),

        // Multi-User Actions
        joinMultiUserSession: (sessionId: string, userId: string, userName: string) =>
          set((state) => {
            state.multiUser.sessionId = sessionId;
            state.multiUser.localUserId = userId;
            state.multiUser.connectedUsers[userId] = {
              id: userId,
              name: userName,
              avatar: '/avatars/default.png',
              position: [0, 1.6, 0],
              rotation: [0, 0, 0],
              handPositions: {},
              isActive: true,
              lastSeen: Date.now(),
            };
          }),

        leaveMultiUserSession: () =>
          set((state) => {
            state.multiUser = { ...defaultMultiUserState };
          }),

        updateUserPosition: (
          userId: string,
          position: [number, number, number],
          rotation: [number, number, number]
        ) =>
          set((state) => {
            if (state.multiUser.connectedUsers[userId]) {
              state.multiUser.connectedUsers[userId].position = position;
              state.multiUser.connectedUsers[userId].rotation = rotation;
              state.multiUser.connectedUsers[userId].lastSeen = Date.now();
            }
          }),

        updateUserHands: (
          userId: string,
          hands: MultiUserState['connectedUsers'][string]['handPositions']
        ) =>
          set((state) => {
            if (state.multiUser.connectedUsers[userId]) {
              state.multiUser.connectedUsers[userId].handPositions = hands;
              state.multiUser.connectedUsers[userId].lastSeen = Date.now();
            }
          }),

        addUser: (user: MultiUserState['connectedUsers'][string]) =>
          set((state) => {
            state.multiUser.connectedUsers[user.id] = user;
          }),

        removeUser: (userId: string) =>
          set((state) => {
            delete state.multiUser.connectedUsers[userId];
          }),

        // Data Synchronization
        syncWith2D: (data: Record<string, any>) =>
          set((state) => {
            state.sharedData = { ...state.sharedData, ...data };
          }),

        syncWithMobile: (data: Record<string, any>) =>
          set((state) => {
            state.sharedData = { ...state.sharedData, mobile: data };
          }),

        broadcastToUsers: (data: any) => {
          // This would typically interface with a WebSocket or WebRTC connection
          console.log('Broadcasting to users:', data);
        },

        // Settings Actions
        updateSettings: (updates: Partial<XRStore['settings']>) =>
          set((state) => {
            Object.assign(state.settings, updates);
          }),

        resetSettings: () =>
          set((state) => {
            state.settings = { ...defaultSettings };
          }),

        // Utility Actions
        clearSessionHistory: () =>
          set((state) => {
            state.sessionHistory = [];
          }),

        exportSessionData: () => {
          const state = get();
          return JSON.stringify(
            {
              sessionHistory: state.sessionHistory,
              settings: state.settings,
              deviceInfo: state.deviceInfo,
            },
            null,
            2
          );
        },

        importSessionData: (data: string) =>
          set((state) => {
            try {
              const imported = JSON.parse(data);
              if (imported.sessionHistory) state.sessionHistory = imported.sessionHistory;
              if (imported.settings) state.settings = imported.settings;
              if (imported.deviceInfo) state.deviceInfo = imported.deviceInfo;
            } catch (error) {
              console.error('Failed to import session data:', error);
            }
          }),
      })),
      {
        name: 'katalyst-xr-store',
        partialize: (state) => ({
          sessionHistory: state.sessionHistory,
          settings: state.settings,
          deviceInfo: state.deviceInfo,
          sharedData: state.sharedData,
        }),
      }
    )
  )
);

// Selector hooks for optimized subscriptions
export const useXRSession = () =>
  useXRStore((state) => ({
    isXRActive: state.isXRActive,
    currentSession: state.currentSession,
    enterXR: state.enterXR,
    exitXR: state.exitXR,
  }));

export const useSpatialUI = () =>
  useXRStore((state) => ({
    spatialUI: state.spatialUI,
    updateSpatialMode: state.updateSpatialMode,
    addSpatialComponent: state.addSpatialComponent,
    updateSpatialComponent: state.updateSpatialComponent,
    removeSpatialComponent: state.removeSpatialComponent,
  }));

export const useXRPerformance = () =>
  useXRStore((state) => ({
    performance: state.performance,
    updatePerformanceMetrics: state.updatePerformanceMetrics,
    resetPerformanceMetrics: state.resetPerformanceMetrics,
  }));

export const useMultiUser = () =>
  useXRStore((state) => ({
    multiUser: state.multiUser,
    joinMultiUserSession: state.joinMultiUserSession,
    leaveMultiUserSession: state.leaveMultiUserSession,
    updateUserPosition: state.updateUserPosition,
    addUser: state.addUser,
    removeUser: state.removeUser,
  }));

export const useXRSettings = () =>
  useXRStore((state) => ({
    settings: state.settings,
    updateSettings: state.updateSettings,
    resetSettings: state.resetSettings,
  }));

export default useXRStore;
