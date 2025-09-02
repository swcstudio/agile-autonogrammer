/**
 * Basic Payment Integration Examples
 * Demonstrates how to use the Katalyst payment system
 */

import {
  type PaymentConfig,
  type PaymentHooks,
  PaymentManager,
  createPaymentConfig,
  quickStartPayments,
  useBridge,
  usePayment,
  usePaymentManager,
  useSwap,
  useWallet,
} from '../index.ts';

// Example 1: Quick Start Setup
export function quickStartExample() {
  const paymentManager = quickStartPayments({
    walletConnectProjectId: 'your-walletconnect-project-id',
    hyperswitchApiKey: 'your-hyperswitch-api-key',
    oneInchApiKey: 'your-1inch-api-key',
    environment: 'sandbox',
    hooks: {
      onConnect: (wallet) => {
        console.log('Wallet connected:', wallet);
      },
      onDisconnect: () => {
        console.log('Wallet disconnected');
      },
      onPaymentSuccess: (response) => {
        console.log('Payment successful:', response);
      },
      onPaymentError: (error) => {
        console.error('Payment failed:', error);
      },
    },
  });

  return paymentManager;
}

// Example 2: Manual Configuration Setup
export function manualConfigExample() {
  const config: PaymentConfig = createPaymentConfig({
    walletConnect: {
      projectId: 'your-walletconnect-project-id',
      chains: [], // Will use defaults
      metadata: {
        name: 'My NFT Marketplace',
        description: 'Trade NFTs across multiple chains',
        url: 'https://my-nft-marketplace.com',
        icons: ['https://my-nft-marketplace.com/icon.png'],
      },
    },
    hyperswitch: {
      apiKey: 'your-hyperswitch-api-key',
      publishableKey: 'your-hyperswitch-publishable-key',
      environment: 'production',
      supportedMethods: ['card', 'crypto', 'wallet'],
    },
    oneInch: {
      apiKey: 'your-1inch-api-key',
      baseUrl: 'https://api.1inch.dev/swap/v6.0',
      supportedChains: [1, 137, 56, 42161],
    },
  });

  const hooks: PaymentHooks = {
    onConnect: (wallet) => {
      console.log(`Connected to ${wallet.provider} wallet: ${wallet.address}`);
    },
    onChainChange: (chainId) => {
      console.log(`Switched to chain: ${chainId}`);
    },
    onPaymentStart: (request) => {
      console.log(`Starting ${request.method} payment:`, request);
    },
    onPaymentSuccess: (response) => {
      console.log('Payment completed successfully:', response.txHash);
    },
    onPaymentError: (error) => {
      console.error('Payment error:', error);
    },
  };

  const paymentManager = new PaymentManager({
    config,
    hooks,
    autoConnect: false,
  });

  return paymentManager;
}

// Example 3: React Hook Usage
export function ReactComponentExample() {
  // This would be used in a React component
  const { manager, state } = usePaymentManager({
    config: createPaymentConfig({
      walletConnect: {
        projectId: 'your-project-id',
        chains: [],
        metadata: {
          name: 'My DApp',
          description: 'Web3 application',
          url: 'https://my-dapp.com',
          icons: [],
        },
      },
    }),
    autoConnect: true,
  });

  const {
    wallet,
    connect,
    disconnect,
    switchChain,
    isConnected,
    loading: walletLoading,
  } = useWallet(manager);

  const { processPayment, loading: paymentLoading, error: paymentError } = usePayment(manager);

  const { getQuote, executeSwap, loading: swapLoading, quote } = useSwap(manager);

  const { getQuote: getBridgeQuote, executeBridge, loading: bridgeLoading } = useBridge(manager);

  // Example functions that would be called from UI
  const handleConnect = async () => {
    await connect('walletconnect');
  };

  const handlePayment = async () => {
    if (!wallet) return;

    const result = await processPayment({
      id: `payment-${Date.now()}`,
      amount: '0.1',
      currency: 'ETH',
      recipient: '0x742d35Cc6342C4532CA3C632e4c5ACb5b9ADA5f0',
      method: 'crypto',
      provider: 'walletconnect',
      chain: 'ethereum',
    });

    console.log('Payment result:', result);
  };

  const handleSwap = async () => {
    if (!wallet) return;

    // First get a quote
    const quoteResult = await getQuote({
      fromToken: '0xA0b86a33E6441b4a46c9c3d47C36f0Ab6b8C6b9a', // USDC
      toToken: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      amount: '100000000', // 100 USDC
      slippage: 0.5,
      chain: 'ethereum',
      recipient: wallet.address,
    });

    if (quoteResult?.success) {
      // Execute the swap
      const swapResult = await executeSwap({
        fromToken: '0xA0b86a33E6441b4a46c9c3d47C36f0Ab6b8C6b9a',
        toToken: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        amount: '100000000',
        slippage: 0.5,
        chain: 'ethereum',
        recipient: wallet.address,
      });

      console.log('Swap result:', swapResult);
    }
  };

  const handleBridge = async () => {
    if (!wallet) return;

    // Get bridge quote
    const quoteResult = await getBridgeQuote({
      fromChain: 'ethereum',
      toChain: 'polygon',
      token: '0xA0b86a33E6441b4a46c9c3d47C36f0Ab6b8C6b9a', // USDC
      amount: '100000000', // 100 USDC
      recipient: wallet.address,
    });

    if (quoteResult?.success) {
      // Execute the bridge
      const bridgeResult = await executeBridge({
        fromChain: 'ethereum',
        toChain: 'polygon',
        token: '0xA0b86a33E6441b4a46c9c3d47C36f0Ab6b8C6b9a',
        amount: '100000000',
        recipient: wallet.address,
      });

      console.log('Bridge result:', bridgeResult);
    }
  };

  return {
    // State
    wallet,
    isConnected,
    loading: walletLoading || paymentLoading || swapLoading || bridgeLoading,
    error: paymentError,
    quote,

    // Actions
    handleConnect,
    handlePayment,
    handleSwap,
    handleBridge,
    disconnect,
    switchChain,
  };
}

