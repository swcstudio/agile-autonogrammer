/**
 * Apple Pay Provider
 * Native Apple Pay integration with advanced features
 */

import { PaymentProviderInterface, PaymentRequest, PaymentResponse } from '../types';

export interface ApplePayConfig {
  merchantId: string;
  countryCode: string;
  currencyCode: string;
  supportedNetworks: string[];
  merchantCapabilities: string[];
  requiredBillingContactFields?: string[];
  requiredShippingContactFields?: string[];
  shippingMethods?: ApplePayShippingMethod[];
}

export interface ApplePayShippingMethod {
  label: string;
  detail?: string;
  amount: string;
  identifier: string;
}

export interface ApplePayLineItem {
  label: string;
  amount: string;
  type?: 'pending' | 'final';
}

export class ApplePayProvider implements PaymentProviderInterface {
  private config: ApplePayConfig;
  private initialized = false;
  private session?: any;

  constructor(config: ApplePayConfig) {
    this.config = config;
  }

  async initialize(config: ApplePayConfig): Promise<void> {
    if (this.initialized) return;

    this.config = { ...this.config, ...config };

    if (!this.isApplePayAvailable()) {
      throw new Error('Apple Pay is not available on this device');
    }

    this.initialized = true;
  }

  async isAvailable(): Promise<boolean> {
    return this.isApplePayAvailable() && await this.canMakePayments();
  }

  private isApplePayAvailable(): boolean {
    return typeof window !== 'undefined' && 
           'ApplePaySession' in window && 
           ApplePaySession.supportsVersion(3);
  }

  private async canMakePayments(): Promise<boolean> {
    if (!this.isApplePayAvailable()) return false;

    try {
      // Check if user has Apple Pay set up
      return ApplePaySession.canMakePayments();
    } catch (error) {
      console.error('Apple Pay availability check failed:', error);
      return false;
    }
  }

  async canMakePaymentsWithActiveCard(): Promise<boolean> {
    if (!this.isApplePayAvailable()) return false;

    try {
      return await ApplePaySession.canMakePaymentsWithActiveCard(this.config.merchantId);
    } catch (error) {
      console.error('Apple Pay active card check failed:', error);
      return false;
    }
  }

