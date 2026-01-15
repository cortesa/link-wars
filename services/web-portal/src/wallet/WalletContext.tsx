import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  getBalance,
  deposit,
  getTransactions,
  type Transaction,
} from '../services/walletService';

interface WalletContextType {
  balance: number | null;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
  refreshTransactions: (limit?: number) => Promise<void>;
  depositFunds: (amount: number) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { isAuthenticated, getToken } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setError('Not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getBalance(token);
      setBalance(response.balance);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(message);
      console.error('Failed to fetch balance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  const refreshTransactions = useCallback(
    async (limit = 50) => {
      const token = await getToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await getTransactions(token, limit);
        setTransactions(response.transactions);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch transactions';
        setError(message);
        console.error('Failed to fetch transactions:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [getToken]
  );

  const depositFunds = useCallback(
    async (amount: number) => {
      const token = await getToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await deposit(token, amount);
        setBalance(response.balance);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to deposit';
        setError(message);
        console.error('Failed to deposit:', err);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [getToken]
  );

  // Auto-fetch balance when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshBalance();
    } else {
      setBalance(null);
      setTransactions([]);
      setError(null);
    }
  }, [isAuthenticated, refreshBalance]);

  const value: WalletContextType = {
    balance,
    transactions,
    isLoading,
    error,
    refreshBalance,
    refreshTransactions,
    depositFunds,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
