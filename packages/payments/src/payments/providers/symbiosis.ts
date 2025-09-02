/**
 * Symbiosis Cross-Chain Bridge Provider
 * Handles cross-chain asset transfers and bridging operations
 */

import { API_ENDPOINTS, PAYMENT_ERRORS, SUPPORTED_CHAINS } from '../config.ts';
import type {
  BridgeProviderInterface,
  BridgeRequest,
  BridgeResponse,
  ChainConfig,
  PaymentConfig,
  TokenInfo,
} from '../types.ts';

export interface SymbiosisToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: string;
  icons: {
    large: string;
    small: string;
  };
}

export interface SymbiosisChain {
  id: string;
  name: string;
  explorer: string;
  icon: string;
  tokens: SymbiosisToken[];
}

export interface SymbiosisQuote {
  tokenAmountIn: string;
  tokenAmountOut: string;
  route: SymbiosisRoute[];
  priceImpact: string;
  fee: string;
  estimatedTime: number;
  transactionRequest: {
    chainId: string;
    to: string;
    data: string;
    value: string;
  };
}

export interface SymbiosisRoute {
  provider: string;
  tokenIn: SymbiosisToken;
  tokenOut: SymbiosisToken;
  amountIn: string;
  amountOut: string;
  poolAddress: string;
}

export interface SymbiosisSwapRequest {
  tokenAmountIn: string;
  tokenIn: string;
  tokenOut: string;
  chainIdIn: string;
  chainIdOut: string;
  from: string;
  to: string;
  slippage: number;
  deadline: number;
}

export class SymbiosisProvider implements BridgeProviderInterface {
  private config: PaymentConfig['symbiosis'];
  private chains: SymbiosisChain[] = [];
  private tokens: SymbiosisToken[] = [];

