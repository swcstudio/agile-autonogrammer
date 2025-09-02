/**
 * Payment Store
 * Zustand store for global payment state management
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ChainConfig,
  PaymentConfig,
  PaymentState,
  TokenInfo,
  Transaction,
  WalletInfo,
} from '../payments/types.ts';

interface PaymentStoreState extends PaymentState {
  // Additional store-specific state
  recentTransactions: Transaction[];
  favoriteTokens: TokenInfo[];
  selectedChain: string | null;
  settings: {
    defaultSlippage: number;
    autoApprove: boolean;
    showTestnets: boolean;
    currency: 'USD' | 'EUR' | 'GBP';
  };
}

interface PaymentStoreActions {
  // Wallet actions
  setWallet: (wallet: WalletInfo | null) => void;
  updateWalletBalance: (balance: string) => void;

  // Transaction actions
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  clearTransactions: () => void;

  // Chain actions
  setSelectedChain: (chainId: string) => void;
  setSupportedChains: (chains: ChainConfig[]) => void;

  // Token actions
  addFavoriteToken: (token: TokenInfo) => void;
  removeFavoriteToken: (tokenAddress: string) => void;
  clearFavoriteTokens: () => void;

  // UI state actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Settings actions
  updateSettings: (settings: Partial<PaymentStoreState['settings']>) => void;

  // Utility actions
  reset: () => void;
  getTransactionById: (id: string) => Transaction | undefined;
  getTransactionsByType: (type: string) => Transaction[];
  getRecentTransactions: (limit?: number) => Transaction[];
}

type PaymentStore = PaymentStoreState & PaymentStoreActions;

const initialState: PaymentStoreState = {
  // PaymentState
  wallet: null,
  loading: false,
  error: null,
  transactions: [],
  supportedChains: [],

  // Store-specific state
  recentTransactions: [],
  favoriteTokens: [],
  selectedChain: null,
  settings: {
    defaultSlippage: 0.5,
    autoApprove: false,
    showTestnets: false,
    currency: 'USD',
  },
};

export const usePaymentStore = create<PaymentStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Wallet actions
      setWallet: (wallet) =>
        set((state) => ({
          wallet,
          selectedChain: wallet?.chainId?.toString() || state.selectedChain,
        })),

      updateWalletBalance: (balance) =>
        set((state) => ({
          wallet: state.wallet ? { ...state.wallet, balance } : null,
        })),

      // Transaction actions
      addTransaction: (transaction) =>
        set((state) => {
          const newTransactions = [transaction, ...state.transactions];
          const newRecentTransactions = [transaction, ...state.recentTransactions].slice(0, 10);

          return {
            transactions: newTransactions.slice(0, 100), // Keep last 100
            recentTransactions: newRecentTransactions,
          };
        }),

      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx)),
          recentTransactions: state.recentTransactions.map((tx) =>
            tx.id === id ? { ...tx, ...updates } : tx
          ),
        })),

      removeTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
          recentTransactions: state.recentTransactions.filter((tx) => tx.id !== id),
        })),

      clearTransactions: () =>
        set({
          transactions: [],
          recentTransactions: [],
        }),

      // Chain actions
      setSelectedChain: (chainId) => set({ selectedChain: chainId }),

      setSupportedChains: (chains) => set({ supportedChains: chains }),

      // Token actions
      addFavoriteToken: (token) =>
        set((state) => {
          const exists = state.favoriteTokens.some(
            (t) =>
              t.address.toLowerCase() === token.address.toLowerCase() && t.chainId === token.chainId
          );

          if (exists) return state;

          return {
            favoriteTokens: [...state.favoriteTokens, token],
          };
        }),

      removeFavoriteToken: (tokenAddress) =>
        set((state) => ({
          favoriteTokens: state.favoriteTokens.filter(
            (token) => token.address.toLowerCase() !== tokenAddress.toLowerCase()
          ),
        })),

      clearFavoriteTokens: () => set({ favoriteTokens: [] }),

      // UI state actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // Settings actions
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      // Utility actions
      reset: () => set(initialState),

      getTransactionById: (id) => {
        const state = get();
        return state.transactions.find((tx) => tx.id === id);
      },

      getTransactionsByType: (type) => {
        const state = get();
        return state.transactions.filter((tx) => tx.type === type);
      },

      getRecentTransactions: (limit = 10) => {
        const state = get();
        return state.recentTransactions.slice(0, limit);
      },
    }),
    {
      name: 'katalyst-payment-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist certain parts of the state
        favoriteTokens: state.favoriteTokens,
        selectedChain: state.selectedChain,
        settings: state.settings,
        recentTransactions: state.recentTransactions.slice(0, 5), // Only keep 5 recent
      }),
    }
  )
);

// Selectors for better performance
export const useWallet = () => usePaymentStore((state) => state.wallet);
export const useWalletAddress = () => usePaymentStore((state) => state.wallet?.address);
export const useWalletBalance = () => usePaymentStore((state) => state.wallet?.balance);
export const useIsWalletConnected = () => usePaymentStore((state) => !!state.wallet?.connected);

export const usePaymentLoading = () => usePaymentStore((state) => state.loading);
export const usePaymentError = () => usePaymentStore((state) => state.error);

export const useTransactions = () => usePaymentStore((state) => state.transactions);
export const useRecentTransactions = () => usePaymentStore((state) => state.recentTransactions);

export const useSelectedChain = () => usePaymentStore((state) => state.selectedChain);
export const useSupportedChains = () => usePaymentStore((state) => state.supportedChains);

export const useFavoriteTokens = () => usePaymentStore((state) => state.favoriteTokens);
export const usePaymentSettings = () => usePaymentStore((state) => state.settings);

// Action selectors
export const usePaymentActions = () =>
  usePaymentStore((state) => ({
    setWallet: state.setWallet,
    updateWalletBalance: state.updateWalletBalance,
    addTransaction: state.addTransaction,
    updateTransaction: state.updateTransaction,
    removeTransaction: state.removeTransaction,
    clearTransactions: state.clearTransactions,
    setSelectedChain: state.setSelectedChain,
    setSupportedChains: state.setSupportedChains,
    addFavoriteToken: state.addFavoriteToken,
    removeFavoriteToken: state.removeFavoriteToken,
    clearFavoriteTokens: state.clearFavoriteTokens,
    setLoading: state.setLoading,
    setError: state.setError,
    updateSettings: state.updateSettings,
    reset: state.reset,
  }));

// Computed selectors
export const useTransactionsByChain = (chainId: string) =>
  usePaymentStore((state) => state.transactions.filter((tx) => tx.chain === chainId));

export const usePendingTransactions = () =>
  usePaymentStore((state) => state.transactions.filter((tx) => tx.status === 'pending'));

export const useFailedTransactions = () =>
  usePaymentStore((state) => state.transactions.filter((tx) => tx.status === 'failed'));

export const useTokensByChain = (chainId: number) =>
  usePaymentStore((state) => state.favoriteTokens.filter((token) => token.chainId === chainId));

// Custom hooks for specific use cases
export const useWalletConnectionStatus = () => {
  const wallet = useWallet();
  const loading = usePaymentLoading();

  return {
    isConnected: !!wallet?.connected,
    isConnecting: loading && !wallet,
    address: wallet?.address,
    chainId: wallet?.chainId,
  };
};

export const useTransactionHistory = () => {
  const transactions = useTransactions();
  const getTransactionById = usePaymentStore((state) => state.getTransactionById);
  const getTransactionsByType = usePaymentStore((state) => state.getTransactionsByType);

  return {
    transactions,
    getById: getTransactionById,
    getByType: getTransactionsByType,
    pending: transactions.filter((tx) => tx.status === 'pending'),
    confirmed: transactions.filter((tx) => tx.status === 'confirmed'),
    failed: transactions.filter((tx) => tx.status === 'failed'),
  };
};
