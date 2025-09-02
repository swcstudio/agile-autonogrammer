/**
 * Unified Payment Terminal
 * Intelligent payment routing and processing for Web2 and Web3
 */

import { EventEmitter } from 'events';
import {
  PaymentProvider,
  PaymentMethod,
  PaymentRequest,
  PaymentResponse,
  PaymentConfig,
  PaymentProviderInterface,
  PaymentAnalytics,
  FraudDetectionResult,
  CustomerData,
  Customer,
  SubscriptionPlan,
  Subscription
} from './types';

// Import providers
import { StripeProvider } from './providers/stripe';
import { PayPalProvider } from './providers/paypal';
import { ApplePayProvider } from './providers/apple-pay';
// Web3 providers would be imported here

export interface PaymentTerminalOptions {
  config: PaymentConfig;
  enableFraudDetection?: boolean;
  enableAnalytics?: boolean;
  enableAutoRouting?: boolean;
  fallbackProviders?: PaymentProvider[];
  riskThreshold?: number;
  debugMode?: boolean;
}

export class PaymentTerminal extends EventEmitter {
  private providers: Map<PaymentProvider, PaymentProviderInterface> = new Map();
  private config: PaymentConfig;
  private options: PaymentTerminalOptions;
  private analytics: PaymentAnalytics;
  private initialized = false;

  constructor(options: PaymentTerminalOptions) {
    super();
    this.options = options;
    this.config = options.config;
    this.analytics = this.initializeAnalytics();
  }

  /**
   * Initialize the payment terminal
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize Web2 providers
      await this.initializeWeb2Providers();
      
      // Initialize Web3 providers
      await this.initializeWeb3Providers();
      
      // Set up fraud detection
      if (this.options.enableFraudDetection) {
        await this.initializeFraudDetection();
      }

      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Process a payment with automatic provider selection
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      await this.initialize();
      
      // Validate request
      this.validatePaymentRequest(request);
      
      // Fraud detection
      if (this.options.enableFraudDetection) {
        const fraudCheck = await this.checkForFraud(request);
        if (fraudCheck.recommendation === 'decline') {
          return {
            success: false,
            status: 'failed',
            error: {
              code: 'fraud_detected',
              message: 'Payment declined due to fraud detection',
              type: 'card_error'
            },
            fraudDetection: fraudCheck
          };
        }
      }
      
      // Determine optimal provider
      const provider = await this.selectOptimalProvider(request);
      
      if (!provider) {
        throw new Error('No suitable payment provider available');
      }
      
      this.emit('payment-start', request);
      
      // Process payment
      const response = await provider.pay(request);
      
      // Update analytics
      if (this.options.enableAnalytics) {
        this.updateAnalytics(request, response);
      }
      
      this.emit('payment-complete', response);
      
      return response;
    } catch (error: any) {
      const errorResponse: PaymentResponse = {
        success: false,
        status: 'failed',
        error: {
          code: error.code || 'payment_error',
          message: error.message,
          type: 'api_error'
        }
      };
      
      this.emit('payment-error', errorResponse);
      return errorResponse;
    }
  }

  /**
   * Get available payment methods for a request
   */
  async getAvailablePaymentMethods(request: Partial<PaymentRequest>): Promise<Array<{
    provider: PaymentProvider;
    method: PaymentMethod;
    available: boolean;
    estimatedFee?: string;
    processingTime?: string;
    supported: boolean;
  }>> {
    await this.initialize();
    
    const methods: Array<{
      provider: PaymentProvider;
      method: PaymentMethod;
      available: boolean;
      estimatedFee?: string;
      processingTime?: string;
      supported: boolean;
    }> = [];

    for (const [providerName, provider] of this.providers) {
      const available = await provider.isAvailable();
      const method = this.getMethodForProvider(providerName);
      
      methods.push({
        provider: providerName,
        method,
        available,
        estimatedFee: this.estimateFee(providerName, request.amount || '0', request.currency || 'USD'),
        processingTime: this.getProcessingTime(providerName),
        supported: true
      });
    }
    
    return methods.sort((a, b) => {
      if (a.available && !b.available) return -1;
      if (!a.available && b.available) return 1;
      return 0;
    });
  }