  async pay(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      await this.initialize(this.config);

      if (!await this.isAvailable()) {
        throw new Error('Apple Pay is not available');
      }

      return await this.createApplePaySession(request);
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        error: {
          code: error.code || 'apple_pay_error',
          message: error.message,
          type: 'api_error'
        }
      };
    }
  }

  private async createApplePaySession(request: PaymentRequest): Promise<PaymentResponse> {
    return new Promise((resolve, reject) => {
      const paymentRequest = this.buildApplePayRequest(request);

      this.session = new ApplePaySession(3, paymentRequest);

      this.session.onvalidatemerchant = async (event: any) => {
        try {
          const merchantSession = await this.validateMerchant(event.validationURL);
          this.session.completeMerchantValidation(merchantSession);
        } catch (error) {
          console.error('Merchant validation failed:', error);
          this.session.abort();
          resolve({
            success: false,
            status: 'failed',
            error: {
              code: 'merchant_validation_failed',
              message: 'Merchant validation failed',
              type: 'authentication_error'
            }
          });
        }
      };

      this.session.onpaymentmethodselected = (event: any) => {
        // Handle payment method selection
        const update = {
          newTotal: paymentRequest.total,
          newLineItems: paymentRequest.lineItems
        };
        this.session.completePaymentMethodSelection(update);
      };

      this.session.onshippingmethodselected = (event: any) => {
        // Handle shipping method selection
        const shippingMethod = event.shippingMethod;
        const update = this.calculateUpdatedTotals(request, shippingMethod);
        this.session.completeShippingMethodSelection(update);
      };

      this.session.onshippingcontactselected = (event: any) => {
        // Handle shipping contact selection
        const shippingContact = event.shippingContact;
        const update = this.calculateTaxAndShipping(request, shippingContact);
        this.session.completeShippingContactSelection(update);
      };

      this.session.onpaymentauthorized = async (event: any) => {
        try {
          const payment = event.payment;
          const result = await this.processPayment(payment, request);
          
          if (result.success) {
            this.session.completePayment(ApplePaySession.STATUS_SUCCESS);
            resolve(result);
          } else {
            this.session.completePayment(ApplePaySession.STATUS_FAILURE);
            resolve(result);
          }
        } catch (error: any) {
          this.session.completePayment(ApplePaySession.STATUS_FAILURE);
          resolve({
            success: false,
            status: 'failed',
            error: {
              code: 'payment_processing_failed',
              message: error.message,
              type: 'api_error'
            }
          });
        }
      };

      this.session.oncancel = () => {
        resolve({
          success: false,
          status: 'canceled',
          error: {
            code: 'user_cancelled',
            message: 'Payment was cancelled by user',
            type: 'invalid_request_error'
          }
        });
      };

      // Start the session
      this.session.begin();
    });
  }

  private buildApplePayRequest(request: PaymentRequest): any {
    const lineItems: ApplePayLineItem[] = [];
    
    // Add main item
    lineItems.push({
      label: request.description || 'Payment',
      amount: request.amount,
      type: 'final'
    });

    // Add invoice items if present
    if (request.invoice?.items) {
      request.invoice.items.forEach(item => {
        lineItems.push({
          label: `${item.name} (${item.quantity}x)`,
          amount: (parseFloat(item.unitPrice) * item.quantity).toFixed(2)
        });
      });
    }

    // Calculate total
    const total = {
      label: 'Katalyst',
      amount: request.amount,
      type: 'final'
    };

    const applePayRequest: any = {
      countryCode: this.config.countryCode,
      currencyCode: this.config.currencyCode || request.currency,
      supportedNetworks: this.config.supportedNetworks,
      merchantCapabilities: this.config.merchantCapabilities,
      total: total,
      lineItems: lineItems,
      requiredBillingContactFields: this.config.requiredBillingContactFields || ['postalAddress'],
      requiredShippingContactFields: this.config.requiredShippingContactFields || []
    };

    // Add shipping methods if configured
    if (this.config.shippingMethods && this.config.shippingMethods.length > 0) {
      applePayRequest.shippingMethods = this.config.shippingMethods.map(method => ({
        label: method.label,
        detail: method.detail,
        amount: method.amount,
        identifier: method.identifier
      }));
    }

    return applePayRequest;
  }

  private async validateMerchant(validationURL: string): Promise<any> {
    // This typically requires a server-side endpoint to validate the merchant
    // with Apple's servers using your merchant certificate
    const response = await fetch('/api/apple-pay/validate-merchant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        validationURL,
        merchantId: this.config.merchantId
      })
    });

    if (!response.ok) {
      throw new Error('Merchant validation failed');
    }

    return await response.json();
  }

  private calculateUpdatedTotals(request: PaymentRequest, shippingMethod: any): any {
    // Recalculate totals based on shipping method
    const shippingCost = parseFloat(shippingMethod.amount);
    const subtotal = parseFloat(request.amount);
    const newTotal = (subtotal + shippingCost).toFixed(2);

    return {
      newTotal: {
        label: 'Katalyst',
        amount: newTotal
      },
      newLineItems: [
        {
          label: 'Subtotal',
          amount: request.amount
        },
        {
          label: shippingMethod.label,
          amount: shippingMethod.amount
        }
      ]
    };
  }

  private calculateTaxAndShipping(request: PaymentRequest, shippingContact: any): any {
    // Calculate tax and shipping based on shipping address
    // This would typically involve calling a tax calculation service
    const subtotal = parseFloat(request.amount);
    const taxRate = this.getTaxRate(shippingContact);
    const tax = (subtotal * taxRate).toFixed(2);
    const total = (subtotal + parseFloat(tax)).toFixed(2);

    return {
      newTotal: {
        label: 'Katalyst',
        amount: total
      },
      newLineItems: [
        {
          label: 'Subtotal',
          amount: request.amount
        },
        {
          label: 'Tax',
          amount: tax
        }
      ]
    };
  }

  private getTaxRate(shippingContact: any): number {
    // Simple tax calculation - in production, use a proper tax service
    const state = shippingContact.administrativeArea;
    
    // Example tax rates by state (US)
    const taxRates: { [key: string]: number } = {
      'CA': 0.0875, // California
      'NY': 0.08,   // New York
      'TX': 0.0625, // Texas
      'FL': 0.06,   // Florida
      'WA': 0.065   // Washington
    };

    return taxRates[state] || 0.05; // Default 5%
  }

  private async processPayment(payment: any, request: PaymentRequest): Promise<PaymentResponse> {
    // Process the Apple Pay payment token with your payment processor
    // This typically involves sending the payment token to your server
    const response = await fetch('/api/apple-pay/process-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentToken: payment.token,
        billingContact: payment.billingContact,
        shippingContact: payment.shippingContact,
        shippingMethod: payment.shippingMethod,
        amount: request.amount,
        currency: request.currency,
        orderId: request.id
      })
    });

    if (!response.ok) {
      throw new Error('Payment processing failed');
    }

    const result = await response.json();

    return {
      success: result.success,
      status: result.success ? 'succeeded' : 'failed',
      paymentId: result.paymentId,
      transactionId: result.transactionId,
      amount: request.amount,
      currency: request.currency,
      metadata: {
        applePayTransactionId: payment.token.transactionIdentifier,
        deviceManufacturerIdentifier: payment.token.paymentMethod?.deviceManufacturerIdentifier,
        paymentNetwork: payment.token.paymentMethod?.network
      }
    };
  }

  // Apple Pay specific methods
  async openPaymentSetup(): Promise<void> {
    if (this.isApplePayAvailable() && ApplePaySession.openPaymentSetup) {
      ApplePaySession.openPaymentSetup(this.config.merchantId);
    } else {
      throw new Error('Payment setup not available');
    }
  }

  getApplePayButtonType(type: 'plain' | 'book' | 'buy' | 'checkout' | 'donate' | 'setup' = 'buy'): string {
    const buttonTypes = {
      'plain': 'apple-pay-button-type-plain',
      'book': 'apple-pay-button-type-book',
      'buy': 'apple-pay-button-type-buy',
      'checkout': 'apple-pay-button-type-checkout',
      'donate': 'apple-pay-button-type-donate',
      'setup': 'apple-pay-button-type-setup'
    };
    
    return buttonTypes[type];
  }

  getApplePayButtonStyle(style: 'black' | 'white' | 'white-outline' = 'black'): string {
    const buttonStyles = {
      'black': 'apple-pay-button-style-black',
      'white': 'apple-pay-button-style-white',
      'white-outline': 'apple-pay-button-style-white-outline'
    };
    
    return buttonStyles[style];
  }

  createApplePayButton(
    container: HTMLElement,
    type: 'plain' | 'book' | 'buy' | 'checkout' | 'donate' | 'setup' = 'buy',
    style: 'black' | 'white' | 'white-outline' = 'black',
    onClick?: () => void
  ): HTMLElement {
    const button = document.createElement('div');
    button.className = `apple-pay-button ${this.getApplePayButtonType(type)} ${this.getApplePayButtonStyle(style)}`;
    button.style.cssText = `
      -webkit-appearance: -apple-pay-button;
      -apple-pay-button-type: ${type};
      -apple-pay-button-style: ${style};
      width: 100%;
      height: 44px;
      cursor: pointer;
    `;

    if (onClick) {
      button.addEventListener('click', onClick);
    }

    container.appendChild(button);
    return button;
  }

  // Utility methods
  getSupportedNetworks(): string[] {
    return [
      'amex',
      'discover',
      'jcb',
      'masterCard',
      'privateLabel',
      'visa',
      'maestro',
      'eftpos',
      'electron',
      'vpay'
    ];
  }

  getMerchantCapabilities(): string[] {
    return [
      'supports3DS',
      'supportsEMV',
      'supportsCredit',
      'supportsDebit'
    ];
  }
}