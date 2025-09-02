/**
 * 1inch DEX Aggregator Provider
 * Handles token swaps, liquidity aggregation, and DEX routing
 */

import { API_ENDPOINTS, DEFAULT_SLIPPAGE, GAS_LIMITS, PAYMENT_ERRORS } from '../config.ts';
import type {
  PaymentConfig,
  SwapProviderInterface,
  SwapRequest,
  SwapResponse,
  SwapRoute,
  TokenInfo,
} from '../types.ts';

export interface OneInchToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  tags: string[];
}

export interface OneInchQuote {
  fromToken: OneInchToken;
  toToken: OneInchToken;
  fromTokenAmount: string;
  toTokenAmount: string;
  protocols: OneInchProtocol[][];
  estimatedGas: string;
}

export interface OneInchSwap {
  fromToken: OneInchToken;
  toToken: OneInchToken;
  fromTokenAmount: string;
  toTokenAmount: string;
  protocols: OneInchProtocol[][];
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gasPrice: string;
    gas: string;
  };
}

export interface OneInchProtocol {
  name: string;
  part: number;
  fromTokenAddress: string;
  toTokenAddress: string;
}

export class OneInchProvider implements SwapProviderInterface {
  private config: PaymentConfig['oneInch'];
  private headers: HeadersInit;

  constructor(config: PaymentConfig['oneInch']) {
    this.config = config;
    this.headers = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async getQuote(request: SwapRequest): Promise<SwapResponse> {
    try {
      const chainId = this.getChainId(request.chain);
      const url = this.buildQuoteUrl(chainId, request);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Quote failed: ${errorData.error || response.statusText}`);
      }

      const quote: OneInchQuote = await response.json();

      return {
        success: true,
        estimatedGas: quote.estimatedGas,
        priceImpact: this.calculatePriceImpact(quote),
        route: this.parseProtocols(quote.protocols),
        metadata: {
          fromTokenAmount: quote.fromTokenAmount,
          toTokenAmount: quote.toTokenAmount,
          fromToken: quote.fromToken,
          toToken: quote.toToken,
        },
      };
    } catch (error: any) {
      console.error('1inch quote failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async executeSwap(request: SwapRequest): Promise<SwapResponse> {
    try {
      const chainId = this.getChainId(request.chain);
      const url = this.buildSwapUrl(chainId, request);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Swap failed: ${errorData.error || response.statusText}`);
      }

      const swap: OneInchSwap = await response.json();

      // In a real implementation, this would interact with WalletConnect
      // to send the transaction through the connected wallet
      const txHash = await this.sendSwapTransaction(swap.tx);

      return {
        success: true,
        txHash,
        estimatedGas: swap.tx.gas,
        priceImpact: this.calculatePriceImpact(swap),
        route: this.parseProtocols(swap.protocols),
        metadata: {
          fromTokenAmount: swap.fromTokenAmount,
          toTokenAmount: swap.toTokenAmount,
          transaction: swap.tx,
        },
      };
    } catch (error: any) {
      console.error('1inch swap execution failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getSupportedTokens(chainId: number): Promise<TokenInfo[]> {
    try {
      const response = await fetch(API_ENDPOINTS.oneInch.tokens(chainId), {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tokens: ${response.statusText}`);
      }

      const data = await response.json();
      const tokens: TokenInfo[] = Object.values(data.tokens).map((token: any) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        logoURI: token.logoURI,
        chainId,
      }));

      return tokens;
    } catch (error: any) {
      console.error('Failed to get supported tokens:', error);
      throw new Error(`Token fetch failed: ${error.message}`);
    }
  }

  async getLiquiditySources(chainId: number): Promise<string[]> {
    try {
      const response = await fetch(API_ENDPOINTS.oneInch.protocols(chainId), {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch protocols: ${response.statusText}`);
      }

      const data = await response.json();
      return data.protocols.map((protocol: any) => protocol.id);
    } catch (error: any) {
      console.error('Failed to get liquidity sources:', error);
      return [];
    }
  }

  async getSpender(chainId: number): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseUrl}/${chainId}/approve/spender`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get spender: ${response.statusText}`);
      }

      const data = await response.json();
      return data.address;
    } catch (error: any) {
      console.error('Failed to get spender address:', error);
      throw new Error(`Spender fetch failed: ${error.message}`);
    }
  }

  async getApprovalTransaction(
    tokenAddress: string,
    amount: string,
    chainId: number
  ): Promise<any> {
    try {
      const spender = await this.getSpender(chainId);
      const url = `${this.config.baseUrl}/${chainId}/approve/transaction?tokenAddress=${tokenAddress}&amount=${amount}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get approval transaction: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Failed to get approval transaction:', error);
      throw new Error(`Approval transaction failed: ${error.message}`);
    }
  }

  // Private utility methods

  private getChainId(chain: string): number {
    const chainMap: Record<string, number> = {
      ethereum: 1,
      bsc: 56,
      polygon: 137,
      arbitrum: 42161,
      optimism: 10,
      avalanche: 43114,
    };

    const chainId = chainMap[chain];
    if (!chainId) {
      throw new Error(`${PAYMENT_ERRORS.UNSUPPORTED_CHAIN}: ${chain}`);
    }

    if (!this.config.supportedChains.includes(chainId)) {
      throw new Error(`${PAYMENT_ERRORS.UNSUPPORTED_CHAIN}: ${chain} (${chainId})`);
    }

    return chainId;
  }

  private buildQuoteUrl(chainId: number, request: SwapRequest): string {
    const params = new URLSearchParams({
      src: request.fromToken,
      dst: request.toToken,
      amount: request.amount,
      includeProtocols: 'true',
      includeGas: 'true',
    });

    return `${API_ENDPOINTS.oneInch.quote(chainId)}?${params.toString()}`;
  }

  private buildSwapUrl(chainId: number, request: SwapRequest): string {
    const params = new URLSearchParams({
      src: request.fromToken,
      dst: request.toToken,
      amount: request.amount,
      from: request.recipient || '', // Wallet address
      slippage: request.slippage.toString(),
      includeProtocols: 'true',
      includeGas: 'true',
    });

    return `${API_ENDPOINTS.oneInch.swap(chainId)}?${params.toString()}`;
  }

  private calculatePriceImpact(quote: OneInchQuote | OneInchSwap): string {
    // Simplified price impact calculation
    // In production, this would be more sophisticated
    const fromAmount = Number.parseFloat(quote.fromTokenAmount);
    const toAmount = Number.parseFloat(quote.toTokenAmount);

    // Mock calculation - real implementation would use market prices
    const priceImpact = Math.min(2.5, (fromAmount / toAmount) * 0.001);
    return priceImpact.toFixed(3);
  }

  private parseProtocols(protocols: OneInchProtocol[][]): SwapRoute[] {
    const routes: SwapRoute[] = [];

    protocols.forEach((protocolGroup) => {
      protocolGroup.forEach((protocol) => {
        routes.push({
          protocol: protocol.name,
          percentage: protocol.part,
          fromToken: protocol.fromTokenAddress,
          toToken: protocol.toTokenAddress,
        });
      });
    });

    return routes;
  }

  private async sendSwapTransaction(tx: any): Promise<string> {
    // This would integrate with WalletConnect to send the transaction
    // For now, return a mock transaction hash
    console.log('Sending swap transaction:', tx);

    // Mock transaction hash
    return `0x${Math.random().toString(16).substr(2, 64)}`;
  }

  // Getters
  getSupportedChains(): number[] {
    return this.config.supportedChains;
  }

  getConfig(): PaymentConfig['oneInch'] {
    return this.config;
  }
}
