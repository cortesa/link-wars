import crypto from 'node:crypto';

interface SignatureHeaders {
  'x-service-id': string;
  'x-timestamp': string;
  'x-nonce': string;
  'x-signature': string;
}

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

interface ErrorResponse {
  message?: string;
}

export class CashierClient {
  constructor(
    private cashierUrl: string,
    private serviceId: string,
    private secret: string
  ) {}

  async getBalance(playerId: string): Promise<BalanceResponse> {
    const body = '';
    const headers = this.signRequest(body);

    const response = await fetch(
      `${this.cashierUrl}/v1/wallets/${playerId}/balance`,
      {
        method: 'GET',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as ErrorResponse;
      throw new Error(errorData.message || `Failed to get balance: ${response.status}`);
    }

    return response.json() as Promise<BalanceResponse>;
  }

  async getTransactions(playerId: string, limit = 50): Promise<TransactionsResponse> {
    const body = '';
    const headers = this.signRequest(body);

    const response = await fetch(
      `${this.cashierUrl}/v1/wallets/${playerId}/transactions?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as ErrorResponse;
      throw new Error(errorData.message || `Failed to get transactions: ${response.status}`);
    }

    return response.json() as Promise<TransactionsResponse>;
  }

  private signRequest(body: string): SignatureHeaders {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID();
    const message = `${this.serviceId}${timestamp}${nonce}${body}`;
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(message)
      .digest('hex');

    return {
      'x-service-id': this.serviceId,
      'x-timestamp': timestamp,
      'x-nonce': nonce,
      'x-signature': signature,
    };
  }
}

// Singleton instance
let cashierClient: CashierClient | null = null;

export function getCashierClient(): CashierClient {
  if (!cashierClient) {
    const cashierUrl = process.env.CASHIER_URL || 'http://localhost:3002';
    const serviceId = process.env.CASHIER_SERVICE_ID || 'portal-bff';
    const secret = process.env.CASHIER_SECRET || 'dev-portal-bff-secret-min-32-chars';

    cashierClient = new CashierClient(cashierUrl, serviceId, secret);
  }
  return cashierClient;
}
