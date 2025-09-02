/**
 * useSpatialInteraction - Advanced 3D Interaction System
 *
 * Provides comprehensive spatial interaction capabilities including
 * hand tracking, gesture recognition, gaze interaction, and haptic feedback
 */

import { useFrame } from '@react-three/fiber';
import { useXR } from '@react-three/xr';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface SpatialInteractionConfig {
  // Interaction Types
  enableHandTracking?: boolean;
  enableGazeInteraction?: boolean;
  enableControllerInput?: boolean;

  // Thresholds
  hoverDistance?: number;
  selectDistance?: number;
  grabDistance?: number;

  // Haptic Feedback
  hapticFeedback?: {
    hover?: { intensity: number; duration: number };
    select?: { intensity: number; duration: number };
    grab?: { intensity: number; duration: number };
  };

  // Event Handlers
  onHover?: (event: SpatialInteractionEvent) => void;
  onUnhover?: (event: SpatialInteractionEvent) => void;
  onSelect?: (event: SpatialInteractionEvent) => void;
  onGrab?: (event: SpatialInteractionEvent) => void;
  onRelease?: (event: SpatialInteractionEvent) => void;
  onDrag?: (event: SpatialInteractionEvent) => void;
}

export interface SpatialInteractionEvent {
  type: 'hover' | 'unhover' | 'select' | 'grab' | 'release' | 'drag';
  inputSource: 'hand' | 'controller' | 'gaze';
  position: THREE.Vector3;
  direction: THREE.Vector3;
  hand?: {
    index: number;
    joints: Record<string, XRJointPose>;
    pinchStrength: number;
    grabStrength: number;
  };
  controller?: {
    index: number;
    buttons: number[];
    axes: number[];
  };
  target?: THREE.Object3D;
  distance: number;
  timestamp: number;
}

export interface UseSpatialInteractionReturn {
  // Current State
  isHovered: boolean;
  isSelected: boolean;
  isGrabbed: boolean;

  // Interaction Data
  currentInteraction: SpatialInteractionEvent | null;
  interactionHistory: SpatialInteractionEvent[];

  // Hand Data
  handPositions: THREE.Vector3[];
  handGestures: Record<number, string>;

  // Event Handlers (for Three.js objects)
  onPointerEnter: (event: THREE.Event) => void;
  onPointerLeave: (event: THREE.Event) => void;
  onPointerDown: (event: THREE.Event) => void;
  onPointerUp: (event: THREE.Event) => void;
  onPointerMove: (event: THREE.Event) => void;

  // Manual Interaction Methods
  triggerHaptic: (type: 'hover' | 'select' | 'grab', hand?: number) => void;
  clearInteractionHistory: () => void;
}

