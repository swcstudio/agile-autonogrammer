/**
 * Payment Hooks
 * React hooks for easy payment integration
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { PaymentManager } from './manager.ts';
import type {
  BridgeRequest,
  BridgeResponse,
  ChainConfig,
  PaymentManagerOptions,
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

// Payment Manager Context Hook
export function usePaymentManager(options: PaymentManagerOptions) {
  const managerRef = useRef<PaymentManager | null>(null);
  const [state, setState] = useState<PaymentState>({
    wallet: null,
    loading: false,
    error: null,
    transactions: [],
    supportedChains: [],
  });

  // Initialize manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = new PaymentManager({
        ...options,
        hooks: {
          ...options.hooks,
          onConnect: (wallet: WalletInfo) => {
            setState((prev) => ({ ...prev, wallet }));
            options.hooks?.onConnect?.(wallet);
          },
          onDisconnect: () => {
            setState((prev) => ({ ...prev, wallet: null }));
            options.hooks?.onDisconnect?.();
          },
          onPaymentStart: (request: PaymentRequest) => {
            setState((prev) => ({ ...prev, loading: true, error: null }));
            options.hooks?.onPaymentStart?.(request);
          },
          onPaymentSuccess: (response: PaymentResponse) => {
            setState((prev) => ({ ...prev, loading: false }));
            options.hooks?.onPaymentSuccess?.(response);
          },
          onPaymentError: (error: string) => {
            setState((prev) => ({ ...prev, loading: false, error }));
            options.hooks?.onPaymentError?.(error);
          },
          onChainChange: (chainId: number | string) => {
            setState((prev) => ({
              ...prev,
              wallet: prev.wallet ? { ...prev.wallet, chainId } : null,
            }));
            options.hooks?.onChainChange?.(chainId);
          },
        },
      });

      // Initialize and update state
      managerRef.current.initialize().catch(console.error);
    }
  }, []);

  // Sync state with manager
  useEffect(() => {
    if (managerRef.current) {
      const managerState = managerRef.current.getState();
      setState(managerState);
    }
  }, [managerRef.current]);

  return {
    manager: managerRef.current,
    state,
  };
}

// Wallet Connection Hook
export function useWallet(manager?: PaymentManager) {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(
    async (provider: PaymentProvider = 'walletconnect') => {
      if (!manager) {
        setError('Payment manager not initialized');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const connectedWallet = await manager.connectWallet(provider);
        setWallet(connectedWallet);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [manager]
  );

  const disconnect = useCallback(async () => {
    if (!manager) return;

    try {
      setLoading(true);
      await manager.disconnectWallet();
      setWallet(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [manager]);

  const switchChain = useCallback(
    async (chainId: number | string) => {
      if (!manager) {
        setError('Payment manager not initialized');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        await manager.switchChain(chainId);
        // Wallet state will be updated through the manager hooks
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [manager]
  );

  const getBalance = useCallback(
    async (token?: string) => {
      if (!manager || !wallet) {
        return '0';
      }

      try {
        return await manager.getBalance(wallet.address, token);
      } catch (err: any) {
        setError(err.message);
        return '0';
      }
    },
    [manager, wallet]
  );

  return {
    wallet,
    loading,
    error,
    connect,
    disconnect,
    switchChain,
    getBalance,
    isConnected: !!wallet?.connected,
  };
}

// Payment Processing Hook
export function usePayment(manager?: PaymentManager) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<PaymentResponse | null>(null);

  const processPayment = useCallback(
    async (request: PaymentRequest) => {
      if (!manager) {
        setError('Payment manager not initialized');
        return null;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await manager.processPayment(request);
        setLastResponse(response);

        if (!response.success) {
          setError(response.error || 'Payment failed');
        }

        return response;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [manager]
  );

  return {
    processPayment,
    loading,
    error,
    lastResponse,
  };
}

// Token Swap Hook
export function useSwap(manager?: PaymentManager) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<SwapResponse | null>(null);
  const [lastSwap, setLastSwap] = useState<SwapResponse | null>(null);

  const getQuote = useCallback(
    async (request: SwapRequest) => {
      if (!manager) {
        setError('Payment manager not initialized');
        return null;
      }

      try {
        setLoading(true);
        setError(null);
        const quoteResponse = await manager.getSwapQuote(request);
        setQuote(quoteResponse);

        if (!quoteResponse.success) {
          setError(quoteResponse.error || 'Quote failed');
        }

        return quoteResponse;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [manager]
  );

  const executeSwap = useCallback(
    async (request: SwapRequest) => {
      if (!manager) {
        setError('Payment manager not initialized');
        return null;
      }

      try {
        setLoading(true);
        setError(null);
        const swapResponse = await manager.swap(request);
        setLastSwap(swapResponse);

        if (!swapResponse.success) {
          setError(swapResponse.error || 'Swap failed');
        }

        return swapResponse;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [manager]
  );

  return {
    getQuote,
    executeSwap,
    loading,
    error,
    quote,
    lastSwap,
  };
}

// Cross-Chain Bridge Hook
export function useBridge(manager?: PaymentManager) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<BridgeResponse | null>(null);
  const [lastBridge, setLastBridge] = useState<BridgeResponse | null>(null);

  const getQuote = useCallback(
    async (request: BridgeRequest) => {
      if (!manager) {
        setError('Payment manager not initialized');
        return null;
      }

      try {
        setLoading(true);
        setError(null);
        const quoteResponse = await manager.getBridgeQuote(request);
        setQuote(quoteResponse);

        if (!quoteResponse.success) {
          setError(quoteResponse.error || 'Bridge quote failed');
        }

        return quoteResponse;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [manager]
  );

  const executeBridge = useCallback(
    async (request: BridgeRequest) => {
      if (!manager) {
        setError('Payment manager not initialized');
        return null;
      }

      try {
        setLoading(true);
        setError(null);
        const bridgeResponse = await manager.bridge(request);
        setLastBridge(bridgeResponse);

        if (!bridgeResponse.success) {
          setError(bridgeResponse.error || 'Bridge failed');
        }

        return bridgeResponse;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [manager]
  );

  return {
    getQuote,
    executeBridge,
    loading,
    error,
    quote,
    lastBridge,
  };
}

// Token Management Hook
export function useTokens(manager?: PaymentManager, chainId?: number) {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTokens = useCallback(
    async (targetChainId?: number) => {
      if (!manager) {
        setError('Payment manager not initialized');
        return;
      }

      const currentChainId = targetChainId || chainId;
      if (!currentChainId) {
        setError('Chain ID not provided');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const tokenList = await manager.getSupportedTokens(currentChainId);
        setTokens(tokenList);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [manager, chainId]
  );

  useEffect(() => {
    if (chainId) {
      loadTokens(chainId);
    }
  }, [chainId, loadTokens]);

  return {
    tokens,
    loading,
    error,
    refetch: loadTokens,
  };
}

// Chain Management Hook
export function useChains(manager?: PaymentManager) {
  const [chains, setChains] = useState<ChainConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChains = useCallback(async () => {
    if (!manager) {
      setError('Payment manager not initialized');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const chainList = await manager.getSupportedChains();
      setChains(chainList);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [manager]);

  useEffect(() => {
    loadChains();
  }, [loadChains]);

  return {
    chains,
    loading,
    error,
    refetch: loadChains,
  };
}

// Transaction History Hook
export function useTransactions(manager?: PaymentManager) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (manager) {
      const updateTransactions = () => {
        setTransactions(manager.getTransactions());
      };

      // Initial load
      updateTransactions();

      // Set up periodic refresh
      const interval = setInterval(updateTransactions, 5000);
      return () => clearInterval(interval);
    }
  }, [manager]);

  const getTransaction = useCallback(
    (id: string) => {
      return transactions.find((tx) => tx.id === id);
    },
    [transactions]
  );

  const getTransactionsByType = useCallback(
    (type: string) => {
      return transactions.filter((tx) => tx.type === type);
    },
    [transactions]
  );

  return {
    transactions,
    getTransaction,
    getTransactionsByType,
  };
}
