/**
 * Aceternity Design System Showcase
 *
 * Example implementations of the enhanced design system components
 */

import { motion } from 'framer-motion';
import React from 'react';
import {
  AceternityButton,
  AceternityButtonPresets,
  AceternityCard,
  AceternityCardPresets,
  animationPresets,
  getStaggerDelay,
  useCountUp,
  useInView,
  useParallax,
  useTypewriter,
} from '../index';

export const HeroSection: React.FC = () => {
  const { y } = useParallax(50);
  const { displayedText } = useTypewriter('Welcome to the Future of Design', 80, 500);

  return (
    <motion.section className="min-h-screen flex items-center justify-center" style={{ y }}>
      <AceternityCard
        variant="aurora"
        gradient={{
          from: '#8b5cf6',
          via: '#7c3aed',
          to: '#6d28d9',
        }}
        className="max-w-4xl mx-auto p-12 text-center"
        animation={{
          entrance: 'fade',
          hover: 'tilt',
          duration: 0.8,
        }}
      >
        <h1 className="text-6xl font-bold text-white mb-4">{displayedText}</h1>
        <p className="text-xl text-white/80 mb-8">
          Experience the perfect blend of Ant Design Pro and Aceternity UI
        </p>
        <div className="flex gap-4 justify-center">
          <AceternityButton
            variant="shimmer"
            size="large"
            gradient={{ from: '#fff', to: '#e0e7ff' }}
            className="text-purple-900"
          >
            Get Started
          </AceternityButton>
          <AceternityButton variant="border-magic" size="large" type="ghost" className="text-white">
            Learn More
          </AceternityButton>
        </div>
      </AceternityCard>
    </motion.section>
  );
};

export const FeatureCards: React.FC = () => {
  const features = [
    {
      title: 'Lightning Fast',
      description: 'GPU-accelerated animations for smooth 60fps performance',
      icon: '⚡',
      variant: 'glare' as const,
    },
    {
      title: 'Fully Accessible',
      description: 'WCAG compliant with reduced motion support',
      icon: '♿',
      variant: 'glass' as const,
    },
    {
      title: 'Cross-Framework',
      description: 'Works seamlessly in Next.js, Remix, and Core React',
      icon: '🔧',
      variant: 'holographic' as const,
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.h2 className="text-4xl font-bold text-center mb-12" {...animationPresets.slideUp}>
          Why Choose Katalyst?
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial="initial"
              animate="animate"
              variants={animationPresets.slideUp}
              transition={{
                delay: getStaggerDelay(index),
                duration: 0.5,
              }}
            >
              <AceternityCard
                variant={feature.variant}
                className="h-full"
                animation={{
                  hover: 'lift',
                  entrance: 'scale',
                }}
              >
                <div className="text-center p-8">
                  <div className="text-6xl mb-4">{feature.icon}</div>
                  <h3 className="text-2xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                </div>
              </AceternityCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const StatsSection: React.FC = () => {
  const stats = [
    { label: 'Components', value: 50 },
    { label: 'Animations', value: 30 },
    { label: 'Happy Users', value: 1000 },
    { label: 'GitHub Stars', value: 500 },
  ];

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const { count, ref } = useCountUp(stat.value, 2000);

            return (
              <div key={stat.label} ref={ref}>
                <AceternityCard
                  variant="meteors"
                  className="text-center p-6"
                  animation={{
                    entrance: 'fade',
                    duration: 0.5 + index * 0.1,
                  }}
                >
                  <div className="text-4xl font-bold text-primary mb-2">{count}+</div>
                  <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
                </AceternityCard>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const CTASection: React.FC = () => {
  const { ref, isInView } = useInView({ threshold: 0.3 });

  return (
    <section ref={ref} className="py-20 px-4">
      <motion.div
        className="max-w-4xl mx-auto"
        animate={isInView ? 'animate' : 'initial'}
        variants={animationPresets.scale}
      >
        <AceternityCard
          variant="3d"
          gradient={{
            from: '#3b82f6',
            via: '#8b5cf6',
            to: '#ec4899',
          }}
          className="text-center p-12"
          effects={{
            particles: true,
            noise: true,
          }}
        >
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your UI?</h2>
          <p className="text-xl text-white/80 mb-8">
            Join thousands of developers building beautiful, accessible interfaces
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <AceternityButton
              {...AceternityButtonPresets.cta}
              size="large"
              className="bg-white text-purple-900"
            >
              Start Building
            </AceternityButton>
            <AceternityButton
              variant="aurora"
              size="large"
              particles={true}
              className="text-white border-white"
            >
              View Documentation
            </AceternityButton>
          </div>
        </AceternityCard>
      </motion.div>
    </section>
  );
};

export const InteractiveDemo: React.FC = () => {
  const [selectedVariant, setSelectedVariant] = React.useState<
    'glare' | 'spotlight' | 'aurora' | 'holographic' | '3d'
  >('glare');

  const variants = ['glare', 'spotlight', 'aurora', 'holographic', '3d'] as const;

  return (
    <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12">Try It Yourself</h2>

        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {variants.map((variant) => (
            <AceternityButton
              key={variant}
              variant={selectedVariant === variant ? 'glow' : 'default'}
              onClick={() => setSelectedVariant(variant)}
              size="small"
            >
              {variant.charAt(0).toUpperCase() + variant.slice(1)}
            </AceternityButton>
          ))}
        </div>

        <div className="max-w-md mx-auto">
          <AceternityCard
            variant={selectedVariant}
            gradient={{
              from: '#3b82f6',
              to: '#8b5cf6',
            }}
            animation={{
              hover: selectedVariant === '3d' ? 'tilt' : 'lift',
              entrance: 'scale',
            }}
            effects={{
              particles: selectedVariant === 'aurora',
              grid: selectedVariant === '3d',
            }}
          >
            <div className="p-8 text-center">
              <h3 className="text-2xl font-semibold mb-4">
                {selectedVariant.charAt(0).toUpperCase() + selectedVariant.slice(1)} Card
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Hover over this card to see the {selectedVariant} effect in action. Each variant
                provides a unique visual experience.
              </p>
              <AceternityButton
                variant="shimmer"
                gradient={{ from: '#3b82f6', to: '#8b5cf6' }}
                className="w-full"
              >
                Interact With Me
              </AceternityButton>
            </div>
          </AceternityCard>
        </div>
      </div>
    </section>
  );
};

// Full showcase page
export const AceternityShowcase: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <HeroSection />
      <FeatureCards />
      <StatsSection />
      <InteractiveDemo />
      <CTASection />
    </div>
  );
};
