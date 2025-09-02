/**
 * Payment Manager
 * Orchestrates all payment providers and handles unified payment processing
 */

import { HyperswitchProvider } from './providers/hyperswitch.ts';
import { OneInchProvider } from './providers/oneinch.ts';
import { SymbiosisProvider } from './providers/symbiosis.ts';
import { WalletConnectProvider } from './providers/walletconnect.ts';

import type {
  BridgeRequest,
  BridgeResponse,
  ChainConfig,
  NFTPaymentRequest,
  PaymentHooks,
  PaymentManagerOptions,
  PaymentMethod,
  PaymentProvider,
  PaymentRequest,
  PaymentResponse,
  PaymentState,
  SwapRequest,
  SwapResponse,
  TokenInfo,
  Transaction,
  WalletInfo,
} from './types.ts';

import { DEFAULT_PAYMENT_CONFIG, PAYMENT_ERRORS } from './config.ts';

export class PaymentManager {
  private walletConnect: WalletConnectProvider;
  private hyperswitch: HyperswitchProvider;
  private oneInch: OneInchProvider;
  private symbiosis: SymbiosisProvider;
  private hooks: PaymentHooks;
  private state: PaymentState;
  private initialized = false;

  constructor(options: PaymentManagerOptions) {
    const config = { ...DEFAULT_PAYMENT_CONFIG, ...options.config };

    // Initialize providers
    this.walletConnect = new WalletConnectProvider(config.walletConnect);
    this.hyperswitch = new HyperswitchProvider(config.hyperswitch);
    this.oneInch = new OneInchProvider(config.oneInch);
    this.symbiosis = new SymbiosisProvider(config.symbiosis);

    // Setup hooks
    this.hooks = options.hooks || {};

    // Initialize state
    this.state = {
      wallet: null,
      loading: false,
      error: null,
      transactions: [],
      supportedChains: config.walletConnect.chains,
    };

    // Auto-connect if requested
    if (options.autoConnect) {
      this.initialize();
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.setState({ loading: true, error: null });

      // Initialize all providers
      await Promise.all([this.walletConnect.initialize(), this.symbiosis.initialize()]);

      this.initialized = true;
      console.log('Payment Manager initialized successfully');
    } catch (error: any) {
      console.error('Payment Manager initialization failed:', error);
      this.setState({ error: error.message });
      throw error;
    } finally {
      this.setState({ loading: false });
    }
  }

  // Wallet Management

  async connectWallet(provider: PaymentProvider = 'walletconnect'): Promise<WalletInfo> {
    try {
      this.setState({ loading: true, error: null });

      const walletProvider = this.getWalletProvider(provider);
      const wallet = await walletProvider.connect();

      this.setState({ wallet });
      this.hooks.onConnect?.(wallet);

      return wallet;
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      this.setState({ error: error.message });
      this.hooks.onPaymentError?.(error.message);
      throw error;
    } finally {
      this.setState({ loading: false });
    }
  }

  async disconnectWallet(): Promise<void> {
    try {
      if (this.state.wallet) {
        const provider = this.getWalletProvider(this.state.wallet.provider);
        await provider.disconnect();
      }

      this.setState({ wallet: null });
      this.hooks.onDisconnect?.();
    } catch (error: any) {
      console.error('Wallet disconnection failed:', error);
      this.setState({ error: error.message });
    }
  }

  async switchChain(chainId: number | string): Promise<void> {
    if (!this.state.wallet) {
      throw new Error(PAYMENT_ERRORS.WALLET_NOT_CONNECTED);
    }

    try {
      this.setState({ loading: true, error: null });

      const provider = this.getWalletProvider(this.state.wallet.provider);
      await provider.switchChain(chainId);

      // Update wallet state
      this.setState({
        wallet: { ...this.state.wallet, chainId },
      });

      this.hooks.onChainChange?.(chainId);
    } catch (error: any) {
      console.error('Chain switch failed:', error);
      this.setState({ error: error.message });
      throw error;
    } finally {
      this.setState({ loading: false });
    }
  }

  // Payment Processing

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      this.setState({ loading: true, error: null });
      this.hooks.onPaymentStart?.(request);

      let response: PaymentResponse;

      switch (request.method) {
        case 'crypto':
          response = await this.processCryptoPayment(request);
          break;
        case 'fiat':
          response = await this.processFiatPayment(request);
          break;
        case 'nft':
          response = await this.processNFTPayment(request as NFTPaymentRequest);
          break;
        case 'swap':
          response = await this.processSwap(request as SwapRequest);
          break;
        case 'bridge':
          response = await this.processBridge(request as BridgeRequest);
          break;
        default:
          throw new Error(`Unsupported payment method: ${request.method}`);
      }

      // Record transaction
      if (response.success && response.txHash) {
        this.addTransaction({
          id: request.id,
          hash: response.txHash,
          type: request.method,
          status: 'confirmed',
          amount: request.amount,
          currency: request.currency,
          timestamp: Date.now(),
          chain: request.chain || 'ethereum',
          metadata: response.metadata,
        });
      }

      if (response.success) {
        this.hooks.onPaymentSuccess?.(response);
      } else {
        this.hooks.onPaymentError?.(response.error || 'Payment failed');
      }

