const BFF_URL = import.meta.env.VITE_PORTAL_BFF_URL || 'http://localhost:3003';

export interface Transaction {
  id: string;
  playerId: string;
  amount: number;
  direction: 'DEBIT' | 'CREDIT';
  reference: string;
  idempotencyKey: string;
  timestamp: string;
}

export interface BalanceResponse {
  playerId: string;
  balance: number;
}

export interface TransactionsResponse {
  playerId: string;
  transactions: Transaction[];
}

export async function getBalance(accessToken: string): Promise<BalanceResponse> {
  const response = await fetch(`${BFF_URL}/api/wallet/balance`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch balance');
  }

  return response.json();
}

export async function getTransactions(
  accessToken: string,
  limit = 50
): Promise<TransactionsResponse> {
  const response = await fetch(`${BFF_URL}/api/wallet/transactions?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch transactions');
  }

  return response.json();
}
