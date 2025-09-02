/**
 * Google Pay Provider
 * Comprehensive Google Pay integration with advanced features
 */

import { PaymentProviderInterface, PaymentRequest, PaymentResponse } from '../types';

export interface GooglePayConfig {
  merchantId: string;
  merchantName: string;
  environment: 'TEST' | 'PRODUCTION';
  allowedCardNetworks: string[];
  allowedCardAuthMethods: string[];
  gatewayMerchantId?: string;
  gateway?: string;
  billingAddressRequired?: boolean;
  billingAddressFormat?: 'MIN' | 'FULL';
  shippingAddressRequired?: boolean;
  shippingAddressParameters?: {
    allowedCountryCodes?: string[];
    phoneNumberRequired?: boolean;
  };
}

export interface GooglePayTransactionInfo {
  displayItems?: Array<{
    label: string;
    type: 'LINE_ITEM' | 'SUBTOTAL' | 'TAX' | 'DISCOUNT';
    price: string;
    status?: 'FINAL' | 'PENDING';
  }>;
  totalPriceStatus: 'FINAL' | 'ESTIMATED' | 'NOT_CURRENTLY_KNOWN';
  totalPriceLabel?: string;
  totalPrice: string;
  currencyCode: string;
  countryCode?: string;
  checkoutOption?: 'DEFAULT' | 'COMPLETE_IMMEDIATE_PURCHASE';
}

export class GooglePayProvider implements PaymentProviderInterface {
  private paymentsClient: any;
  private config: GooglePayConfig;
  private initialized = false;

  constructor(config: GooglePayConfig) {
    this.config = config;
  }