  constructor(config: PaymentConfig['symbiosis']) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      await Promise.all([this.loadSupportedChains(), this.loadSupportedTokens()]);
      console.log('Symbiosis provider initialized');
    } catch (error: any) {
      console.error('Failed to initialize Symbiosis provider:', error);
      throw new Error(`Symbiosis initialization failed: ${error.message}`);
    }
  }

  async getBridgeQuote(request: BridgeRequest): Promise<BridgeResponse> {
    try {
      const fromChainId = this.getSymbiosisChainId(request.fromChain);
      const toChainId = this.getSymbiosisChainId(request.toChain);

      const quoteRequest = {
        tokenAmountIn: request.amount,
        tokenIn: request.token,
        tokenOut: request.token, // Same token on different chain
        chainIdIn: fromChainId,
        chainIdOut: toChainId,
        from: request.recipient, // User's address
        to: request.recipient,
        slippage: 100, // 1%
        deadline: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
      };

      const response = await fetch(API_ENDPOINTS.symbiosis.quote, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Bridge quote failed: ${errorData.message || response.statusText}`);
      }

      const quote: SymbiosisQuote = await response.json();

      return {
        success: true,
        estimatedTime: quote.estimatedTime,
        fee: quote.fee,
        metadata: {
          priceImpact: quote.priceImpact,
          route: quote.route,
          tokenAmountOut: quote.tokenAmountOut,
          transactionRequest: quote.transactionRequest,
        },
      };
    } catch (error: any) {
      console.error('Symbiosis bridge quote failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async executeBridge(request: BridgeRequest): Promise<BridgeResponse> {
    try {
      // First get the quote to get transaction data
      const quote = await this.getBridgeQuote(request);

      if (!quote.success || !quote.metadata?.transactionRequest) {
        throw new Error('Failed to get bridge quote');
      }

      const txRequest = quote.metadata.transactionRequest;

      // Execute the bridge transaction
      const txHash = await this.sendBridgeTransaction(txRequest);

      return {
        success: true,
        txHash,
        estimatedTime: quote.estimatedTime,
        fee: quote.fee,
        metadata: {
          fromChain: request.fromChain,
          toChain: request.toChain,
          amount: request.amount,
          token: request.token,
        },
      };
    } catch (error: any) {
      console.error('Symbiosis bridge execution failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getSupportedChains(): Promise<ChainConfig[]> {
    if (this.chains.length === 0) {
      await this.loadSupportedChains();
    }

    return this.chains.map((chain) => ({
      chainId: chain.id,
      name: chain.name,
      rpcUrl: '', // Would be fetched from config
      blockExplorer: chain.explorer,
      nativeCurrency: {
        name: 'Native Token',
        symbol: 'NATIVE',
        decimals: 18,
      },
    }));
  }

  async getSupportedTokens(chainId?: string): Promise<TokenInfo[]> {
    if (this.tokens.length === 0) {
      await this.loadSupportedTokens();
    }

    let filteredTokens = this.tokens;
    if (chainId) {
      filteredTokens = this.tokens.filter((token) => token.chainId === chainId);
    }

    return filteredTokens.map((token) => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.icons.large,
      chainId: Number.parseInt(token.chainId),
    }));
  }

  async getBridgeStatus(
    txHash: string,
    fromChain: string
  ): Promise<{
    status: 'pending' | 'completed' | 'failed';
    progress: number;
    estimatedTimeRemaining?: number;
  }> {
    try {
      // This endpoint might not exist in the actual API
      // It's a mock implementation for bridge status tracking
      const response = await fetch(
        `${this.config.apiUrl}/bridge/status/${txHash}?chain=${fromChain}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Failed to get bridge status:', error);
      // Return a mock status for development
      return {
        status: 'pending',
        progress: 50,
        estimatedTimeRemaining: 300, // 5 minutes
      };
    }
  }

  async estimateBridgeFee(request: BridgeRequest): Promise<{
    fee: string;
    feeToken: string;
    feeUsd?: string;
  }> {
    try {
      const quote = await this.getBridgeQuote(request);

      if (!quote.success || !quote.fee) {
        throw new Error('Failed to estimate bridge fee');
      }

      return {
        fee: quote.fee,
        feeToken: 'native', // Usually paid in native token
        feeUsd: this.convertToUsd(quote.fee, request.fromChain),
      };
    } catch (error: any) {
      console.error('Failed to estimate bridge fee:', error);
      throw new Error(`Bridge fee estimation failed: ${error.message}`);
    }
  }

  // Private utility methods

  private async loadSupportedChains(): Promise<void> {
    try {
      const response = await fetch(API_ENDPOINTS.symbiosis.chains, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load chains: ${response.statusText}`);
      }

      this.chains = await response.json();
    } catch (error: any) {
      console.error('Failed to load supported chains:', error);
      // Use fallback chains from config
      this.chains = this.config.supportedChains.map((chainName, index) => ({
        id: (index + 1).toString(),
        name: chainName,
        explorer: `https://${chainName}scan.com`,
        icon: '',
        tokens: [],
      }));
    }
  }

  private async loadSupportedTokens(): Promise<void> {
    try {
      const response = await fetch(API_ENDPOINTS.symbiosis.tokens, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load tokens: ${response.statusText}`);
      }

      this.tokens = await response.json();
    } catch (error: any) {
      console.error('Failed to load supported tokens:', error);
      // Use fallback empty array
      this.tokens = [];
    }
  }

  private getSymbiosisChainId(chain: string): string {
    const chainMap: Record<string, string> = {
      ethereum: '1',
      bsc: '56',
      polygon: '137',
      avalanche: '43114',
      arbitrum: '42161',
    };

    const chainId = chainMap[chain];
    if (!chainId) {
      throw new Error(`${PAYMENT_ERRORS.UNSUPPORTED_CHAIN}: ${chain}`);
    }

    return chainId;
  }

  private async sendBridgeTransaction(txRequest: any): Promise<string> {
    // This would integrate with WalletConnect to send the transaction
    // For now, return a mock transaction hash
    console.log('Sending bridge transaction:', txRequest);

    // Mock transaction hash
    return `0x${Math.random().toString(16).substr(2, 64)}`;
  }

  private convertToUsd(fee: string, chain: string): string {
    // Mock USD conversion - in production, this would use real price feeds
    const mockPrices: Record<string, number> = {
      ethereum: 3000,
      bsc: 300,
      polygon: 0.8,
      avalanche: 25,
      arbitrum: 3000,
    };

    const price = mockPrices[chain] || 1;
    const feeInUsd = Number.parseFloat(fee) * price;
    return feeInUsd.toFixed(2);
  }

  // Getters
  getConfig(): PaymentConfig['symbiosis'] {
    return this.config;
  }

  getCachedChains(): SymbiosisChain[] {
    return this.chains;
  }

  getCachedTokens(): SymbiosisToken[] {
    return this.tokens;
  }
}