      return response;
    } catch (error: any) {
      console.error('Payment processing failed:', error);
      const errorResponse: PaymentResponse = {
        success: false,
        error: error.message,
      };
      this.hooks.onPaymentError?.(error.message);
      return errorResponse;
    } finally {
      this.setState({ loading: false });
    }
  }

  // Specialized Payment Methods

  async swap(request: SwapRequest): Promise<SwapResponse> {
    try {
      this.setState({ loading: true, error: null });
      return await this.oneInch.executeSwap(request);
    } catch (error: any) {
      console.error('Swap failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.setState({ loading: false });
    }
  }

  async getSwapQuote(request: SwapRequest): Promise<SwapResponse> {
    try {
      return await this.oneInch.getQuote(request);
    } catch (error: any) {
      console.error('Swap quote failed:', error);
      return { success: false, error: error.message };
    }
  }

  async bridge(request: BridgeRequest): Promise<BridgeResponse> {
    try {
      this.setState({ loading: true, error: null });
      return await this.symbiosis.executeBridge(request);
    } catch (error: any) {
      console.error('Bridge failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.setState({ loading: false });
    }
  }

  async getBridgeQuote(request: BridgeRequest): Promise<BridgeResponse> {
    try {
      return await this.symbiosis.getBridgeQuote(request);
    } catch (error: any) {
      console.error('Bridge quote failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility Methods

  async getBalance(address?: string, token?: string): Promise<string> {
    if (!this.state.wallet && !address) {
      throw new Error(PAYMENT_ERRORS.WALLET_NOT_CONNECTED);
    }

    const targetAddress = address || this.state.wallet!.address;
    const provider = this.getWalletProvider(this.state.wallet?.provider || 'walletconnect');

    return await provider.getBalance(targetAddress, token);
  }

  async getSupportedTokens(chainId: number): Promise<TokenInfo[]> {
    return await this.oneInch.getSupportedTokens(chainId);
  }

  async getSupportedChains(): Promise<ChainConfig[]> {
    return await this.symbiosis.getSupportedChains();
  }

  // Private Methods

  private async processCryptoPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const provider = this.getWalletProvider(request.provider);
    return await provider.pay(request);
  }

  private async processFiatPayment(request: PaymentRequest): Promise<PaymentResponse> {
    return await this.hyperswitch.pay(request);
  }

  private async processNFTPayment(request: NFTPaymentRequest): Promise<PaymentResponse> {
    // Convert NFT request to standard payment request
    const paymentRequest: PaymentRequest = {
      id: `nft-${request.tokenId}-${Date.now()}`,
      amount: request.price,
      currency: request.currency,
      recipient: request.seller,
      method: 'nft',
      provider: 'walletconnect',
      chain: request.chain,
      metadata: {
        contractAddress: request.contractAddress,
        tokenId: request.tokenId,
        buyer: request.buyer,
        seller: request.seller,
      },
    };

    return await this.processCryptoPayment(paymentRequest);
  }

  private async processSwap(request: SwapRequest): Promise<PaymentResponse> {
    const swapResponse = await this.oneInch.executeSwap(request);

    return {
      success: swapResponse.success,
      txHash: swapResponse.txHash,
      error: swapResponse.error,
      metadata: swapResponse.metadata,
    };
  }

  private async processBridge(request: BridgeRequest): Promise<PaymentResponse> {
    const bridgeResponse = await this.symbiosis.executeBridge(request);

    return {
      success: bridgeResponse.success,
      txHash: bridgeResponse.txHash,
      error: bridgeResponse.error,
      metadata: bridgeResponse.metadata,
    };
  }

  private getWalletProvider(provider: PaymentProvider) {
    switch (provider) {
      case 'walletconnect':
        return this.walletConnect;
      case 'hyperswitch':
        return this.hyperswitch;
      default:
        throw new Error(`Unsupported wallet provider: ${provider}`);
    }
  }

  private setState(updates: Partial<PaymentState>): void {
    this.state = { ...this.state, ...updates };
  }

  private addTransaction(transaction: Transaction): void {
    this.state.transactions.push(transaction);
    // Keep only last 50 transactions
    if (this.state.transactions.length > 50) {
      this.state.transactions = this.state.transactions.slice(-50);
    }
  }

  // Getters

  getState(): PaymentState {
    return { ...this.state };
  }

  getWallet(): WalletInfo | null {
    return this.state.wallet;
  }

  getTransactions(): Transaction[] {
    return [...this.state.transactions];
  }

  isConnected(): boolean {
    return this.state.wallet?.connected || false;
  }

  isLoading(): boolean {
    return this.state.loading;
  }

  getError(): string | null {
    return this.state.error;
  }

  // Provider Access (for advanced use cases)
  getWalletConnectProvider(): WalletConnectProvider {
    return this.walletConnect;
  }

  getHyperswitchProvider(): HyperswitchProvider {
    return this.hyperswitch;
  }

  getOneInchProvider(): OneInchProvider {
    return this.oneInch;
  }

  getSymbiosisProvider(): SymbiosisProvider {
    return this.symbiosis;
  }
}
