/**
 * Payment Utilities
 * Helper functions for payment processing, validation, and formatting
 */

import { GAS_LIMITS, MAX_SLIPPAGE, PAYMENT_ERRORS, SUPPORTED_CHAINS } from './config.ts';
import type {
  BridgeRequest,
  ChainConfig,
  PaymentRequest,
  SupportedChain,
  SwapRequest,
  TokenInfo,
  Transaction,
} from './types.ts';

// Validation Utilities

export function validatePaymentRequest(request: PaymentRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!request.id) {
    errors.push('Payment ID is required');
  }

  if (!request.amount || Number.parseFloat(request.amount) <= 0) {
    errors.push('Valid amount is required');
  }

  if (!request.currency) {
    errors.push('Currency is required');
  }

  if (!request.recipient) {
    errors.push('Recipient address is required');
  }

  if (!isValidAddress(request.recipient)) {
    errors.push('Invalid recipient address');
  }

  if (request.chain && !isValidChain(request.chain)) {
    errors.push('Unsupported chain');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateSwapRequest(request: SwapRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!request.fromToken || !isValidAddress(request.fromToken)) {
    errors.push('Valid from token address is required');
  }

  if (!request.toToken || !isValidAddress(request.toToken)) {
    errors.push('Valid to token address is required');
  }

  if (!request.amount || Number.parseFloat(request.amount) <= 0) {
    errors.push('Valid amount is required');
  }

  if (request.slippage < 0 || request.slippage > MAX_SLIPPAGE) {
    errors.push(`Slippage must be between 0 and ${MAX_SLIPPAGE}%`);
  }

  if (!isValidChain(request.chain)) {
    errors.push('Unsupported chain');
  }

  if (request.fromToken.toLowerCase() === request.toToken.toLowerCase()) {
    errors.push('From and to tokens cannot be the same');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateBridgeRequest(request: BridgeRequest): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!isValidChain(request.fromChain)) {
    errors.push('Invalid from chain');
  }

  if (!isValidChain(request.toChain)) {
    errors.push('Invalid to chain');
  }

  if (request.fromChain === request.toChain) {
    errors.push('From and to chains cannot be the same');
  }

  if (!request.token || !isValidAddress(request.token)) {
    errors.push('Valid token address is required');
  }

  if (!request.amount || Number.parseFloat(request.amount) <= 0) {
    errors.push('Valid amount is required');
  }

  if (!request.recipient || !isValidAddress(request.recipient)) {
    errors.push('Valid recipient address is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Address and Chain Validation

export function isValidAddress(address: string): boolean {
  // Ethereum address validation
  if (address.startsWith('0x') && address.length === 42) {
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  }

  // Bitcoin address validation (simplified)
  if (address.length >= 26 && address.length <= 35) {
    return (
      /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[a-z0-9]{39,59}$/.test(address)
    );
  }

  // Solana address validation
  if (address.length >= 32 && address.length <= 44) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  return false;
}

export function isValidChain(chain: string): boolean {
  return chain in SUPPORTED_CHAINS;
}

export function getChainConfig(chain: SupportedChain): ChainConfig | null {
  return SUPPORTED_CHAINS[chain] || null;
}

// Formatting Utilities

export function formatAmount(amount: string | number, decimals = 18, displayDecimals = 6): string {
  const num = typeof amount === 'string' ? Number.parseFloat(amount) : amount;

  if (isNaN(num)) return '0';

  // Convert from wei/smallest unit to token amount
  const tokenAmount = num / Math.pow(10, decimals);

  // Format with appropriate decimal places
  return tokenAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals,
  });
}

export function parseAmount(amount: string, decimals = 18): string {
  const num = Number.parseFloat(amount);
  if (isNaN(num)) return '0';

  // Convert to wei/smallest unit
  const factor = Math.pow(10, decimals);
  return (num * factor).toString();
}

export function formatCurrency(
  amount: string | number,
  currency: string,
  locale = 'en-US'
): string {
  const num = typeof amount === 'string' ? Number.parseFloat(amount) : amount;

  if (isNaN(num)) return `0 ${currency}`;

  if (currency === 'USD' || currency === 'EUR' || currency === 'GBP') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(num);
  }

  return `${num.toLocaleString(locale)} ${currency}`;
}

export function formatAddress(address: string, length = 8): string {
  if (!address) return '';
  if (address.length <= length) return address;

  const start = address.slice(0, length / 2);
  const end = address.slice(-length / 2);
  return `${start}...${end}`;
}

