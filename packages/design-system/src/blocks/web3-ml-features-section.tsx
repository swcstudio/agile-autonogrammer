import { cn } from '@/lib/utils';
import { IconBrain, IconShield, IconNetwork, IconChartBar } from '@tabler/icons-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import type React from 'react';
import { useEffect, useRef } from 'react';

export function Web3MLFeaturesSection() {
  const features = [
    {
      title: 'Intelligent Smart Contracts',
      description: 'Self-executing contracts with ML-powered decision making, enabling autonomous enterprise operations with unprecedented efficiency.',
      skeleton: <IntelligentContractsSkeleton />,
      className: 'col-span-1 lg:col-span-4 border-b lg:border-r dark:border-neutral-800',
    },
    {
      title: 'Decentralized AI Networks',
      description: 'Distributed machine learning across blockchain nodes, providing secure, scalable AI processing for enterprise applications.',
      skeleton: <DecentralizedAISkeleton />,
      className: 'border-b col-span-1 lg:col-span-2 dark:border-neutral-800',
    },
    {
      title: 'Blockchain Analytics Engine',
      description: 'Advanced analytics that transform raw blockchain data into actionable business intelligence for Australian enterprises.',
      skeleton: <BlockchainAnalyticsSkeleton />,
      className: 'col-span-1 lg:col-span-3 lg:border-r dark:border-neutral-800',
    },
    {
      title: 'Enterprise Security Layer',
      description: 'Military-grade cryptographic protocols combined with AI-powered threat detection, ensuring maximum security for mission-critical operations.',
      skeleton: <SecurityLayerSkeleton />,
      className: 'col-span-1 lg:col-span-3 border-b lg:border-none',
    },
  ];

  return (
    <div className="relative z-20 mx-auto max-w-7xl py-10 lg:py-40">
      <div className="px-8">
        <h4 className="mx-auto max-w-5xl text-center text-3xl font-medium tracking-tight text-black lg:text-5xl lg:leading-tight dark:text-white">
          Powering Australia's Web3 ML Revolution
        </h4>

        <p className="mx-auto my-4 max-w-2xl text-center text-sm font-normal text-neutral-500 lg:text-base dark:text-neutral-300">
          From intelligent smart contracts to decentralized AI networks, our Web3 ML laboratory 
          creates the backbone of Australia's next-generation enterprise systems.
        </p>
      </div>

      <div className="relative">
        <div className="mt-12 grid grid-cols-1 rounded-md lg:grid-cols-6 xl:border dark:border-neutral-800">
          {features.map((feature) => (
            <FeatureCard key={feature.title} className={feature.className}>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
              <div className="h-full w-full">{feature.skeleton}</div>
            </FeatureCard>
          ))}
        </div>
      </div>
    </div>
  );
}

const FeatureCard = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return <div className={cn(`relative overflow-hidden p-4 sm:p-8`, className)}>{children}</div>;
};

const FeatureTitle = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p className="mx-auto max-w-5xl text-left text-xl tracking-tight text-black md:text-2xl md:leading-snug dark:text-white">
      {children}
    </p>
  );
};

const FeatureDescription = ({ children }: { children?: React.ReactNode }) => {
  return (
    <p
      className={cn(
        'mx-auto max-w-4xl text-left text-sm md:text-base',
        'text-center font-normal text-neutral-500 dark:text-neutral-300',
        'mx-0 my-2 max-w-sm text-left md:text-sm'
      )}
    >
      {children}
    </p>
  );
};