export const useSpatialInteraction = (
  config: SpatialInteractionConfig = {}
): UseSpatialInteractionReturn => {
  const {
    enableHandTracking = true,
    enableGazeInteraction = true,
    enableControllerInput = true,
    hoverDistance = 0.1,
    selectDistance = 0.05,
    grabDistance = 0.03,
    hapticFeedback = {
      hover: { intensity: 0.3, duration: 50 },
      select: { intensity: 0.7, duration: 100 },
      grab: { intensity: 1.0, duration: 150 },
    },
    onHover,
    onUnhover,
    onSelect,
    onGrab,
    onRelease,
    onDrag,
  } = config;

  // XR Context
  const { hands, controllers, player } = useXR();

  // State
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [isGrabbed, setIsGrabbed] = useState(false);
  const [currentInteraction, setCurrentInteraction] = useState<SpatialInteractionEvent | null>(
    null
  );
  const [interactionHistory, setInteractionHistory] = useState<SpatialInteractionEvent[]>([]);
  const [handPositions, setHandPositions] = useState<THREE.Vector3[]>([]);
  const [handGestures, setHandGestures] = useState<Record<number, string>>({});

  // Refs
  const lastInteractionTime = useRef(0);
  const dragStartPosition = useRef<THREE.Vector3 | null>(null);

  // Hand tracking and gesture recognition
  useFrame(() => {
    if (!enableHandTracking || !hands.length) return;

    const positions: THREE.Vector3[] = [];
    const gestures: Record<number, string> = {};

    hands.forEach((hand, index) => {
      if (hand.visible) {
        positions[index] = hand.position.clone();

        // Simple gesture recognition
        const gesture = recognizeHandGesture(hand);
        gestures[index] = gesture;

        // Check for interaction states
        checkHandInteraction(hand, index);
      }
    });

    setHandPositions(positions);
    setHandGestures(gestures);
  });

  // Gesture recognition algorithm
  const recognizeHandGesture = useCallback((hand: any): string => {
    if (!hand.joints) return 'unknown';

    try {
      const indexTip = hand.joints['index-finger-tip']?.transform?.position;
      const thumbTip = hand.joints['thumb-tip']?.transform?.position;
      const middleTip = hand.joints['middle-finger-tip']?.transform?.position;
      const ringTip = hand.joints['ring-finger-tip']?.transform?.position;
      const pinkyTip = hand.joints['little-finger-tip']?.transform?.position;

      if (!indexTip || !thumbTip) return 'unknown';

      // Calculate distances between finger tips
      const thumbIndexDistance = new THREE.Vector3()
        .fromArray(thumbTip)
        .distanceTo(new THREE.Vector3().fromArray(indexTip));

      // Pinch detection
      if (thumbIndexDistance < 0.03) {
        return 'pinch';
      }

      // Point detection
      if (thumbIndexDistance > 0.08) {
        return 'point';
      }

      // Fist detection (all fingers close to palm)
      const palmPosition = hand.joints['wrist']?.transform?.position;
      if (palmPosition) {
        const palm = new THREE.Vector3().fromArray(palmPosition);
        const fingersTopalm = [indexTip, middleTip, ringTip, pinkyTip]
          .filter(Boolean)
          .map((tip) => palm.distanceTo(new THREE.Vector3().fromArray(tip)))
          .every((distance) => distance < 0.05);

        if (fingersToPalm) return 'fist';
      }

      return 'open';
    } catch (error) {
      return 'unknown';
    }
  }, []);

  // Hand interaction checking
  const checkHandInteraction = useCallback(
    (hand: any, handIndex: number) => {
      const gesture = handGestures[handIndex];
      const position = hand.position;

      // Create interaction event
      const createEvent = (type: SpatialInteractionEvent['type']): SpatialInteractionEvent => ({
        type,
        inputSource: 'hand',
        position: position.clone(),
        direction: new THREE.Vector3(0, 0, -1), // Default forward direction
        hand: {
          index: handIndex,
          joints: hand.joints || {},
          pinchStrength: gesture === 'pinch' ? 1.0 : 0.0,
          grabStrength: gesture === 'fist' ? 1.0 : 0.0,
        },
        distance: 0, // Will be calculated by the target object
        timestamp: performance.now(),
      });

      // Gesture-based interactions
      if (gesture === 'pinch' && !isSelected) {
        const event = createEvent('select');
        setIsSelected(true);
        setCurrentInteraction(event);
        onSelect?.(event);
        triggerHaptic('select', handIndex);

        addToHistory(event);
      } else if (gesture !== 'pinch' && isSelected) {
        const event = createEvent('release');
        setIsSelected(false);
        setCurrentInteraction(null);
        onRelease?.(event);

        addToHistory(event);
      }

      if (gesture === 'fist' && !isGrabbed) {
        const event = createEvent('grab');
        setIsGrabbed(true);
        setCurrentInteraction(event);
        dragStartPosition.current = position.clone();
        onGrab?.(event);
        triggerHaptic('grab', handIndex);

        addToHistory(event);
      } else if (gesture !== 'fist' && isGrabbed) {
        const event = createEvent('release');
        setIsGrabbed(false);
        setCurrentInteraction(null);
        dragStartPosition.current = null;
        onRelease?.(event);

        addToHistory(event);
      }

      // Drag detection
      if (isGrabbed && dragStartPosition.current) {
        const dragDistance = position.distanceTo(dragStartPosition.current);
        if (dragDistance > 0.01) {
          // Minimum drag threshold
          const event = createEvent('drag');
          onDrag?.(event);

          // Update drag start position for continuous dragging
          dragStartPosition.current = position.clone();
        }
      }
    },
    [handGestures, isSelected, isGrabbed, onSelect, onRelease, onGrab, onDrag]
  );

  // Add event to history
  const addToHistory = useCallback((event: SpatialInteractionEvent) => {
    setInteractionHistory((prev) => {
      const newHistory = [...prev, event];
      // Keep only last 50 events
      return newHistory.slice(-50);
    });
  }, []);

  // Haptic feedback
  const triggerHaptic = useCallback(
    (type: 'hover' | 'select' | 'grab', handIndex?: number) => {
      if (!hapticFeedback[type]) return;

      const { intensity, duration } = hapticFeedback[type];

      // Trigger haptics for specific hand or all hands
      const targetHands = handIndex !== undefined ? [hands[handIndex]] : hands;

      targetHands.forEach((hand) => {
        if (hand?.inputSource?.gamepad?.hapticActuators?.[0]) {
          hand.inputSource.gamepad.hapticActuators[0].pulse(intensity, duration);
        }
      });
    },
    [hands, hapticFeedback]
  );

  // Three.js event handlers for traditional pointer events
  const onPointerEnter = useCallback(
    (event: THREE.Event) => {
      if (performance.now() - lastInteractionTime.current < 50) return; // Debounce

      setIsHovered(true);

      const spatialEvent: SpatialInteractionEvent = {
        type: 'hover',
        inputSource: 'controller',
        position: event.point || new THREE.Vector3(),
        direction: new THREE.Vector3(0, 0, -1),
        target: event.object,
        distance: event.distance || 0,
        timestamp: performance.now(),
      };

      setCurrentInteraction(spatialEvent);
      onHover?.(spatialEvent);
      triggerHaptic('hover');

      lastInteractionTime.current = performance.now();
      addToHistory(spatialEvent);
    },
    [onHover, triggerHaptic, addToHistory]
  );

  const onPointerLeave = useCallback(
    (event: THREE.Event) => {
      setIsHovered(false);

      const spatialEvent: SpatialInteractionEvent = {
        type: 'unhover',
        inputSource: 'controller',
        position: event.point || new THREE.Vector3(),
        direction: new THREE.Vector3(0, 0, -1),
        target: event.object,
        distance: event.distance || 0,
        timestamp: performance.now(),
      };

      setCurrentInteraction(null);
      onUnhover?.(spatialEvent);

      addToHistory(spatialEvent);
    },
    [onUnhover, addToHistory]
  );

  const onPointerDown = useCallback(
    (event: THREE.Event) => {
      const spatialEvent: SpatialInteractionEvent = {
        type: 'select',
        inputSource: 'controller',
        position: event.point || new THREE.Vector3(),
        direction: new THREE.Vector3(0, 0, -1),
        target: event.object,
        distance: event.distance || 0,
        timestamp: performance.now(),
      };

      setIsSelected(true);
      setCurrentInteraction(spatialEvent);
      onSelect?.(spatialEvent);
      triggerHaptic('select');

      addToHistory(spatialEvent);
    },
    [onSelect, triggerHaptic, addToHistory]
  );

  const onPointerUp = useCallback(
    (event: THREE.Event) => {
      const spatialEvent: SpatialInteractionEvent = {
        type: 'release',
        inputSource: 'controller',
        position: event.point || new THREE.Vector3(),
        direction: new THREE.Vector3(0, 0, -1),
        target: event.object,
        distance: event.distance || 0,
        timestamp: performance.now(),
      };

      setIsSelected(false);
      setCurrentInteraction(null);
      onRelease?.(spatialEvent);

      addToHistory(spatialEvent);
    },
    [onRelease, addToHistory]
  );

  const onPointerMove = useCallback(
    (event: THREE.Event) => {
      if (isGrabbed || isSelected) {
        const spatialEvent: SpatialInteractionEvent = {
          type: 'drag',
          inputSource: 'controller',
          position: event.point || new THREE.Vector3(),
          direction: new THREE.Vector3(0, 0, -1),
          target: event.object,
          distance: event.distance || 0,
          timestamp: performance.now(),
        };

        onDrag?.(spatialEvent);
      }
    },
    [isGrabbed, isSelected, onDrag]
  );

  // Clear interaction history
  const clearInteractionHistory = useCallback(() => {
    setInteractionHistory([]);
  }, []);

  return {
    // Current State
    isHovered,
    isSelected,
    isGrabbed,

    // Interaction Data
    currentInteraction,
    interactionHistory,

    // Hand Data
    handPositions,
    handGestures,

    // Event Handlers
    onPointerEnter,
    onPointerLeave,
    onPointerDown,
    onPointerUp,
    onPointerMove,

    // Manual Methods
    triggerHaptic,
    clearInteractionHistory,
  };
};

export default useSpatialInteraction;
