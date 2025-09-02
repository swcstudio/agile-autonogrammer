/**
 * SpatialCard - 3D Extension of Aceternity Card Components
 *
 * Immersive 3D cards with spatial interactions, hand tracking support,
 * and seamless integration with the existing Aceternity design system
 */

import { animated, useSpring } from '@react-spring/three';
import { Html, Plane, RoundedBox, Text } from '@react-three/drei';
import { extend, useFrame, useThree } from '@react-three/fiber';
import { useInteraction, useXR } from '@react-three/xr';
import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useSpatialInteraction } from '../hooks/useSpatialInteraction';
import { useXRStore } from '../stores/xr-store';

// Extend Three.js with custom materials
extend({
  HolographicMaterial: class extends THREE.ShaderMaterial {
    constructor() {
      super({
        vertexShader: `
          varying vec3 vWorldPosition;
          varying vec3 vNormal;
          void main() {
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 color;
          uniform float fresnelAmount;
          uniform float fresnelOpacity;
          varying vec3 vWorldPosition;
          varying vec3 vNormal;
          
          void main() {
            vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
            float fresnel = pow(1.0 - dot(viewDirection, vNormal), fresnelAmount);
            
            vec3 hologramColor = color + sin(vWorldPosition.y * 10.0 + time) * 0.1;
            float alpha = fresnel * fresnelOpacity;
            
            gl_FragColor = vec4(hologramColor, alpha);
          }
        `,
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color('#19f7ff') },
          fresnelAmount: { value: 2.0 },
          fresnelOpacity: { value: 0.8 },
        },
        transparent: true,
        side: THREE.DoubleSide,
      });
    }
  },
});

export interface SpatialCardProps {
  // Positioning & Transform
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];

  // Dimensions
  width?: number;
  height?: number;
  depth?: number;

  // Visual Variants (from Aceternity)
  variant?:
    | 'glass'
    | 'holographic'
    | 'aurora'
    | 'meteors'
    | 'evervault'
    | '3d'
    | 'spotlight'
    | 'glare';

  // Interaction
  interactive?: boolean;
  followGaze?: boolean;
  magneticToHands?: boolean;

  // Content
  children?: React.ReactNode;
  htmlContent?: React.ReactNode;

  // Animation
  animation?: {
    hover?: 'lift' | 'scale' | 'glow' | 'rotate';
    entrance?: 'fade' | 'slide' | 'scale' | 'spiral';
    idle?: 'float' | 'pulse' | 'rotate' | 'none';
  };

  // Spatial Behavior
  billboarding?: boolean;
  worldLocked?: boolean;
  handholdDistance?: number;

  // Events
  onHover?: (event: THREE.Event) => void;
  onUnhover?: (event: THREE.Event) => void;
  onSelect?: (event: THREE.Event) => void;
  onGrab?: (event: THREE.Event) => void;
  onRelease?: (event: THREE.Event) => void;

  // Styling
  backgroundColor?: string;
  borderColor?: string;
  shadowIntensity?: number;
  glowIntensity?: number;
}