  /**
   * Create a customer
   */
  async createCustomer(customerData: CustomerData, provider?: PaymentProvider): Promise<Customer> {
    await this.initialize();
    
    const selectedProvider = provider ? this.providers.get(provider) : this.getDefaultCustomerProvider();
    
    if (!selectedProvider || !selectedProvider.createCustomer) {
      throw new Error('Customer creation not supported by selected provider');
    }
    
    return await selectedProvider.createCustomer(customerData);
  }

  /**
   * Create a subscription
   */
  async createSubscription(
    customerId: string,
    planId: string,
    provider?: PaymentProvider
  ): Promise<Subscription> {
    await this.initialize();
    
    const selectedProvider = provider ? this.providers.get(provider) : this.getDefaultSubscriptionProvider();
    
    if (!selectedProvider) {
      throw new Error('Subscription creation not supported by selected provider');
    }
    
    // This would call provider-specific subscription creation
    // Implementation depends on provider capabilities
    throw new Error('Subscription creation not yet implemented');
  }

  /**
   * Process a refund
   */
  async processRefund(
    paymentId: string,
    amount?: string,
    reason?: string,
    provider?: PaymentProvider
  ): Promise<any> {
    await this.initialize();
    
    const selectedProvider = provider ? this.providers.get(provider) : this.detectProviderFromPaymentId(paymentId);
    
    if (!selectedProvider || !selectedProvider.refundPayment) {
      throw new Error('Refund not supported by selected provider');
    }
    
    return await selectedProvider.refundPayment(paymentId, amount, reason);
  }

  /**
   * Get payment analytics
   */
  getAnalytics(): PaymentAnalytics {
    return this.analytics;
  }

  /**
   * Check payment method availability
   */
  async checkPaymentMethodAvailability(method: PaymentMethod): Promise<boolean> {
    await this.initialize();
    
    switch (method) {
      case 'card':
        return this.providers.has('stripe') || this.providers.has('square');
      case 'digital_wallet':
        return this.providers.has('applepay') || this.providers.has('googlepay');
      case 'crypto':
        return this.providers.has('walletconnect') || this.providers.has('metamask');
      case 'bank_transfer':
        return this.providers.has('stripe') || this.providers.has('paypal');
      default:
        return false;
    }
  }

  // Private methods

  private async initializeWeb2Providers(): Promise<void> {
    // Initialize Stripe
    if (this.config.stripe) {
      const stripe = new StripeProvider(this.config.stripe);
      await stripe.initialize(this.config.stripe);
      this.providers.set('stripe', stripe);
    }

    // Initialize PayPal
    if (this.config.paypal) {
      const paypal = new PayPalProvider(this.config.paypal);
      await paypal.initialize(this.config.paypal);
      this.providers.set('paypal', paypal);
    }

    // Initialize Apple Pay
    if (this.config.applePay) {
      const applePay = new ApplePayProvider(this.config.applePay);
      await applePay.initialize(this.config.applePay);
      this.providers.set('applepay', applePay);
    }

    // Initialize Google Pay
    if (this.config.googlePay) {
      // Google Pay provider would be initialized here
    }

    // Initialize other Web2 providers...
  }

  private async initializeWeb3Providers(): Promise<void> {
    // Initialize WalletConnect
    if (this.config.walletConnect) {
      // WalletConnect provider would be initialized here
    }

    // Initialize other Web3 providers...
  }

  private async initializeFraudDetection(): Promise<void> {
    // Initialize fraud detection service
    // This could integrate with services like Sift, Forter, or Kount
  }