export function formatTransactionHash(hash: string, length = 12): string {
  return formatAddress(hash, length);
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

// Price and Gas Utilities

export function calculateGasCost(
  gasLimit: string | number,
  gasPrice: string | number,
  ethPrice?: number
): {
  eth: string;
  usd?: string;
} {
  const limit = typeof gasLimit === 'string' ? Number.parseFloat(gasLimit) : gasLimit;
  const price = typeof gasPrice === 'string' ? Number.parseFloat(gasPrice) : gasPrice;

  // Gas price is usually in gwei (10^9 wei)
  const gasCostWei = limit * price;
  const gasCostEth = gasCostWei / Math.pow(10, 18);

  const result = {
    eth: gasCostEth.toFixed(6),
    usd: ethPrice ? (gasCostEth * ethPrice).toFixed(2) : undefined,
  };

  return result;
}

export function estimateGasLimit(operation: string): string {
  const gasLimits: Record<string, number> = {
    ...GAS_LIMITS,
    transfer: GAS_LIMITS.erc20Transfer,
    approve: 65000,
    mint: 150000,
    burn: 100000,
  };

  return (gasLimits[operation] || 100000).toString();
}

export function calculatePriceImpact(
  inputAmount: string,
  outputAmount: string,
  marketPrice?: string
): string {
  if (!marketPrice) return '0';

  const input = Number.parseFloat(inputAmount);
  const output = Number.parseFloat(outputAmount);
  const market = Number.parseFloat(marketPrice);

  const executionPrice = input / output;
  const impact = Math.abs((executionPrice - market) / market) * 100;

  return impact.toFixed(3);
}

// Token Utilities

export function findTokenByAddress(tokens: TokenInfo[], address: string): TokenInfo | null {
  return tokens.find((token) => token.address.toLowerCase() === address.toLowerCase()) || null;
}

export function findTokenBySymbol(tokens: TokenInfo[], symbol: string): TokenInfo | null {
  return tokens.find((token) => token.symbol.toLowerCase() === symbol.toLowerCase()) || null;
}

export function sortTokensByBalance(
  tokens: TokenInfo[],
  balances: Record<string, string>
): TokenInfo[] {
  return [...tokens].sort((a, b) => {
    const balanceA = Number.parseFloat(balances[a.address] || '0');
    const balanceB = Number.parseFloat(balances[b.address] || '0');
    return balanceB - balanceA;
  });
}

// Transaction Utilities

export function getExplorerUrl(txHash: string, chain: SupportedChain): string {
  const chainConfig = getChainConfig(chain);
  if (!chainConfig) return '';

  return `${chainConfig.blockExplorer}/tx/${txHash}`;
}

export function getAddressExplorerUrl(address: string, chain: SupportedChain): string {
  const chainConfig = getChainConfig(chain);
  if (!chainConfig) return '';

  return `${chainConfig.blockExplorer}/address/${address}`;
}

export function getTransactionStatus(transaction: Transaction): {
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  displayText: string;
} {
  // Mock implementation - in production, this would check blockchain status
  const now = Date.now();
  const age = now - transaction.timestamp;

  // Simulate confirmation time
  const confirmations = Math.floor(age / 15000); // 15 seconds per confirmation

  let status: 'pending' | 'confirmed' | 'failed' = transaction.status;
  let displayText = status.charAt(0).toUpperCase() + status.slice(1);

  if (status === 'pending' && confirmations >= 12) {
    status = 'confirmed';
    displayText = 'Confirmed';
  }

  return {
    status,
    confirmations: Math.min(confirmations, 12),
    displayText,
  };
}

// Error Handling Utilities

export function getReadableError(error: string): string {
  const errorMap: Record<string, string> = {
    [PAYMENT_ERRORS.WALLET_NOT_CONNECTED]: 'Please connect your wallet first',
    [PAYMENT_ERRORS.INSUFFICIENT_BALANCE]: 'Insufficient balance for this transaction',
    [PAYMENT_ERRORS.TRANSACTION_REJECTED]: 'Transaction was rejected by user',
    [PAYMENT_ERRORS.NETWORK_ERROR]: 'Network error occurred, please try again',
    [PAYMENT_ERRORS.INVALID_PARAMETERS]: 'Invalid transaction parameters',
    [PAYMENT_ERRORS.UNSUPPORTED_CHAIN]: 'This chain is not supported',
    [PAYMENT_ERRORS.SLIPPAGE_TOO_HIGH]: 'Price slippage too high, try increasing tolerance',
    [PAYMENT_ERRORS.TIMEOUT]: 'Transaction timed out, please try again',
  };

  return errorMap[error] || error;
}

export function isRetryableError(error: string): boolean {
  const retryableErrors = [PAYMENT_ERRORS.NETWORK_ERROR, PAYMENT_ERRORS.TIMEOUT];

  return retryableErrors.includes(error);
}

// Development Utilities

export function createMockPaymentRequest(overrides?: Partial<PaymentRequest>): PaymentRequest {
  return {
    id: `payment-${Date.now()}`,
    amount: '1.0',
    currency: 'ETH',
    recipient: '0x742d35Cc6342C4532CA3C632e4c5ACb5b9ADA5f0',
    method: 'crypto',
    provider: 'walletconnect',
    chain: 'ethereum',
    ...overrides,
  };
}

export function createMockSwapRequest(overrides?: Partial<SwapRequest>): SwapRequest {
  return {
    fromToken: '0xA0b86a33E6441b4a46c9c3d47C36f0Ab6b8C6b9a', // USDC
    toToken: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
    amount: '100000000', // 100 USDC
    slippage: 0.5,
    chain: 'ethereum',
    recipient: '0x742d35Cc6342C4532CA3C632e4c5ACb5b9ADA5f0',
    ...overrides,
  };
}

export function createMockBridgeRequest(overrides?: Partial<BridgeRequest>): BridgeRequest {
  return {
    fromChain: 'ethereum',
    toChain: 'polygon',
    token: '0xA0b86a33E6441b4a46c9c3d47C36f0Ab6b8C6b9a', // USDC
    amount: '100000000', // 100 USDC
    recipient: '0x742d35Cc6342C4532CA3C632e4c5ACb5b9ADA5f0',
    ...overrides,
  };
}
