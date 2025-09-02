/**
 * Hyperswitch Payment Orchestration Provider
 * Handles fiat payments, crypto payments, and payment method management
 */

import { API_ENDPOINTS, PAYMENT_ERRORS } from '../config.ts';
import type {
  PaymentConfig,
  PaymentProviderInterface,
  PaymentRequest,
  PaymentResponse,
  TokenInfo,
  WalletInfo,
} from '../types.ts';

export interface HyperswitchPaymentMethod {
  payment_method: string;
  payment_method_types: string[];
  required_fields?: Record<string, any>;
}

export interface HyperswitchPaymentIntent {
  payment_id: string;
  amount: number;
  currency: string;
  customer_id?: string;
  payment_methods: HyperswitchPaymentMethod[];
  client_secret: string;
  status: 'requires_payment_method' | 'processing' | 'succeeded' | 'failed';
}

export interface HyperswitchCustomer {
  customer_id: string;
  name?: string;
  email?: string;
  phone?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export class HyperswitchProvider implements PaymentProviderInterface {
  private config: PaymentConfig['hyperswitch'];
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(config: PaymentConfig['hyperswitch']) {
    this.config = config;
    this.baseUrl =
      config.environment === 'production'
        ? 'https://api.hyperswitch.io/v1'
        : 'https://sandbox.hyperswitch.io/v1';

    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      'api-key': config.apiKey,
    };
  }

  async connect(): Promise<WalletInfo> {
    // Hyperswitch doesn't require wallet connection for fiat payments
    // Return a mock wallet info for consistency
    return {
      address: 'hyperswitch-customer',
      chainId: 'fiat',
      provider: 'hyperswitch',
      connected: true,
    };
  }

  async disconnect(): Promise<void> {
    // No persistent connection to disconnect
    console.log('Hyperswitch session ended');
  }

  async pay(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Create payment intent
      const paymentIntent = await this.createPaymentIntent({
        amount: Math.round(Number.parseFloat(request.amount) * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        payment_methods: this.getPaymentMethods(request.method),
        metadata: {
          ...request.metadata,
          request_id: request.id,
          chain: request.chain,
        },
      });

      // For crypto payments, handle differently
      if (request.method === 'crypto') {
        return await this.processCryptoPayment(paymentIntent, request);
      }

      // For fiat payments, return payment intent for frontend processing
      return {
        success: true,
        metadata: {
          payment_id: paymentIntent.payment_id,
          client_secret: paymentIntent.client_secret,
          payment_methods: paymentIntent.payment_methods,
        },
      };
    } catch (error: any) {
      console.error('Hyperswitch payment failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getBalance(address: string, token?: string): Promise<string> {
    // Hyperswitch doesn't provide balance queries
    // This would typically be handled by the merchant's system
    throw new Error('Balance queries not supported by Hyperswitch');
  }

  async switchChain(chainId: number | string): Promise<void> {
    // Not applicable for Hyperswitch
    console.log('Chain switching not applicable for Hyperswitch');
  }

  async addToken(token: TokenInfo): Promise<boolean> {
    // Not applicable for Hyperswitch
    return false;
  }

  // Hyperswitch-specific methods

  async createCustomer(customerData: Partial<HyperswitchCustomer>): Promise<HyperswitchCustomer> {
    try {
      const response = await fetch(`${this.baseUrl}/customers`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(customerData),
      });

      if (!response.ok) {
        throw new Error(`Customer creation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      throw new Error(`Customer creation failed: ${error.message}`);
    }
  }

  async createPaymentIntent(intentData: {
    amount: number;
    currency: string;
    payment_methods?: HyperswitchPaymentMethod[];
    customer_id?: string;
    metadata?: Record<string, any>;
  }): Promise<HyperswitchPaymentIntent> {
    try {
      const payload = {
        amount: intentData.amount,
        currency: intentData.currency,
        confirm: false,
        capture_method: 'automatic',
        payment_methods: intentData.payment_methods || this.getDefaultPaymentMethods(),
        metadata: intentData.metadata,
        customer_id: intentData.customer_id,
        setup_future_usage: 'off_session',
      };

      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Payment intent creation failed: ${errorData.error?.message || response.statusText}`
        );
      }

      return await response.json();
    } catch (error: any) {
      console.error('Failed to create payment intent:', error);
      throw new Error(`Payment intent creation failed: ${error.message}`);
    }
  }

  async confirmPayment(paymentId: string, paymentMethod: any): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}/confirm`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          payment_method: paymentMethod,
          return_url: window?.location?.origin || 'https://katalyst.dev',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Payment confirmation failed: ${errorData.error?.message || response.statusText}`
        );
      }

      const result = await response.json();

      return {
        success: result.status === 'succeeded',
        txHash: result.payment_id,
        metadata: {
          status: result.status,
          payment_method: result.payment_method,
          amount: result.amount,
          currency: result.currency,
        },
      };
    } catch (error: any) {
      console.error('Failed to confirm payment:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<HyperswitchPaymentIntent> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Payment status fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Failed to get payment status:', error);
      throw new Error(`Payment status fetch failed: ${error.message}`);
    }
  }

  async getSupportedPaymentMethods(currency = 'usd'): Promise<HyperswitchPaymentMethod[]> {
    try {
      const response = await fetch(`${this.baseUrl}/payment_methods?currency=${currency}`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payment methods: ${response.statusText}`);
      }

      const data = await response.json();
      return data.payment_methods || [];
    } catch (error: any) {
      console.error('Failed to get supported payment methods:', error);
      return this.getDefaultPaymentMethods();
    }
  }

  private async processCryptoPayment(
    intent: HyperswitchPaymentIntent,
    request: PaymentRequest
  ): Promise<PaymentResponse> {
    try {
      // For crypto payments, we need to handle the blockchain transaction
      // This would integrate with the appropriate crypto provider
      const cryptoPaymentMethod = {
        type: 'crypto',
        crypto: {
          network: request.chain || 'ethereum',
          currency: request.currency,
        },
      };

      return await this.confirmPayment(intent.payment_id, cryptoPaymentMethod);
    } catch (error: any) {
      console.error('Crypto payment processing failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private getPaymentMethods(method: string): HyperswitchPaymentMethod[] {
    switch (method) {
      case 'crypto':
        return [
          {
            payment_method: 'crypto',
            payment_method_types: ['bitcoin', 'ethereum', 'litecoin'],
          },
        ];
      case 'fiat':
        return [
          {
            payment_method: 'card',
            payment_method_types: ['credit', 'debit'],
          },
          {
            payment_method: 'bank_transfer',
            payment_method_types: ['ach', 'sepa', 'bacs'],
          },
        ];
      default:
        return this.getDefaultPaymentMethods();
    }
  }

  private getDefaultPaymentMethods(): HyperswitchPaymentMethod[] {
    return [
      {
        payment_method: 'card',
        payment_method_types: ['credit', 'debit'],
      },
      {
        payment_method: 'wallet',
        payment_method_types: ['apple_pay', 'google_pay', 'paypal'],
      },
      {
        payment_method: 'crypto',
        payment_method_types: ['bitcoin', 'ethereum', 'litecoin'],
      },
      {
        payment_method: 'bank_transfer',
        payment_method_types: ['ach', 'sepa'],
      },
    ];
  }
}