export const IntelligentContractsSkeleton = () => {
  return (
    <div className="relative flex h-full gap-10 px-2 py-8">
      <div className="group mx-auto h-full w-full bg-gradient-to-br from-blue-50 to-indigo-100 p-6 shadow-2xl dark:from-blue-900/20 dark:to-indigo-900/20 dark:bg-neutral-900">
        <div className="flex h-full w-full flex-1 flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <IconBrain className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="h-4 w-24 rounded bg-blue-200 dark:bg-blue-800" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-blue-100 dark:bg-blue-900" />
            <div className="h-3 w-3/4 rounded bg-blue-100 dark:bg-blue-900" />
            <div className="h-3 w-5/6 rounded bg-blue-100 dark:bg-blue-900" />
          </div>
          <div className="mt-4 flex space-x-2">
            <div className="h-8 w-20 rounded-full bg-green-200 dark:bg-green-800" />
            <div className="h-8 w-16 rounded-full bg-yellow-200 dark:bg-yellow-800" />
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-60 w-full bg-gradient-to-t from-white via-white to-transparent dark:from-black dark:via-black" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-60 w-full bg-gradient-to-b from-white via-transparent to-transparent dark:from-black" />
    </div>
  );
};

export const DecentralizedAISkeleton = () => {
  const nodes = [
    { x: 20, y: 30, active: true },
    { x: 80, y: 20, active: false },
    { x: 60, y: 60, active: true },
    { x: 30, y: 80, active: true },
    { x: 90, y: 70, active: false },
  ];

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden p-8">
      <div className="relative h-40 w-full">
        <svg className="h-full w-full" viewBox="0 0 100 100">
          {/* Network connections */}
          {nodes.map((node, i) =>
            nodes.slice(i + 1).map((otherNode, j) => (
              <line
                key={`${i}-${j}`}
                x1={node.x}
                y1={node.y}
                x2={otherNode.x}
                y2={otherNode.y}
                stroke="url(#networkGradient)"
                strokeWidth="0.5"
                opacity="0.4"
              />
            ))
          )}
          
          {/* Network nodes */}
          {nodes.map((node, i) => (
            <motion.circle
              key={i}
              cx={node.x}
              cy={node.y}
              r={node.active ? "3" : "2"}
              fill={node.active ? "#3B82F6" : "#6B7280"}
              animate={{
                scale: node.active ? [1, 1.2, 1] : 1,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
              }}
            />
          ))}
          
          <defs>
            <linearGradient id="networkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.3} />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      <div className="mt-4 flex space-x-2">
        <IconNetwork className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-gray-600 dark:text-gray-400">Distributed ML Processing</div>
      </div>
    </div>
  );
};

export const BlockchainAnalyticsSkeleton = () => {
  return (
    <div className="relative flex h-full flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex items-center space-x-2">
          <IconChartBar className="h-6 w-6 text-green-600 dark:text-green-400" />
          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Live Analytics</div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">Transaction Volume</span>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-20 rounded-full bg-green-200 dark:bg-green-800">
                <motion.div
                  className="h-full rounded-full bg-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: "75%" }}
                  transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                />
              </div>
              <span className="text-xs font-mono text-green-600 dark:text-green-400">75%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">Network Health</span>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-20 rounded-full bg-blue-200 dark:bg-blue-800">
                <motion.div
                  className="h-full rounded-full bg-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: "92%" }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                />
              </div>
              <span className="text-xs font-mono text-blue-600 dark:text-blue-400">92%</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-400">AI Accuracy</span>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-20 rounded-full bg-purple-200 dark:bg-purple-800">
                <motion.div
                  className="h-full rounded-full bg-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: "98%" }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse" }}
                />
              </div>
              <span className="text-xs font-mono text-purple-600 dark:text-purple-400">98%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SecurityLayerSkeleton = () => {
  return (
    <div className="relative flex h-full flex-col items-center justify-center p-8">
      <div className="relative">
        <motion.div
          className="h-32 w-32 rounded-full border-4 border-green-500/30"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <motion.div
            className="absolute inset-4 rounded-full border-2 border-blue-500/40"
            animate={{
              rotate: -360,
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <div className="flex h-full w-full items-center justify-center">
              <IconShield className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </motion.div>
        </motion.div>
      </div>
      
      <div className="mt-4 text-center">
        <div className="text-sm font-medium text-green-600 dark:text-green-400">Security Status</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">Military-Grade Encryption Active</div>
      </div>
    </div>
  );
};