export const SpatialCard: React.FC<SpatialCardProps> = ({
  position = [0, 1.6, -2],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  width = 2,
  height = 1.2,
  depth = 0.1,
  variant = 'glass',
  interactive = true,
  followGaze = false,
  magneticToHands = false,
  children,
  htmlContent,
  animation = { hover: 'lift', entrance: 'fade', idle: 'float' },
  billboarding = false,
  worldLocked = false,
  handholdDistance = 0.8,
  onHover,
  onUnhover,
  onSelect,
  onGrab,
  onRelease,
  backgroundColor = '#ffffff',
  borderColor = '#e5e7eb',
  shadowIntensity = 0.3,
  glowIntensity = 0.5,
}) => {
  // Refs
  const groupRef = useRef<THREE.Group>(null);
  const cardRef = useRef<THREE.Mesh>(null);

  // XR Context
  const { player, hands } = useXR();
  const { camera } = useThree();

  // State
  const [isHovered, setIsHovered] = useState(false);
  const [isGrabbed, setIsGrabbed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Spatial interaction
  const { onPointerEnter, onPointerLeave, onPointerDown, onPointerUp } = useSpatialInteraction({
    onHover: (e) => {
      setIsHovered(true);
      onHover?.(e);
    },
    onUnhover: (e) => {
      setIsHovered(false);
      onUnhover?.(e);
    },
    onSelect: (e) => {
      onSelect?.(e);
    },
    onGrab: (e) => {
      setIsGrabbed(true);
      onGrab?.(e);
    },
    onRelease: (e) => {
      setIsGrabbed(false);
      onRelease?.(e);
    },
  });

  // Entrance animation
  const { opacity, cardScale, cardPosition } = useSpring({
    opacity: isVisible ? 1 : 0,
    cardScale: isVisible ? scale : [0, 0, 0],
    cardPosition: position,
    config: { tension: 280, friction: 60 },
  });

  // Hover animations
  const { hoverScale, hoverPosition, glowOpacity } = useSpring({
    hoverScale: isHovered ? [1.05, 1.05, 1.05] : [1, 1, 1],
    hoverPosition:
      isHovered && animation.hover === 'lift'
        ? [position[0], position[1] + 0.1, position[2]]
        : position,
    glowOpacity: isHovered ? glowIntensity : 0,
    config: { tension: 300, friction: 30 },
  });

  // Material configuration based on variant
  const cardMaterial = useMemo(() => {
    switch (variant) {
      case 'glass':
        return (
          <meshPhysicalMaterial
            transmission={0.9}
            thickness={depth}
            roughness={0.1}
            transparent
            opacity={0.8}
            color={backgroundColor}
            envMapIntensity={1}
          />
        );

      case 'holographic':
        return (
          <holographicMaterial color={backgroundColor} fresnelAmount={2.0} fresnelOpacity={0.8} />
        );

      case 'aurora':
        return (
          <meshStandardMaterial
            color={backgroundColor}
            transparent
            opacity={0.9}
            emissive="#4f46e5"
            emissiveIntensity={isHovered ? 0.3 : 0.1}
          />
        );

      case 'meteors':
        return <meshStandardMaterial color={backgroundColor} roughness={0.3} metalness={0.1} />;

      default:
        return <meshStandardMaterial color={backgroundColor} transparent opacity={0.95} />;
    }
  }, [variant, backgroundColor, depth, isHovered]);

  // Gaze following behavior
  useFrame((state) => {
    if (!groupRef.current) return;

    // Entrance animation trigger
    if (!isVisible) {
      setIsVisible(true);
    }

    // Billboarding - always face the camera
    if (billboarding) {
      groupRef.current.lookAt(camera.position);
    }

    // Gaze following - orient towards user's head
    if (followGaze && player.head) {
      const direction = new THREE.Vector3()
        .subVectors(player.head.position, groupRef.current.position)
        .normalize();

      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        direction
      );

      groupRef.current.quaternion.slerp(quaternion, 0.05);
    }

    // Magnetic attraction to hands
    if (magneticToHands && hands.length > 0 && !isGrabbed) {
      const closestHand = hands.reduce(
        (closest, hand) => {
          const distance = hand.position.distanceTo(groupRef.current!.position);
          return distance < closest.distance ? { hand, distance } : closest;
        },
        { hand: hands[0], distance: Number.POSITIVE_INFINITY }
      );

      if (closestHand.distance < handholdDistance) {
        const magneticForce = new THREE.Vector3()
          .subVectors(closestHand.hand.position, groupRef.current.position)
          .multiplyScalar(0.02);

        groupRef.current.position.add(magneticForce);
      }
    }

    // Idle animations
    if (animation.idle === 'float' && !isGrabbed) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.02;
    }

    if (animation.idle === 'rotate' && !isGrabbed) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  // Hand tracking for grab interactions
  useEffect(() => {
    if (!hands.length || !interactive) return;

    const checkHandGrab = () => {
      hands.forEach((hand) => {
        const distance = hand.position.distanceTo(groupRef.current!.position);

        // Simple pinch detection for grab
        if (distance < 0.3 && hand.inputSource?.gamepad?.buttons[0]?.pressed) {
          if (!isGrabbed) {
            setIsGrabbed(true);
            onGrab?.({} as THREE.Event);
          }
        } else if (isGrabbed) {
          setIsGrabbed(false);
          onRelease?.({} as THREE.Event);
        }
      });
    };

    const interval = setInterval(checkHandGrab, 16); // ~60fps
    return () => clearInterval(interval);
  }, [hands, interactive, isGrabbed, onGrab, onRelease]);

  return (
    <animated.group
      ref={groupRef}
      position={cardPosition as any}
      rotation={rotation}
      scale={cardScale as any}
    >
      {/* Main Card Geometry */}
      <animated.group scale={hoverScale as any}>
        <RoundedBox
          ref={cardRef}
          args={[width, height, depth]}
          radius={0.1}
          smoothness={8}
          {...(interactive && {
            onPointerEnter,
            onPointerLeave,
            onPointerDown,
            onPointerUp,
          })}
        >
          {cardMaterial}
        </RoundedBox>

        {/* Glow Effect */}
        {glowIntensity > 0 && (
          <animated.mesh>
            <planeGeometry args={[width * 1.2, height * 1.2]} />
            <meshBasicMaterial
              color="#4f46e5"
              transparent
              opacity={glowOpacity as any}
              blending={THREE.AdditiveBlending}
            />
          </animated.mesh>
        )}

        {/* Shadow */}
        <mesh position={[0, -height / 2 - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width * 0.8, depth * 0.8]} />
          <meshBasicMaterial color="#000000" transparent opacity={shadowIntensity} />
        </mesh>
      </animated.group>

      {/* 3D Text Content */}
      {children && (
        <group position={[0, 0, depth / 2 + 0.01]}>
          <SpatialText position={[0, 0, 0]} maxWidth={width * 0.8} textAlign="center">
            {children}
          </SpatialText>
        </group>
      )}

      {/* HTML Content Overlay */}
      {htmlContent && (
        <Html
          position={[0, 0, depth / 2 + 0.02]}
          transform
          distanceFactor={10}
          style={{
            width: `${width * 100}px`,
            height: `${height * 100}px`,
            pointerEvents: interactive ? 'auto' : 'none',
          }}
        >
          <div className="spatial-html-content">{htmlContent}</div>
        </Html>
      )}

      {/* Interaction Zones */}
      {interactive && (
        <mesh visible={false}>
          <boxGeometry args={[width * 1.1, height * 1.1, depth * 2]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
    </animated.group>
  );
};

// Helper component for 3D text rendering
const SpatialText: React.FC<{
  children: React.ReactNode;
  position?: [number, number, number];
  maxWidth?: number;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
}> = ({
  children,
  position = [0, 0, 0],
  maxWidth = 2,
  fontSize = 0.1,
  textAlign = 'center',
  color = '#000000',
}) => {
  const textString = React.Children.toArray(children).join(' ');

  return (
    <Text
      position={position}
      fontSize={fontSize}
      maxWidth={maxWidth}
      lineHeight={1.2}
      letterSpacing={0.02}
      textAlign={textAlign}
      font="/fonts/inter-medium.woff"
      anchorX={textAlign}
      anchorY="middle"
      color={color}
    >
      {textString}
    </Text>
  );
};

export default SpatialCard;