// Example 4: NFT Purchase
export async function nftPurchaseExample(paymentManager: PaymentManager) {
  try {
    // Connect wallet first
    const wallet = await paymentManager.connectWallet('walletconnect');
    console.log('Wallet connected:', wallet.address);

    // Process NFT purchase
    const result = await paymentManager.processPayment({
      id: `nft-purchase-${Date.now()}`,
      amount: '0.5',
      currency: 'ETH',
      recipient: '0x1234567890123456789012345678901234567890', // NFT seller
      method: 'nft',
      provider: 'walletconnect',
      chain: 'ethereum',
      metadata: {
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', // BAYC
        tokenId: '1234',
        buyer: wallet.address,
        seller: '0x1234567890123456789012345678901234567890',
      },
    });

    if (result.success) {
      console.log('NFT purchased successfully!', result.txHash);
    } else {
      console.error('NFT purchase failed:', result.error);
    }
  } catch (error) {
    console.error('NFT purchase error:', error);
  }
}

// Example 5: Cross-Chain Token Bridge
export async function crossChainBridgeExample(paymentManager: PaymentManager) {
  try {
    const wallet = await paymentManager.connectWallet('walletconnect');

    // Bridge USDC from Ethereum to Polygon
    const bridgeResult = await paymentManager.bridge({
      fromChain: 'ethereum',
      toChain: 'polygon',
      token: '0xA0b86a33E6441b4a46c9c3d47C36f0Ab6b8C6b9a', // USDC on Ethereum
      amount: '100000000', // 100 USDC (6 decimals)
      recipient: wallet.address,
    });

    if (bridgeResult.success) {
      console.log('Bridge transaction started:', bridgeResult.txHash);
      console.log('Estimated time:', bridgeResult.estimatedTime, 'seconds');
      console.log('Bridge fee:', bridgeResult.fee);
    } else {
      console.error('Bridge failed:', bridgeResult.error);
    }
  } catch (error) {
    console.error('Bridge error:', error);
  }
}

// Example 6: Token Swap with Best Price
export async function tokenSwapExample(paymentManager: PaymentManager) {
  try {
    const wallet = await paymentManager.connectWallet('walletconnect');

    // Get multiple quotes to compare prices
    const swapRequest = {
      fromToken: '0xA0b86a33E6441b4a46c9c3d47C36f0Ab6b8C6b9a', // USDC
      toToken: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      amount: '1000000000', // 1000 USDC
      slippage: 0.5,
      chain: 'ethereum' as const,
      recipient: wallet.address,
    };

    // Get quote first
    const quote = await paymentManager.getSwapQuote(swapRequest);

    if (quote.success) {
      console.log('Swap quote:');
      console.log('- Price impact:', quote.priceImpact, '%');
      console.log('- Estimated gas:', quote.estimatedGas);
      console.log('- Route:', quote.route);

      // Execute if price impact is acceptable
      if (Number.parseFloat(quote.priceImpact || '0') < 2.0) {
        const swapResult = await paymentManager.swap(swapRequest);

        if (swapResult.success) {
          console.log('Swap executed:', swapResult.txHash);
        } else {
          console.error('Swap failed:', swapResult.error);
        }
      } else {
        console.warn('Price impact too high, skipping swap');
      }
    }
  } catch (error) {
    console.error('Swap error:', error);
  }
}

// Example 7: Fiat Payment with Hyperswitch
export async function fiatPaymentExample(paymentManager: PaymentManager) {
  try {
    // Process fiat payment (credit card, bank transfer, etc.)
    const result = await paymentManager.processPayment({
      id: `fiat-payment-${Date.now()}`,
      amount: '99.99',
      currency: 'USD',
      recipient: 'merchant-account-id', // Merchant's account
      method: 'fiat',
      provider: 'hyperswitch',
      metadata: {
        description: 'NFT Marketplace Premium Subscription',
        customer_email: 'user@example.com',
        payment_method_types: ['card', 'bank_transfer'],
      },
    });

    if (result.success) {
      console.log('Fiat payment initiated');
      console.log('Payment ID:', result.metadata?.payment_id);
      // Frontend would handle the payment flow using the client_secret
    } else {
      console.error('Fiat payment failed:', result.error);
    }
  } catch (error) {
    console.error('Fiat payment error:', error);
  }
}

// Export all examples
export const examples = {
  quickStart: quickStartExample,
  manualConfig: manualConfigExample,
  reactComponent: ReactComponentExample,
  nftPurchase: nftPurchaseExample,
  crossChainBridge: crossChainBridgeExample,
  tokenSwap: tokenSwapExample,
  fiatPayment: fiatPaymentExample,
};
