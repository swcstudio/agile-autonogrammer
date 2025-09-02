/**
 * Payment Integration Module
 * Unified payment processing for crypto, fiat, NFTs, swaps, and bridges
 */

// Core exports
export { PaymentManager } from './manager.ts';
export { PaymentTerminal } from './terminal';

// Web2 Provider exports
export { StripeProvider } from './providers/stripe';
export { PayPalProvider } from './providers/paypal';
export { ApplePayProvider } from './providers/apple-pay';
export { GooglePayProvider } from './providers/google-pay';

// Web3 Provider exports (existing)
export { WalletConnectProvider } from './providers/walletconnect.ts';
export { HyperswitchProvider } from './providers/hyperswitch.ts';
export { OneInchProvider } from './providers/oneinch.ts';
export { SymbiosisProvider } from './providers/symbiosis.ts';

// Hook exports
export {
  usePaymentManager,
  useWallet,
  usePayment,
  useSwap,
  useBridge,
  useTokens,
  useChains,
  useTransactions,
} from './hooks.ts';

// Utility exports
export {
  validatePaymentRequest,
  validateSwapRequest,
  validateBridgeRequest,
  isValidAddress,
  isValidChain,
  getChainConfig,
  formatAmount,
  parseAmount,
  formatCurrency,
  formatAddress,
  formatTransactionHash,
  formatTimeAgo,
  calculateGasCost,
  estimateGasLimit,
  calculatePriceImpact,
  findTokenByAddress,
  findTokenBySymbol,
  sortTokensByBalance,
  getExplorerUrl,
  getAddressExplorerUrl,
  getTransactionStatus,
  getReadableError,
  isRetryableError,
  createMockPaymentRequest,
  createMockSwapRequest,
  createMockBridgeRequest,
} from './utils.ts';

// Configuration exports
export {
  DEFAULT_PAYMENT_CONFIG,
  SUPPORTED_CHAINS,
  COMMON_TOKENS,
  API_ENDPOINTS,
  GAS_LIMITS,
  DEFAULT_SLIPPAGE,
  MAX_SLIPPAGE,
  DEFAULT_DEADLINE,
  PAYMENT_ERRORS,
} from './config.ts';

// Type exports
export type {
  PaymentProvider,
  PaymentMethod,
  SupportedChain,
  ChainConfig,
  WalletInfo,
  PaymentRequest,
  PaymentResponse,
  SwapRequest,
  SwapResponse,
  BridgeRequest,
  BridgeResponse,
  NFTPaymentRequest,
  PaymentConfig,
  PaymentState,
  Transaction,
  PaymentHooks,
  PaymentProviderInterface,
  SwapProviderInterface,
  BridgeProviderInterface,
  TokenInfo,
  PaymentManagerOptions,
  SwapRoute,
} from './types.ts';

// Default configuration helper
export function createPaymentConfig(overrides?: Partial<PaymentConfig>): PaymentConfig {
  return {
    ...DEFAULT_PAYMENT_CONFIG,
    ...overrides,
  };
}

// Quick setup helpers
export function createWalletConnectConfig(projectId: string) {
  return {
    ...DEFAULT_PAYMENT_CONFIG.walletConnect,
    projectId,
  };
}

export function createHyperswitchConfig(
  apiKey: string,
  environment: 'sandbox' | 'production' = 'sandbox'
) {
  return {
    ...DEFAULT_PAYMENT_CONFIG.hyperswitch,
    apiKey,
    environment,
  };
}

export function createOneInchConfig(apiKey: string) {
  return {
    ...DEFAULT_PAYMENT_CONFIG.oneInch,
    apiKey,
  };
}

export function createSymbiosisConfig(customApiUrl?: string) {
  return {
    ...DEFAULT_PAYMENT_CONFIG.symbiosis,
    ...(customApiUrl && { apiUrl: customApiUrl }),
  };
}

// Payment manager factory
export function createPaymentManager(
  config: Partial<PaymentConfig>,
  hooks?: PaymentHooks
): PaymentManager {
  return new PaymentManager({
    config: createPaymentConfig(config),
    hooks,
    autoConnect: false,
  });
}

// Payment terminal factory
export function createPaymentTerminal(
  config: Partial<PaymentConfig>,
  options?: any
): PaymentTerminal {
  return new PaymentTerminal({
    config: createPaymentConfig(config),
    ...options
  });
}

