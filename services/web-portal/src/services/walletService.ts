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

export interface DepositResponse {
  txId: string;
  balance: number;
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

export async function deposit(
  accessToken: string,
  amount: number
): Promise<DepositResponse> {
  const response = await fetch(`${BFF_URL}/api/wallet/deposit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to deposit');
  }

  return response.json();
}
