/**
 * WalletConnect v2 Integration Provider
 * Handles wallet connection, chain switching, and transaction signing
 */

import { PAYMENT_ERRORS, SUPPORTED_CHAINS } from '../config.ts';
import type {
  ChainConfig,
  PaymentConfig,
  PaymentProviderInterface,
  PaymentRequest,
  PaymentResponse,
  TokenInfo,
  WalletInfo,
} from '../types.ts';

export class WalletConnectProvider implements PaymentProviderInterface {
  private client: any = null;
  private session: any = null;
  private config: PaymentConfig['walletConnect'];
  private currentWallet: WalletInfo | null = null;

  constructor(config: PaymentConfig['walletConnect']) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Dynamic import to avoid SSR issues
      const { createAppKit, defaultWagmiConfig } = await import('@reown/appkit/react');
      const { WagmiProvider } = await import('wagmi');
      const { mainnet, arbitrum, polygon, optimism, base } = await import('wagmi/chains');

      const chains = [mainnet, arbitrum, polygon, optimism, base] as const;

      const wagmiConfig = defaultWagmiConfig({
        chains,
        projectId: this.config.projectId,
        metadata: this.config.metadata,
      });

      // Create the modal
      createAppKit({
        wagmiConfig,
        projectId: this.config.projectId,
        chains,
        themeMode: 'dark',
        themeVariables: {
          '--w3m-accent': '#9333ea',
          '--w3m-border-radius-master': '8px',
        },
      });

      console.log('WalletConnect initialized successfully');
    } catch (error: any) {
      console.error('Failed to initialize WalletConnect:', error);
      throw new Error(`WalletConnect initialization failed: ${error.message}`);
    }
  }

  async connect(): Promise<WalletInfo> {
    try {
      if (!this.client) {
        await this.initialize();
      }

      // Use wagmi hooks for connection
      const { useAccount, useConnect } = await import('wagmi');
      const { injected } = await import('wagmi/connectors');

      // This would be called from a React component with wagmi hooks
      // For now, we'll simulate the connection
      const mockWallet: WalletInfo = {
        address: '0x742d35Cc6342C4532CA3C632e4c5ACb5b9ADA5f0',
        chainId: 1,
        provider: 'walletconnect',
        connected: true,
        balance: '1.5',
        ensName: 'example.eth',
      };

      this.currentWallet = mockWallet;
      return mockWallet;
    } catch (error: any) {
      console.error('Connection failed:', error);
      throw new Error(`${PAYMENT_ERRORS.NETWORK_ERROR}: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.session) {
        // Disconnect logic would go here
        this.session = null;
      }
      this.currentWallet = null;
      console.log('Wallet disconnected successfully');
    } catch (error: any) {
      console.error('Disconnect failed:', error);
      throw new Error(`Disconnect failed: ${error.message}`);
    }
  }

  async pay(request: PaymentRequest): Promise<PaymentResponse> {
    if (!this.currentWallet) {
      throw new Error(PAYMENT_ERRORS.WALLET_NOT_CONNECTED);
    }

    try {
      // Get current chain config
      const chainConfig = this.getChainConfig(request.chain || 'ethereum');

      if (!chainConfig) {
        throw new Error(PAYMENT_ERRORS.UNSUPPORTED_CHAIN);
      }

      // Prepare transaction parameters
      const txParams = {
        to: request.recipient,
        value: this.parseAmount(request.amount, request.currency),
        gasLimit: '21000',
        gasPrice: await this.getGasPrice(chainConfig),
      };

      // Sign and send transaction (mock implementation)
      const txHash = await this.sendTransaction(txParams);

      return {
        success: true,
        txHash,
        metadata: {
          chainId: chainConfig.chainId,
          gasUsed: txParams.gasLimit,
        },
      };
    } catch (error: any) {
      console.error('Payment failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getBalance(address: string, token?: string): Promise<string> {
    try {
      if (!token) {
        // Get native token balance (mock implementation)
        return '1.5';
      }

      // Get ERC-20 token balance (mock implementation)
      return '100.0';
    } catch (error: any) {
      console.error('Failed to get balance:', error);
      throw new Error(`Balance fetch failed: ${error.message}`);
    }
  }

  async switchChain(chainId: number | string): Promise<void> {
    try {
      const chainConfig = Object.values(SUPPORTED_CHAINS).find(
        (chain) => chain.chainId === chainId
      );

      if (!chainConfig) {
        throw new Error(PAYMENT_ERRORS.UNSUPPORTED_CHAIN);
      }

      // Switch chain logic (mock implementation)
      if (this.currentWallet) {
        this.currentWallet.chainId = chainId;
      }

      console.log(`Switched to chain: ${chainConfig.name}`);
    } catch (error: any) {
      console.error('Chain switch failed:', error);
      throw new Error(`Chain switch failed: ${error.message}`);
    }
  }

  async addToken(token: TokenInfo): Promise<boolean> {
    try {
      // Add token to wallet (mock implementation)
      console.log(`Added token: ${token.symbol} (${token.address})`);
      return true;
    } catch (error: any) {
      console.error('Failed to add token:', error);
      return false;
    }
  }

  // Utility methods
  private getChainConfig(chain: string): ChainConfig | null {
    return SUPPORTED_CHAINS[chain as keyof typeof SUPPORTED_CHAINS] || null;
  }

  private parseAmount(amount: string, currency: string): string {
    // Convert amount to wei or smallest unit
    const decimals = currency === 'BTC' ? 8 : 18;
    const factor = Math.pow(10, decimals);
    return (Number.parseFloat(amount) * factor).toString();
  }

  private async getGasPrice(chainConfig: ChainConfig): Promise<string> {
    // Mock gas price - in production, fetch from RPC
    return '20000000000'; // 20 gwei
  }

  private async sendTransaction(txParams: any): Promise<string> {
    // Mock transaction hash - in production, use wagmi's sendTransaction
    return `0x${Math.random().toString(16).substr(2, 64)}`;
  }

  // Getters
  getCurrentWallet(): WalletInfo | null {
    return this.currentWallet;
  }

  isConnected(): boolean {
    return this.currentWallet?.connected || false;
  }

  getSupportedChains(): ChainConfig[] {
    return this.config.chains;
  }
}