  private validatePaymentRequest(request: PaymentRequest): void {
    if (!request.id) throw new Error('Payment request ID is required');
    if (!request.amount || parseFloat(request.amount) <= 0) {
      throw new Error('Valid payment amount is required');
    }
    if (!request.currency) throw new Error('Payment currency is required');
    if (!request.method) throw new Error('Payment method is required');
  }

  private async selectOptimalProvider(request: PaymentRequest): Promise<PaymentProviderInterface | null> {
    if (request.provider && this.providers.has(request.provider)) {
      return this.providers.get(request.provider) || null;
    }

    // Auto-select based on payment method
    const method = request.method;
    const amount = parseFloat(request.amount);
    const currency = request.currency;

    // Priority-based selection
    const candidates: Array<{ provider: PaymentProviderInterface; score: number }> = [];

    for (const [providerName, provider] of this.providers) {
      if (await provider.isAvailable()) {
        const score = this.calculateProviderScore(providerName, method, amount, currency);
        candidates.push({ provider, score });
      }
    }

    if (candidates.length === 0) return null;

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);
    
    return candidates[0].provider;
  }

  private calculateProviderScore(
    provider: PaymentProvider,
    method: PaymentMethod,
    amount: number,
    currency: string
  ): number {
    let score = 0;

    // Base compatibility score
    if (this.isProviderCompatible(provider, method)) {
      score += 10;
    }

    // Fee optimization
    const estimatedFee = parseFloat(this.estimateFee(provider, amount.toString(), currency));
    const feePercentage = estimatedFee / amount;
    score += (1 - feePercentage) * 5; // Lower fees = higher score

    // Processing time optimization
    const processingTime = this.getProcessingTime(provider);
    if (processingTime === 'instant') score += 3;
    else if (processingTime === 'minutes') score += 2;
    else if (processingTime === 'hours') score += 1;

    // Currency support
    if (this.supportsCurrency(provider, currency)) {
      score += 2;
    }

    return score;
  }

  private isProviderCompatible(provider: PaymentProvider, method: PaymentMethod): boolean {
    const compatibility: Record<PaymentProvider, PaymentMethod[]> = {
      'stripe': ['card', 'bank_transfer', 'digital_wallet'],
      'paypal': ['digital_wallet', 'bank_transfer'],
      'applepay': ['digital_wallet'],
      'googlepay': ['digital_wallet'],
      'walletconnect': ['crypto'],
      'metamask': ['crypto'],
      // Add other providers...
    } as any;

    return compatibility[provider]?.includes(method) || false;
  }

  private estimateFee(provider: PaymentProvider, amount: string, currency: string): string {
    const amt = parseFloat(amount);
    
    // Simplified fee estimation - in production, use actual provider APIs
    const feeStructures: Record<PaymentProvider, { percentage: number; fixed: number }> = {
      'stripe': { percentage: 0.029, fixed: 0.30 },
      'paypal': { percentage: 0.034, fixed: 0.00 },
      'applepay': { percentage: 0.029, fixed: 0.30 },
      'googlepay': { percentage: 0.029, fixed: 0.30 },
      'walletconnect': { percentage: 0.005, fixed: 0.00 },
      'metamask': { percentage: 0.005, fixed: 0.00 },
    } as any;

    const structure = feeStructures[provider] || { percentage: 0.03, fixed: 0.30 };
    const fee = (amt * structure.percentage) + structure.fixed;
    
    return fee.toFixed(2);
  }

  private getProcessingTime(provider: PaymentProvider): string {
    const processingTimes: Record<PaymentProvider, string> = {
      'stripe': 'instant',
      'paypal': 'instant',
      'applepay': 'instant',
      'googlepay': 'instant',
      'walletconnect': 'minutes',
      'metamask': 'minutes',
    } as any;

    return processingTimes[provider] || 'hours';
  }

  private supportsCurrency(provider: PaymentProvider, currency: string): boolean {
    // Simplified currency support check
    const cryptoProviders = ['walletconnect', 'metamask', 'coinbase'];
    const globalFiatProviders = ['stripe', 'paypal'];
    
    if (cryptoProviders.includes(provider)) {
      return ['ETH', 'BTC', 'USDC', 'USDT'].includes(currency.toUpperCase());
    }
    
    if (globalFiatProviders.includes(provider)) {
      return ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'].includes(currency.toUpperCase());
    }
    
    return true; // Default to supported
  }

  private getMethodForProvider(provider: PaymentProvider): PaymentMethod {
    const methodMapping: Record<PaymentProvider, PaymentMethod> = {
      'stripe': 'card',
      'paypal': 'digital_wallet',
      'applepay': 'digital_wallet',
      'googlepay': 'digital_wallet',
      'walletconnect': 'crypto',
      'metamask': 'crypto',
    } as any;

    return methodMapping[provider] || 'card';
  }

  private async checkForFraud(request: PaymentRequest): Promise<FraudDetectionResult> {
    // Simplified fraud detection - integrate with actual fraud detection services
    let riskScore = 0;
    const factors: Array<{ factor: string; impact: 'low' | 'medium' | 'high'; description: string }> = [];

    // Check amount
    const amount = parseFloat(request.amount);
    if (amount > 10000) {
      riskScore += 30;
      factors.push({
        factor: 'high_amount',
        impact: 'high',
        description: 'Transaction amount exceeds normal threshold'
      });
    }

    // Check for suspicious patterns
    if (request.customerInfo?.email?.includes('temp') || request.customerInfo?.email?.includes('fake')) {
      riskScore += 50;
      factors.push({
        factor: 'suspicious_email',
        impact: 'high',
        description: 'Email address appears suspicious'
      });
    }

    // Determine recommendation
    let recommendation: 'approve' | 'review' | 'decline';
    if (riskScore >= 70) recommendation = 'decline';
    else if (riskScore >= 40) recommendation = 'review';
    else recommendation = 'approve';

    return {
      riskScore,
      recommendation,
      factors
    };
  }

  private updateAnalytics(request: PaymentRequest, response: PaymentResponse): void {
    // Update analytics with transaction data
    this.analytics.totalTransactions++;
    
    if (response.success) {
      const amount = parseFloat(request.amount);
      this.analytics.totalVolume = (parseFloat(this.analytics.totalVolume) + amount).toString();
    }
    
    // Calculate success rate
    this.analytics.successRate = (this.analytics.successRate * (this.analytics.totalTransactions - 1) + 
                                  (response.success ? 1 : 0)) / this.analytics.totalTransactions;
  }

  private getDefaultCustomerProvider(): PaymentProviderInterface | null {
    // Return the first provider that supports customer management
    for (const [_, provider] of this.providers) {
      if (provider.createCustomer) {
        return provider;
      }
    }
    return null;
  }

  private getDefaultSubscriptionProvider(): PaymentProviderInterface | null {
    // Return the first provider that supports subscriptions
    if (this.providers.has('stripe')) return this.providers.get('stripe') || null;
    if (this.providers.has('paypal')) return this.providers.get('paypal') || null;
    return null;
  }

  private detectProviderFromPaymentId(paymentId: string): PaymentProviderInterface | null {
    // Detect provider based on payment ID format
    if (paymentId.startsWith('pi_') || paymentId.startsWith('ch_')) {
      return this.providers.get('stripe') || null;
    }
    if (paymentId.startsWith('PAY-') || paymentId.startsWith('PAYID-')) {
      return this.providers.get('paypal') || null;
    }
    return null;
  }

  private initializeAnalytics(): PaymentAnalytics {
    return {
      totalVolume: '0',
      totalTransactions: 0,
      successRate: 0,
      averageTransactionValue: '0',
      topPaymentMethods: [],
      conversionRate: 0,
      chargebackRate: 0,
      refundRate: 0,
      geographicBreakdown: []
    };
  }
}