// Web2 payment configuration helpers
export function createStripeConfig(config: {
  publishableKey: string;
  secretKey?: string;
  webhookSecret?: string;
  environment?: 'test' | 'live';
}) {
  return {
    stripe: {
      environment: 'test' as const,
      ...config
    }
  };
}

export function createPayPalConfig(config: {
  clientId: string;
  clientSecret?: string;
  environment?: 'sandbox' | 'production';
  currency?: string;
}) {
  return {
    paypal: {
      environment: 'sandbox' as const,
      currency: 'USD',
      ...config
    }
  };
}

export function createApplePayConfig(config: {
  merchantId: string;
  countryCode?: string;
  currencyCode?: string;
  supportedNetworks?: string[];
  merchantCapabilities?: string[];
}) {
  return {
    applePay: {
      countryCode: 'US',
      currencyCode: 'USD',
      supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
      merchantCapabilities: ['supports3DS', 'supportsCredit', 'supportsDebit'],
      ...config
    }
  };
}

export function createGooglePayConfig(config: {
  merchantId: string;
  merchantName: string;
  environment?: 'TEST' | 'PRODUCTION';
  allowedCardNetworks?: string[];
  allowedCardAuthMethods?: string[];
}) {
  return {
    googlePay: {
      environment: 'TEST' as const,
      allowedCardNetworks: ['AMEX', 'DISCOVER', 'JCB', 'MASTERCARD', 'VISA'],
      allowedCardAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
      ...config
    }
  };
}

// Quick start helper for Web3 payments
export function quickStartPayments({
  walletConnectProjectId,
  hyperswitchApiKey,
  oneInchApiKey,
  environment = 'sandbox',
  hooks,
}: {
  walletConnectProjectId: string;
  hyperswitchApiKey?: string;
  oneInchApiKey?: string;
  environment?: 'sandbox' | 'production';
  hooks?: PaymentHooks;
}): PaymentManager {
  const config = createPaymentConfig({
    walletConnect: createWalletConnectConfig(walletConnectProjectId),
    ...(hyperswitchApiKey && {
      hyperswitch: createHyperswitchConfig(hyperswitchApiKey, environment),
    }),
    ...(oneInchApiKey && {
      oneInch: createOneInchConfig(oneInchApiKey),
    }),
    symbiosis: createSymbiosisConfig(),
  });

  return new PaymentManager({
    config,
    hooks,
    autoConnect: true,
  });
}

// Quick start helper for comprehensive Web2 + Web3 payments
export function quickStartUniversalPayments({
  // Web2 configs
  stripePublishableKey,
  paypalClientId,
  applePayMerchantId,
  googlePayMerchantId,
  googlePayMerchantName,
  // Web3 configs
  walletConnectProjectId,
  hyperswitchApiKey,
  oneInchApiKey,
  environment = 'sandbox',
  hooks,
}: {
  // Web2
  stripePublishableKey?: string;
  paypalClientId?: string;
  applePayMerchantId?: string;
  googlePayMerchantId?: string;
  googlePayMerchantName?: string;
  // Web3
  walletConnectProjectId?: string;
  hyperswitchApiKey?: string;
  oneInchApiKey?: string;
  environment?: 'sandbox' | 'production';
  hooks?: PaymentHooks;
}): PaymentTerminal {
  const config: any = {};
  
  // Add Web2 providers
  if (stripePublishableKey) {
    Object.assign(config, createStripeConfig({
      publishableKey: stripePublishableKey,
      environment: environment === 'production' ? 'live' : 'test'
    }));
  }
  
  if (paypalClientId) {
    Object.assign(config, createPayPalConfig({
      clientId: paypalClientId,
      environment: environment === 'production' ? 'production' : 'sandbox'
    }));
  }
  
  if (applePayMerchantId) {
    Object.assign(config, createApplePayConfig({
      merchantId: applePayMerchantId
    }));
  }
  
  if (googlePayMerchantId && googlePayMerchantName) {
    Object.assign(config, createGooglePayConfig({
      merchantId: googlePayMerchantId,
      merchantName: googlePayMerchantName,
      environment: environment === 'production' ? 'PRODUCTION' : 'TEST'
    }));
  }
  
  // Add Web3 providers
  if (walletConnectProjectId) {
    config.walletConnect = createWalletConnectConfig(walletConnectProjectId);
  }
  
  if (hyperswitchApiKey) {
    config.hyperswitch = createHyperswitchConfig(hyperswitchApiKey, environment);
  }
  
  if (oneInchApiKey) {
    config.oneInch = createOneInchConfig(oneInchApiKey);
  }
  
  config.symbiosis = createSymbiosisConfig();
  
  return new PaymentTerminal({
    config: createPaymentConfig(config),
    enableFraudDetection: true,
    enableAnalytics: true,
    enableAutoRouting: true,
    debugMode: environment !== 'production'
  });
}

