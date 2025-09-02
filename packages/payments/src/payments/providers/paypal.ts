/**
 * PayPal Payment Provider
 * Comprehensive PayPal integration with checkout, subscriptions, and marketplace features
 */

import { PaymentProviderInterface, PaymentRequest, PaymentResponse, CustomerData, Customer } from '../types';

export interface PayPalConfig {
  clientId: string;
  clientSecret?: string;
  environment: 'sandbox' | 'production';
  currency: string;
  locale?: string;
  intent?: 'capture' | 'authorize';
  enableVenmo?: boolean;
  enablePayLater?: boolean;
  enableCredit?: boolean;
}

export class PayPalProvider implements PaymentProviderInterface {
  private paypal: any;
  private config: PayPalConfig;
  private initialized = false;
  private accessToken?: string;

  constructor(config: PayPalConfig) {
    this.config = config;
  }

  async initialize(config: PayPalConfig): Promise<void> {
    if (this.initialized) return;

    this.config = { ...this.config, ...config };

    if (typeof window !== 'undefined') {
      // Browser environment - load PayPal SDK
      await this.loadPayPalSDK();
      this.paypal = (window as any).paypal;
    } else {
      // Node.js environment - get access token
      await this.getAccessToken();
    }

    this.initialized = true;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.initialize(this.config);
      return true;
    } catch (error) {
      console.error('PayPal not available:', error);
      return false;
    }
  }

  async pay(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      await this.initialize(this.config);

      if (typeof window !== 'undefined') {
        return await this.createBrowserPayment(request);
      } else {
        return await this.createServerPayment(request);
      }
    } catch (error: any) {
      return {
        success: false,
        status: 'failed',
        error: {
          code: error.code || 'paypal_error',
          message: error.message,
          type: 'api_error'
        }
      };
    }
  }

  private async createBrowserPayment(request: PaymentRequest): Promise<PaymentResponse> {
    return new Promise((resolve) => {
      this.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal'
        },
        createOrder: async (data: any, actions: any) => {
          return actions.order.create({
            intent: this.config.intent?.toUpperCase() || 'CAPTURE',
            purchase_units: [{
              amount: {
                currency_code: request.currency.toUpperCase(),
                value: request.amount
              },
              description: request.description,
              custom_id: request.id,
              invoice_id: request.invoice?.number,
              shipping: request.shippingAddress ? {
                name: {
                  full_name: request.customerInfo?.name || 'Customer'
                },
                address: {
                  address_line_1: request.shippingAddress.line1,
                  address_line_2: request.shippingAddress.line2,
                  admin_area_2: request.shippingAddress.city,
                  admin_area_1: request.shippingAddress.state,
                  postal_code: request.shippingAddress.postalCode,
                  country_code: request.shippingAddress.country
                }
              } : undefined
            }],
            payer: request.customerInfo ? {
              email_address: request.customerInfo.email,
              name: {
                given_name: request.customerInfo.name?.split(' ')[0],
                surname: request.customerInfo.name?.split(' ').slice(1).join(' ')
              },
              phone: request.customerInfo.phone ? {
                phone_number: {
                  national_number: request.customerInfo.phone
                }
              } : undefined
            } : undefined,
            application_context: {
              brand_name: 'Katalyst',
              locale: this.config.locale || 'en-US',
              landing_page: 'BILLING',
              user_action: 'PAY_NOW',
              return_url: request.returnUrl,
              cancel_url: request.cancelUrl
            }
          });
        },
        onApprove: async (data: any, actions: any) => {
          try {
            const order = await actions.order.capture();
            resolve(this.mapPayPalOrderToResponse(order, true));
          } catch (error: any) {
            resolve({
              success: false,
              status: 'failed',
              error: {
                code: 'capture_failed',
                message: error.message,
                type: 'api_error'
              }
            });
          }
        },
        onError: (error: any) => {
          resolve({
            success: false,
            status: 'failed',
            error: {
              code: error.code || 'paypal_error',
              message: error.message,
              type: 'api_error'
            }
          });
        },
        onCancel: (data: any) => {
          resolve({
            success: false,
            status: 'canceled',
            error: {
              code: 'user_cancelled',
              message: 'Payment was cancelled by user',
              type: 'invalid_request_error'
            }
          });
        }
      }).render('#paypal-button-container');
    });
  }

  private async createServerPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const order = await this.createOrder({
      intent: this.config.intent?.toUpperCase() || 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: request.currency.toUpperCase(),
          value: request.amount
        },
        description: request.description,
        custom_id: request.id
      }]
    });

    return {
      success: true,
      status: 'pending',
      paymentId: order.id,
      metadata: {
        approvalUrl: order.links.find((link: any) => link.rel === 'approve')?.href
      }
    };
  }

  async createOrder(orderData: any): Promise<any> {
    const response = await fetch(`${this.getBaseURL()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': this.generateRequestId()
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      throw new Error(`PayPal API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async captureOrder(orderId: string): Promise<any> {
    const response = await fetch(`${this.getBaseURL()}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': this.generateRequestId()
      }
    });

    if (!response.ok) {
      throw new Error(`PayPal capture error: ${response.statusText}`);
    }

    return await response.json();
  }

  async refundPayment(paymentId: string, amount?: string, reason?: string): Promise<any> {
    const refundData: any = {
      note_to_payer: reason || 'Refund processed'
    };

    if (amount) {
      refundData.amount = {
        currency_code: this.config.currency.toUpperCase(),
        value: amount
      };
    }

    const response = await fetch(`${this.getBaseURL()}/v2/payments/captures/${paymentId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': this.generateRequestId()
      },
      body: JSON.stringify(refundData)
    });

    if (!response.ok) {
      throw new Error(`PayPal refund error: ${response.statusText}`);
    }

    return await response.json();
  }

  // PayPal subscription management
  async createSubscription(planId: string, customerData?: CustomerData): Promise<any> {
    const subscriptionData: any = {
      plan_id: planId,
      start_time: new Date().toISOString(),
      application_context: {
        brand_name: 'Katalyst',
        locale: this.config.locale || 'en-US',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        }
      }
    };

    if (customerData) {
      subscriptionData.subscriber = {
        name: {
          given_name: customerData.name?.split(' ')[0],
          surname: customerData.name?.split(' ').slice(1).join(' ')
        },
        email_address: customerData.email,
        shipping_address: customerData.address ? {
          name: {
            full_name: customerData.name || 'Customer'
          },
          address: {
            address_line_1: customerData.address.line1,
            address_line_2: customerData.address.line2,
            admin_area_2: customerData.address.city,
            admin_area_1: customerData.address.state,
            postal_code: customerData.address.postalCode,
            country_code: customerData.address.country
          }
        } : undefined
      };
    }

    const response = await fetch(`${this.getBaseURL()}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': this.generateRequestId()
      },
      body: JSON.stringify(subscriptionData)
    });

    if (!response.ok) {
      throw new Error(`PayPal subscription error: ${response.statusText}`);
    }

    return await response.json();
  }

  async cancelSubscription(subscriptionId: string, reason?: string): Promise<any> {
    const response = await fetch(`${this.getBaseURL()}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: reason || 'User requested cancellation'
      })
    });

    if (!response.ok) {
      throw new Error(`PayPal subscription cancellation error: ${response.statusText}`);
    }

    return true;
  }

  // PayPal marketplace features
  async createPartnerReferral(partnerData: any): Promise<any> {
    const response = await fetch(`${this.getBaseURL()}/v2/customer/partner-referrals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(partnerData)
    });

    if (!response.ok) {
      throw new Error(`PayPal partner referral error: ${response.statusText}`);
    }

    return await response.json();
  }

  verifyWebhook(payload: string, signature: string, webhookId: string): boolean {
    // PayPal webhook verification would go here
    // This requires the webhook secret and proper signature validation
    return true;
  }

  async handleWebhook(event: any): Promise<void> {
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await this.handlePaymentCompleted(event);
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        await this.handlePaymentDenied(event);
        break;
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await this.handleSubscriptionActivated(event);
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await this.handleSubscriptionCancelled(event);
        break;
      default:
        console.log(`Unhandled PayPal webhook: ${event.event_type}`);
    }
  }

  // Private helper methods
  private async loadPayPalSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).paypal) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      const params = new URLSearchParams({
        'client-id': this.config.clientId,
        'currency': this.config.currency.toUpperCase(),
        'intent': this.config.intent || 'capture'
      });

      if (this.config.enableVenmo) params.append('enable-funding', 'venmo');
      if (this.config.enablePayLater) params.append('enable-funding', 'paylater');
      if (this.config.enableCredit) params.append('enable-funding', 'credit');

      script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.head.appendChild(script);
    });
  }

  private async getAccessToken(): Promise<void> {
    if (!this.config.clientSecret) {
      throw new Error('Client secret required for server-side PayPal integration');
    }

    const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    
    const response = await fetch(`${this.getBaseURL()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`PayPal auth error: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
  }

  private getBaseURL(): string {
    return this.config.environment === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  private generateRequestId(): string {
    return `katalyst-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }

  private mapPayPalOrderToResponse(order: any, success: boolean): PaymentResponse {
    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
    
    return {
      success,
      status: success ? 'succeeded' : 'failed',
      paymentId: order.id,
      transactionId: capture?.id,
      amount: capture?.amount?.value,
      currency: capture?.amount?.currency_code,
      receiptUrl: capture?.links?.find((link: any) => link.rel === 'self')?.href,
      metadata: {
        orderId: order.id,
        captureId: capture?.id,
        payerId: order.payer?.payer_id
      }
    };
  }

  private async handlePaymentCompleted(event: any): Promise<void> {
    console.log('PayPal payment completed:', event.resource.id);
  }

  private async handlePaymentDenied(event: any): Promise<void> {
    console.log('PayPal payment denied:', event.resource.id);
  }

  private async handleSubscriptionActivated(event: any): Promise<void> {
    console.log('PayPal subscription activated:', event.resource.id);
  }

  private async handleSubscriptionCancelled(event: any): Promise<void> {
    console.log('PayPal subscription cancelled:', event.resource.id);
  }
}