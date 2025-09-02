/**
 * Payment Integration Configuration
 * Centralized configuration for all payment providers and chains
 */

import type { ChainConfig, PaymentConfig, SupportedChain } from './types.ts';

export const SUPPORTED_CHAINS: Record<SupportedChain, ChainConfig> = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
  },
  bsc: {
    chainId: 56,
    name: 'BNB Smart Chain',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    blockExplorer: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    blockExplorer: 'https://optimistic.etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  avalanche: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    blockExplorer: 'https://snowtrace.io',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
  },
  solana: {
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    name: 'Solana Mainnet',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    blockExplorer: 'https://explorer.solana.com',
    nativeCurrency: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
    },
  },
  bitcoin: {
    chainId: 'bip122:000000000019d6689c085ae165831e93',
    name: 'Bitcoin',
    rpcUrl: 'https://blockstream.info/api',
    blockExplorer: 'https://blockstream.info',
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 8,
    },
  },
  cosmos: {
    chainId: 'cosmos:cosmoshub-4',
    name: 'Cosmos Hub',
    rpcUrl: 'https://cosmos-rpc.polkachu.com',
    blockExplorer: 'https://mintscan.io/cosmos',
    nativeCurrency: {
      name: 'Cosmos',
      symbol: 'ATOM',
      decimals: 6,
    },
  },
};

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  walletConnect: {
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    chains: Object.values(SUPPORTED_CHAINS),
    metadata: {
      name: 'Katalyst NFT Marketplace',
      description: 'Advanced NFT marketplace with cross-chain trading capabilities',
      url: 'https://katalyst.dev',
      icons: ['https://katalyst.dev/icon.png'],
    },
  },
  hyperswitch: {
    apiKey: process.env.HYPERSWITCH_API_KEY || '',
    publishableKey: process.env.NEXT_PUBLIC_HYPERSWITCH_PUBLISHABLE_KEY || '',
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    supportedMethods: ['card', 'bank_transfer', 'wallet', 'crypto', 'pay_later'],
  },
  oneInch: {
    apiKey: process.env.ONEINCH_API_KEY || '',
    baseUrl: 'https://api.1inch.dev/swap/v6.0',
    supportedChains: [1, 56, 137, 42161, 10, 43114],
  },
  symbiosis: {
    apiUrl: 'https://api.symbiosis.finance/crosschain/v1',
    supportedChains: ['ethereum', 'bsc', 'polygon', 'avalanche', 'arbitrum'],
  },
};

export const COMMON_TOKENS = {
  ethereum: [
    {
      address: '0xA0b86a33E6441b4a46c9c3d47C36f0Ab6b8C6b9a',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: 'https://tokens.1inch.io/0xa0b86a33e6441b4a46c9c3d47c36f0ab6b8c6b9a.png',
      chainId: 1,
    },
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
      chainId: 1,
    },
    {
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      symbol: 'WBTC',
      name: 'Wrapped BTC',
      decimals: 8,
      logoURI: 'https://tokens.1inch.io/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.png',
      chainId: 1,
    },
  ],
  polygon: [
    {
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: 'https://wallet-asset.matic.network/img/tokens/usdc.svg',
      chainId: 137,
    },
    {
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      logoURI: 'https://wallet-asset.matic.network/img/tokens/usdt.svg',
      chainId: 137,
    },
  ],
  bsc: [
    {
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 18,
      logoURI:
        'https://tokens.pancakeswap.finance/images/0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d.png',
      chainId: 56,
    },
    {
      address: '0x55d398326f99059fF775485246999027B3197955',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 18,
      logoURI:
        'https://tokens.pancakeswap.finance/images/0x55d398326f99059ff775485246999027b3197955.png',
      chainId: 56,
    },
  ],
};

export const API_ENDPOINTS = {
  oneInch: {
    swap: (chainId: number) => `https://api.1inch.dev/swap/v6.0/${chainId}/swap`,
    quote: (chainId: number) => `https://api.1inch.dev/swap/v6.0/${chainId}/quote`,
    tokens: (chainId: number) => `https://api.1inch.dev/swap/v6.0/${chainId}/tokens`,
    protocols: (chainId: number) => `https://api.1inch.dev/swap/v6.0/${chainId}/liquidity-sources`,
  },
  symbiosis: {
    quote: 'https://api.symbiosis.finance/crosschain/v1/quote',
    swap: 'https://api.symbiosis.finance/crosschain/v1/swap',
    chains: 'https://api.symbiosis.finance/crosschain/v1/chains',
    tokens: 'https://api.symbiosis.finance/crosschain/v1/tokens',
  },
  hyperswitch: {
    payments: 'https://api.hyperswitch.io/payments',
    paymentMethods: 'https://api.hyperswitch.io/payment_methods',
    customers: 'https://api.hyperswitch.io/customers',
  },
};

export const GAS_LIMITS = {
  erc20Transfer: 65000,
  erc721Transfer: 85000,
  swap: 300000,
  bridge: 500000,
  nftPurchase: 200000,
};

export const DEFAULT_SLIPPAGE = 0.5; // 0.5%
export const MAX_SLIPPAGE = 10; // 10%
export const DEFAULT_DEADLINE = 20; // 20 minutes

export const PAYMENT_ERRORS = {
  WALLET_NOT_CONNECTED: 'Wallet not connected',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  TRANSACTION_REJECTED: 'Transaction rejected by user',
  NETWORK_ERROR: 'Network error occurred',
  INVALID_PARAMETERS: 'Invalid parameters provided',
  UNSUPPORTED_CHAIN: 'Unsupported chain',
  SLIPPAGE_TOO_HIGH: 'Slippage tolerance exceeded',
  TIMEOUT: 'Transaction timeout',
};