// Version info
export const KATALYST_PAYMENTS_VERSION = '2.0.0';

// Payment method constants
export const PaymentMethods = {
  // Web2 Methods
  CARD: 'card' as const,
  BANK_TRANSFER: 'bank_transfer' as const,
  DIGITAL_WALLET: 'digital_wallet' as const,
  ACH: 'ach' as const,
  SEPA: 'sepa' as const,
  WIRE: 'wire' as const,
  BNPL: 'bnpl' as const,
  SUBSCRIPTION: 'subscription' as const,
  
  // Web3 Methods
  CRYPTO: 'crypto' as const,
  NFT: 'nft' as const,
  SWAP: 'swap' as const,
  BRIDGE: 'bridge' as const,
  DEFI_STAKE: 'defi_stake' as const,
  DEFI_YIELD: 'defi_yield' as const
};

export const PaymentProviders = {
  // Web2 Providers
  STRIPE: 'stripe' as const,
  PAYPAL: 'paypal' as const,
  APPLE_PAY: 'applepay' as const,
  GOOGLE_PAY: 'googlepay' as const,
  SQUARE: 'square' as const,
  BRAINTREE: 'braintree' as const,
  ADYEN: 'adyen' as const,
  KLARNA: 'klarna' as const,
  AFFIRM: 'affirm' as const,
  AFTERPAY: 'afterpay' as const,
  
  // Web3 Providers
  WALLET_CONNECT: 'walletconnect' as const,
  HYPERSWITCH: 'hyperswitch' as const,
  ONEINCH: 'oneinch' as const,
  SYMBIOSIS: 'symbiosis' as const,
  METAMASK: 'metamask' as const,
  COINBASE: 'coinbase' as const
};

// Helper functions for common payment scenarios
export const PaymentHelpers = {
  /**
   * Create a simple card payment request
   */
  createCardPayment: (amount: string, currency: string, description?: string) => ({
    id: `payment_${Date.now()}`,
    amount,
    currency,
    method: PaymentMethods.CARD,
    description
  }),
  
  /**
   * Create a digital wallet payment request
   */
  createDigitalWalletPayment: (amount: string, currency: string, provider: string) => ({
    id: `payment_${Date.now()}`,
    amount,
    currency,
    method: PaymentMethods.DIGITAL_WALLET,
    provider
  }),
  
  /**
   * Create a crypto payment request
   */
  createCryptoPayment: (amount: string, currency: string, chain?: string) => ({
    id: `payment_${Date.now()}`,
    amount,
    currency,
    method: PaymentMethods.CRYPTO,
    chain
  }),
  
  /**
   * Create a subscription payment request
   */
  createSubscriptionPayment: (
    amount: string,
    currency: string,
    interval: 'day' | 'week' | 'month' | 'year',
    intervalCount = 1
  ) => ({
    id: `subscription_${Date.now()}`,
    amount,
    currency,
    method: PaymentMethods.SUBSCRIPTION,
    subscription: {
      interval,
      intervalCount
    }
  })
};

// Documentation links
export const DOCUMENTATION = {
  overview: 'https://docs.katalyst.dev/payments',
  walletConnect: 'https://docs.katalyst.dev/payments/walletconnect',
  hyperswitch: 'https://docs.katalyst.dev/payments/hyperswitch',
  oneInch: 'https://docs.katalyst.dev/payments/oneinch',
  symbiosis: 'https://docs.katalyst.dev/payments/symbiosis',
  examples: 'https://docs.katalyst.dev/payments/examples',
  troubleshooting: 'https://docs.katalyst.dev/payments/troubleshooting',
};

// Development helpers
export const DEV_TOOLS = {
  createMockPaymentRequest,
  createMockSwapRequest,
  createMockBridgeRequest,
  SUPPORTED_CHAINS,
  COMMON_TOKENS,
  PAYMENT_ERRORS,
};

// Main default export with comprehensive payment terminal
export default {
  PaymentTerminal,
  PaymentManager,
  createPaymentTerminal,
  createPaymentManager,
  quickStartUniversalPayments,
  quickStartPayments,
  PaymentMethods,
  PaymentProviders,
  PaymentHelpers,
  VERSION: KATALYST_PAYMENTS_VERSION
};
