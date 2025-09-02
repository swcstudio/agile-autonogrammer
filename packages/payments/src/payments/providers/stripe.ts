/**
 * Stripe Payment Provider
 * Full-featured Stripe integration with advanced features
 */

import { PaymentProviderInterface, PaymentRequest, PaymentResponse, PaymentIntent, RefundResponse, CustomerData, Customer, SavedPaymentMethod, WebhookEvent } from '../types';

export interface StripeConfig {
  publishableKey: string;
  secretKey?: string;
  webhookSecret?: string;
  apiVersion?: string;
  environment: 'test' | 'live';
  enableAdvancedFraud?: boolean;
  enableRadar?: boolean;
  enableSigma?: boolean;
}

export class StripeProvider implements PaymentProviderInterface {
  private stripe: any;
  private config: StripeConfig;
  private initialized = false;

  constructor(config: StripeConfig) {
    this.config = config;
  }

  async initialize(config: StripeConfig): Promise<void> {
    if (this.initialized) return;

    // Load Stripe.js dynamically
    if (typeof window !== 'undefined') {
      // Browser environment
      if (!(window as any).Stripe) {
        await this.loadStripeJS();
      }
      this.stripe = (window as any).Stripe(config.publishableKey);
    } else {
      // Node.js environment
      const Stripe = require('stripe');
      this.stripe = new Stripe(config.secretKey, {
        apiVersion: config.apiVersion || '2023-10-16'
      });
    }

    this.initialized = true;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.initialize(this.config);
      return true;
    } catch (error) {
      console.error('Stripe not available:', error);
      return false;
    }
  }

  async pay(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      await this.initialize(this.config);

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(request);
      
      if (!paymentIntent) {
        throw new Error('Failed to create payment intent');
      }

      // For browser environment, confirm with Stripe Elements
      if (typeof window !== 'undefined') {
        const { error, paymentIntent: confirmedIntent } = await this.stripe.confirmCardPayment(
          paymentIntent.clientSecret,
          {
            payment_method: {
              card: this.getCardElement(),
              billing_details: {
                name: request.customerInfo?.name,
                email: request.customerInfo?.email,
                phone: request.customerInfo?.phone,
                address: request.billingAddress ? {
                  line1: request.billingAddress.line1,
                  line2: request.billingAddress.line2,
                  city: request.billingAddress.city,
                  state: request.billingAddress.state,
                  postal_code: request.billingAddress.postalCode,
                  country: request.billingAddress.country
                } : undefined
              }
            }
          }
        );

        if (error) {
          return {
            success: false,
            status: 'failed',
            error: {
              code: error.code || 'unknown_error',
              message: error.message,
              type: error.type as any,
              decline_code: error.decline_code
            }
          };
        }

        return this.mapStripePaymentIntentToResponse(confirmedIntent);
      }

      // Server-side payment confirmation would go here
      return this.mapStripePaymentIntentToResponse(paymentIntent);
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        error: {
          code: error.code || 'unknown_error',
          message: error.message,
          type: 'api_error'
        }
      };
    }
  }

  async createPaymentIntent(request: PaymentRequest): Promise<PaymentIntent> {
    const params: any = {
      amount: Math.round(parseFloat(request.amount) * 100), // Convert to cents
      currency: request.currency.toLowerCase(),
      metadata: request.metadata,
      description: request.description
    };

    // Add customer information
    if (request.customerInfo?.email) {
      params.receipt_email = request.customerInfo.email;
    }

    // Add shipping information
    if (request.shippingAddress) {
      params.shipping = {
        name: request.customerInfo?.name,
        phone: request.customerInfo?.phone,
        address: {
          line1: request.shippingAddress.line1,
          line2: request.shippingAddress.line2,
          city: request.shippingAddress.city,
          state: request.shippingAddress.state,
          postal_code: request.shippingAddress.postalCode,
          country: request.shippingAddress.country
        }
      };
    }

    // Add 3D Secure requirement
    if (request.threeDSecure) {
      params.confirmation_method = 'manual';
      params.confirm = true;
    }

    // Add statement descriptor
    if (request.statementDescriptor) {
      params.statement_descriptor = request.statementDescriptor;
    }

    const paymentIntent = await this.stripe.paymentIntents.create(params);
    
    return {
      id: paymentIntent.id,
      amount: (paymentIntent.amount / 100).toString(),
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret,
      metadata: paymentIntent.metadata
    };
  }

  async confirmPayment(paymentIntentId: string, paymentMethod?: any): Promise<PaymentResponse> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethod
      });
      
      return this.mapStripePaymentIntentToResponse(paymentIntent);
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        error: {
          code: error.code,
          message: error.message,
          type: error.type
        }
      };
    }
  }

  async capturePayment(paymentId: string, amount?: string): Promise<PaymentResponse> {
    try {
      const params: any = {};
      if (amount) {
        params.amount_to_capture = Math.round(parseFloat(amount) * 100);
      }

      const paymentIntent = await this.stripe.paymentIntents.capture(paymentId, params);
      return this.mapStripePaymentIntentToResponse(paymentIntent);
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        error: {
          code: error.code,
          message: error.message,
          type: error.type
        }
      };
    }
  }

  async refundPayment(paymentId: string, amount?: string, reason?: string): Promise<RefundResponse> {
    try {
      const params: any = {
        payment_intent: paymentId
      };

      if (amount) {
        params.amount = Math.round(parseFloat(amount) * 100);
      }

      if (reason) {
        params.reason = reason;
      }

      const refund = await this.stripe.refunds.create(params);
      
      return {
        id: refund.id,
        amount: (refund.amount / 100).toString(),
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        receiptNumber: refund.receipt_number,
        metadata: refund.metadata
      };
    } catch (error: any) {
      throw new Error(`Refund failed: ${error.message}`);
    }
  }

  async createCustomer(customerData: CustomerData): Promise<Customer> {
    const customer = await this.stripe.customers.create({
      email: customerData.email,
      name: customerData.name,
      phone: customerData.phone,
      address: customerData.address,
      description: customerData.description,
      metadata: customerData.metadata
    });

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      description: customer.description,
      created: customer.created,
      metadata: customer.metadata,
      defaultPaymentMethod: customer.default_source
    };
  }

  async updateCustomer(customerId: string, updates: Partial<CustomerData>): Promise<Customer> {
    const customer = await this.stripe.customers.update(customerId, updates);
    
    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      description: customer.description,
      created: customer.created,
      metadata: customer.metadata,
      defaultPaymentMethod: customer.default_source
    };
  }

  async savePaymentMethod(customerId: string, paymentMethod: any): Promise<SavedPaymentMethod> {
    const pm = await this.stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customerId
    });

    return {
      id: pm.id,
      type: pm.type,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
        funding: pm.card.funding,
        country: pm.card.country,
        fingerprint: pm.card.fingerprint
      } : undefined,
      billingDetails: pm.billing_details,
      metadata: pm.metadata,
      created: pm.created
    };
  }

  async listPaymentMethods(customerId: string): Promise<SavedPaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });

    return paymentMethods.data.map((pm: any) => ({
      id: pm.id,
      type: pm.type,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
        funding: pm.card.funding,
        country: pm.card.country,
        fingerprint: pm.card.fingerprint
      } : undefined,
      billingDetails: pm.billing_details,
      metadata: pm.metadata,
      created: pm.created
    }));
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
      return true;
    } catch (error) {
      return false;
    }
  }

  verifyWebhook(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    try {
      this.stripe.webhooks.constructEvent(payload, signature, this.config.webhookSecret);
      return true;
    } catch (error) {
      return false;
    }
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSuccess(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  // Payment method specific features
  async setupApplePay(merchantId: string, countryCode: string): Promise<boolean> {
    if (typeof window === 'undefined' || !window.ApplePaySession) {
      return false;
    }

    return window.ApplePaySession.canMakePayments();
  }

  async setupGooglePay(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const paymentsClient = new (window as any).google.payments.api.PaymentsClient({
        environment: this.config.environment === 'live' ? 'PRODUCTION' : 'TEST'
      });

      const isReadyToPayRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['MASTERCARD', 'VISA']
          }
        }]
      };

      const response = await paymentsClient.isReadyToPay(isReadyToPayRequest);
      return response.result;
    } catch (error) {
      return false;
    }
  }

  // Advanced Stripe features
  async createSetupIntent(customerId: string): Promise<any> {
    return await this.stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session'
    });
  }

  async createSubscription(customerId: string, priceId: string, options?: any): Promise<any> {
    return await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      ...options
    });
  }

  async calculateTax(params: any): Promise<any> {
    return await this.stripe.tax.calculations.create(params);
  }

  // Private helper methods
  private async loadStripeJS(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Stripe.js'));
      document.head.appendChild(script);
    });
  }

  private getCardElement(): any {
    // This would typically be managed by Stripe Elements
    // Implementation depends on your UI framework
    return null;
  }

  private mapStripePaymentIntentToResponse(paymentIntent: any): PaymentResponse {
    return {
      success: paymentIntent.status === 'succeeded',
      paymentId: paymentIntent.id,
      transactionId: paymentIntent.charges?.data[0]?.id,
      status: paymentIntent.status,
      amount: (paymentIntent.amount / 100).toString(),
      currency: paymentIntent.currency,
      receiptUrl: paymentIntent.charges?.data[0]?.receipt_url,
      nextAction: paymentIntent.next_action,
      paymentMethod: paymentIntent.payment_method ? {
        id: paymentIntent.payment_method.id || paymentIntent.payment_method,
        type: paymentIntent.payment_method.type,
        card: paymentIntent.payment_method.card
      } : undefined,
      metadata: paymentIntent.metadata
    };
  }

  private async handlePaymentSuccess(paymentIntent: any): Promise<void> {
    // Custom logic for successful payments
    console.log('Payment succeeded:', paymentIntent.id);
  }

  private async handlePaymentFailed(paymentIntent: any): Promise<void> {
    // Custom logic for failed payments
    console.log('Payment failed:', paymentIntent.id);
  }

  private async handleInvoicePaymentSuccess(invoice: any): Promise<void> {
    // Custom logic for subscription payments
    console.log('Invoice payment succeeded:', invoice.id);
  }

  private async handleSubscriptionCanceled(subscription: any): Promise<void> {
    // Custom logic for canceled subscriptions
    console.log('Subscription canceled:', subscription.id);
  }
}