  async initialize(config: GooglePayConfig): Promise<void> {
    if (this.initialized) return;

    this.config = { ...this.config, ...config };

    if (typeof window === 'undefined') {
      throw new Error('Google Pay is only available in browser environment');
    }

    // Load Google Pay API
    await this.loadGooglePayAPI();

    // Initialize payments client
    this.paymentsClient = new (window as any).google.payments.api.PaymentsClient({
      environment: this.config.environment
    });

    this.initialized = true;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.initialize(this.config);

      const isReadyToPayRequest = this.getGoogleIsReadyToPayRequest();
      const response = await this.paymentsClient.isReadyToPay(isReadyToPayRequest);
      
      return response.result;
    } catch (error) {
      console.error('Google Pay not available:', error);
      return false;
    }
  }

  async pay(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      await this.initialize(this.config);

      if (!await this.isAvailable()) {
        throw new Error('Google Pay is not available');
      }

      return await this.processGooglePayPayment(request);
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        error: {
          code: error.code || 'google_pay_error',
          message: error.message,
          type: 'api_error'
        }
      };
    }
  }

  private async processGooglePayPayment(request: PaymentRequest): Promise<PaymentResponse> {
    return new Promise(async (resolve, reject) => {
      try {
        const paymentDataRequest = this.getGooglePaymentDataRequest(request);
        
        const paymentData = await this.paymentsClient.loadPaymentData(paymentDataRequest);
        
        // Process the payment token
        const result = await this.processPaymentToken(paymentData, request);
        resolve(result);
      } catch (error: any) {
        if (error.statusCode === 'CANCELED') {
          resolve({
            success: false,
            status: 'canceled',
            error: {
              code: 'user_cancelled',
              message: 'Payment was cancelled by user',
              type: 'invalid_request_error'
            }
          });
        } else {
          resolve({
            success: false,
            status: 'failed',
            error: {
              code: error.statusCode || 'google_pay_error',
              message: error.statusMessage || error.message,
              type: 'api_error'
            }
          });
        }
      }
    });
  }

  private async processPaymentToken(paymentData: any, request: PaymentRequest): Promise<PaymentResponse> {
    // Extract payment token from Google Pay response
    const paymentMethodData = paymentData.paymentMethodData;
    const paymentToken = paymentMethodData.tokenizationData.token;
    
    // Send to your payment processor (e.g., Stripe, Adyen, etc.)
    const response = await fetch('/api/google-pay/process-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentToken,
        amount: request.amount,
        currency: request.currency,
        orderId: request.id,
        billingAddress: paymentData.email ? {
          email: paymentData.email
        } : undefined,
        shippingAddress: paymentData.shippingAddress
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
        googleTransactionId: paymentMethodData.info?.cardDetails?.pan || 'unknown',
        cardNetwork: paymentMethodData.info?.cardNetwork,
        cardDetails: paymentMethodData.info?.cardDetails
      }
    };
  }

  private getGoogleIsReadyToPayRequest(): any {
    return Object.assign(
      {},
      this.getGoogleBaseRequest(),
      {
        allowedPaymentMethods: [this.getGoogleCardPaymentMethod()]
      }
    );
  }

  private getGooglePaymentDataRequest(request: PaymentRequest): any {
    const paymentDataRequest = Object.assign({}, this.getGoogleBaseRequest());
    
    paymentDataRequest.allowedPaymentMethods = [this.getGoogleCardPaymentMethod()];
    paymentDataRequest.transactionInfo = this.getGoogleTransactionInfo(request);
    paymentDataRequest.merchantInfo = {
      merchantId: this.config.merchantId,
      merchantName: this.config.merchantName
    };

    // Email required for receipt
    if (request.customerInfo?.email) {
      paymentDataRequest.emailRequired = true;
    }

    // Shipping address
    if (this.config.shippingAddressRequired || request.shippingAddress) {
      paymentDataRequest.shippingAddressRequired = true;
      if (this.config.shippingAddressParameters) {
        paymentDataRequest.shippingAddressParameters = this.config.shippingAddressParameters;
      }
    }

    // Shipping options
    if (request.shippingAddress) {
      paymentDataRequest.callbackIntents = ['SHIPPING_ADDRESS', 'SHIPPING_OPTION', 'PAYMENT_AUTHORIZATION'];
    }

    return paymentDataRequest;
  }

  private getGoogleBaseRequest(): any {
    return {
      apiVersion: 2,
      apiVersionMinor: 0
    };
  }

  private getGoogleCardPaymentMethod(): any {
    return {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: this.config.allowedCardAuthMethods,
        allowedCardNetworks: this.config.allowedCardNetworks,
        billingAddressRequired: this.config.billingAddressRequired || false,
        billingAddressParameters: this.config.billingAddressRequired ? {
          format: this.config.billingAddressFormat || 'MIN',
          phoneNumberRequired: false
        } : undefined
      },
      tokenizationSpecification: this.getGoogleTokenizationSpecification()
    };
  }

  private getGoogleTokenizationSpecification(): any {
    if (this.config.gateway) {
      // Gateway tokenization (e.g., for Stripe, Adyen, etc.)
      return {
        type: 'PAYMENT_GATEWAY',
        parameters: {
          gateway: this.config.gateway,
          gatewayMerchantId: this.config.gatewayMerchantId
        }
      };
    } else {
      // Direct tokenization
      return {
        type: 'DIRECT',
        parameters: {
          protocolVersion: 'ECv2',
          publicKey: 'your-public-key-here' // This should be your public key
        }
      };
    }
  }

  private getGoogleTransactionInfo(request: PaymentRequest): GooglePayTransactionInfo {
    const transactionInfo: GooglePayTransactionInfo = {
      totalPriceStatus: 'FINAL',
      totalPrice: request.amount,
      currencyCode: request.currency,
      countryCode: this.config.shippingAddressParameters?.allowedCountryCodes?.[0] || 'US'
    };

    // Add line items if invoice is provided
    if (request.invoice?.items) {
      transactionInfo.displayItems = [];
      
      // Add individual items
      request.invoice.items.forEach(item => {
        transactionInfo.displayItems?.push({
          label: `${item.name} (${item.quantity}x)`,
          type: 'LINE_ITEM',
          price: (parseFloat(item.unitPrice) * item.quantity).toFixed(2),
          status: 'FINAL'
        });
      });
      
      // Add subtotal
      const subtotal = request.invoice.items.reduce(
        (sum, item) => sum + (parseFloat(item.unitPrice) * item.quantity), 0
      );
      
      transactionInfo.displayItems.push({
        label: 'Subtotal',
        type: 'SUBTOTAL',
        price: subtotal.toFixed(2),
        status: 'FINAL'
      });
      
      // Add tax if applicable
      const totalAmount = parseFloat(request.amount);
      const taxAmount = totalAmount - subtotal;
      
      if (taxAmount > 0) {
        transactionInfo.displayItems.push({
          label: 'Tax',
          type: 'TAX',
          price: taxAmount.toFixed(2),
          status: 'FINAL'
        });
      }
    }

    return transactionInfo;
  }

  private async loadGooglePayAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).google?.payments?.api?.PaymentsClient) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://pay.google.com/gp/p/js/pay.js';
      script.onload = () => {
        // Wait for API to be available
        const checkForAPI = () => {
          if ((window as any).google?.payments?.api?.PaymentsClient) {
            resolve();
          } else {
            setTimeout(checkForAPI, 100);
          }
        };
        checkForAPI();
      };
      script.onerror = () => reject(new Error('Failed to load Google Pay API'));
      document.head.appendChild(script);
    });
  }

  // Callback handling for dynamic pricing
  async onPaymentDataChanged(intermediatePaymentData: any): Promise<any> {
    return new Promise((resolve) => {
      let shippingCost = 0;
      let taxCost = 0;
      
      const shippingAddress = intermediatePaymentData.shippingAddress;
      const selectedShippingOption = intermediatePaymentData.shippingOptionData?.id;
      
      // Calculate shipping cost based on address
      if (shippingAddress) {
        shippingCost = this.calculateShippingCost(shippingAddress, selectedShippingOption);
      }
      
      // Calculate tax based on shipping address
      if (shippingAddress) {
        const subtotal = this.getSubtotalFromDisplayItems(intermediatePaymentData.transactionInfo.displayItems);
        taxCost = this.calculateTax(subtotal, shippingAddress);
      }
      
      // Update transaction info
      const newTransactionInfo = this.updateTransactionInfo(
        intermediatePaymentData.transactionInfo,
        shippingCost,
        taxCost
      );
      
      resolve({
        newTransactionInfo
      });
    });
  }

  private calculateShippingCost(shippingAddress: any, shippingOption?: string): number {
    // Simple shipping calculation based on country/state
    const country = shippingAddress.countryCode;
    const state = shippingAddress.administrativeArea;
    
    if (country === 'US') {
      if (shippingOption === 'express') return 15.00;
      if (state === 'CA' || state === 'NY') return 8.00;
      return 5.00;
    }
    
    // International shipping
    return 20.00;
  }

  private calculateTax(subtotal: number, shippingAddress: any): number {
    const state = shippingAddress.administrativeArea;
    
    // Simple tax calculation by state
    const taxRates: { [key: string]: number } = {
      'CA': 0.0875,
      'NY': 0.08,
      'TX': 0.0625,
      'FL': 0.06,
      'WA': 0.065
    };
    
    const taxRate = taxRates[state] || 0.05;
    return subtotal * taxRate;
  }

  private getSubtotalFromDisplayItems(displayItems: any[]): number {
    return displayItems
      .filter(item => item.type === 'LINE_ITEM')
      .reduce((sum, item) => sum + parseFloat(item.price), 0);
  }

  private updateTransactionInfo(transactionInfo: any, shippingCost: number, taxCost: number): any {
    const displayItems = [...transactionInfo.displayItems];
    
    // Remove existing shipping and tax items
    const filteredItems = displayItems.filter(
      item => item.type !== 'SHIPPING' && item.type !== 'TAX'
    );
    
    // Add new shipping cost
    if (shippingCost > 0) {
      filteredItems.push({
        label: 'Shipping',
        type: 'SHIPPING',
        price: shippingCost.toFixed(2),
        status: 'FINAL'
      });
    }
    
    // Add new tax cost
    if (taxCost > 0) {
      filteredItems.push({
        label: 'Tax',
        type: 'TAX',
        price: taxCost.toFixed(2),
        status: 'FINAL'
      });
    }
    
    // Calculate new total
    const newTotal = filteredItems
      .reduce((sum, item) => sum + parseFloat(item.price), 0);
    
    return {
      ...transactionInfo,
      displayItems: filteredItems,
      totalPrice: newTotal.toFixed(2)
    };
  }

  // Utility methods
  createGooglePayButton(
    container: HTMLElement,
    type: 'book' | 'buy' | 'checkout' | 'donate' | 'order' | 'pay' | 'plain' | 'subscribe' = 'buy',
    color: 'default' | 'black' | 'white' = 'default',
    onClick?: () => void
  ): HTMLElement {
    const button = this.paymentsClient.createButton({
      onClick: onClick || (() => {}),
      buttonType: type,
      buttonColor: color,
      buttonSizeMode: 'fill'
    });

    container.appendChild(button);
    return button;
  }

  getSupportedCardNetworks(): string[] {
    return [
      'AMEX',
      'DISCOVER',
      'INTERAC',
      'JCB',
      'MASTERCARD',
      'VISA'
    ];
  }

  getSupportedAuthMethods(): string[] {
    return [
      'PAN_ONLY',
      'CRYPTOGRAM_3DS'
    ];
  }

  // Configure shipping options
  getShippingOptions(): Array<{
    id: string;
    label: string;
    description: string;
  }> {
    return [
      {
        id: 'standard',
        label: 'Standard shipping',
        description: '5-7 business days'
      },
      {
        id: 'express',
        label: 'Express shipping',
        description: '1-2 business days'
      }
    ];
  }
}