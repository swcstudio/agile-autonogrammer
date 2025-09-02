/**
 * Payment Integration Types
 * Comprehensive type definitions for crypto and fiat payment processing
 */

export type PaymentProvider =
  // Web3 Providers
  | 'walletconnect'
  | 'hyperswitch'
  | 'oneinch'
  | 'symbiosis'
  | 'metamask'
  | 'coinbase'
  | 'rainbow'
  | 'trust'
  | 'phantom'
  // Web2 Providers
  | 'stripe'
  | 'paypal'
  | 'square'
  | 'braintree'
  | 'adyen'
  | 'klarna'
  | 'affirm'
  | 'afterpay'
  | 'razorpay'
  | 'payu'
  | 'mollie'
  | 'worldpay'
  // Digital Wallets
  | 'applepay'
  | 'googlepay'
  | 'amazonpay'
  | 'samsungpay'
  | 'alipay'
  | 'wechatpay'
  | 'venmo'
  | 'cashapp'
  // Buy Now Pay Later
  | 'sezzle'
  | 'zip'
  | 'splitit'
  // Crypto Payment Processors
  | 'coinbase_commerce'
  | 'bitpay'
  | 'coingate'
  | 'nowpayments';

export type PaymentMethod = 
  // Web3 Methods
  | 'crypto' 
  | 'nft' 
  | 'swap' 
  | 'bridge'
  | 'defi_stake'
  | 'defi_yield'
  // Web2 Methods
  | 'card'
  | 'bank_transfer'
  | 'digital_wallet'
  | 'ach'
  | 'sepa'
  | 'wire'
  | 'check'
  | 'cash'
  // Alternative Methods
  | 'bnpl' // Buy Now Pay Later
  | 'subscription'
  | 'installment'
  | 'recurring'
  | 'escrow'
  | 'invoice';

export type SupportedChain =
  | 'ethereum'
  | 'polygon'
  | 'bsc'
  | 'arbitrum'
  | 'optimism'
  | 'avalanche'
  | 'solana'
  | 'bitcoin'
  | 'cosmos';

export interface ChainConfig {
  chainId: number | string;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  testnet?: boolean;
}

export interface WalletInfo {
  address: string;
  chainId: number | string;
  provider: PaymentProvider;
  connected: boolean;
  balance?: string;
  ensName?: string;
}

export interface PaymentRequest {
  id: string;
  amount: string;
  currency: string;
  recipient?: string;
  metadata?: Record<string, any>;
  chain?: SupportedChain;
  method: PaymentMethod;
  provider?: PaymentProvider; // Auto-detect if not provided
  // Web2 specific fields
  customerInfo?: {
    email?: string;
    phone?: string;
    name?: string;
    address?: Address;
  };
  billingAddress?: Address;
  shippingAddress?: Address;
  description?: string;
  invoice?: {
    number: string;
    dueDate?: Date;
    items: InvoiceItem[];
  };
  subscription?: {
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount?: number;
    trialPeriodDays?: number;
  };
  installments?: {
    count: number;
    frequency: 'weekly' | 'monthly';
  };
  // Security and compliance
  threeDSecure?: boolean;
  captureMethod?: 'automatic' | 'manual';
  statementDescriptor?: string;
  returnUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  txHash?: string;
  paymentId?: string;
  transactionId?: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'requires_action';
  amount?: string;
  currency?: string;
  error?: PaymentError;
  metadata?: Record<string, any>;
  // Web2 specific fields
  chargeId?: string;
  receiptUrl?: string;
  nextAction?: {
    type: 'redirect_to_url' | 'use_stripe_sdk' | 'verify_with_microdeposits';
    redirect?: {
      return_url: string;
      url: string;
    };
  };
  paymentMethod?: {
    id: string;
    type: string;
    card?: CardInfo;
    billingDetails?: Address;
  };
  // Fees and net amounts
  applicationFeeAmount?: string;
  processingFee?: string;
  netAmount?: string;
  // Receipt and invoice data
  receiptEmail?: string;
  receiptNumber?: string;
  invoiceId?: string;
  // Risk assessment
  riskScore?: number;
  fraudDetection?: {
    score: number;
    recommendation: 'approve' | 'review' | 'decline';
    reasons?: string[];
  };
}

export interface SwapRequest {
  fromToken: string;
  toToken: string;
  amount: string;
  slippage: number;
  chain: SupportedChain;
  recipient?: string;
}

export interface SwapResponse {
  success: boolean;
  txHash?: string;
  estimatedGas?: string;
  priceImpact?: string;
  route?: SwapRoute[];
  error?: string;
}

export interface SwapRoute {
  protocol: string;
  percentage: number;
  fromToken: string;
  toToken: string;
}

export interface BridgeRequest {
  fromChain: SupportedChain;
  toChain: SupportedChain;
  token: string;
  amount: string;
  recipient: string;
}

export interface BridgeResponse {
  success: boolean;
  txHash?: string;
  estimatedTime?: number;
  fee?: string;
  error?: string;
}

export interface NFTPaymentRequest {
  contractAddress: string;
  tokenId: string;
  price: string;
  currency: string;
  chain: SupportedChain;
  seller: string;
  buyer: string;
}

export interface PaymentConfig {
  // Web3 Providers
  walletConnect?: {
    projectId: string;
    chains: ChainConfig[];
    metadata: {
      name: string;
      description: string;
      url: string;
      icons: string[];
    };
  };
  hyperswitch?: {
    apiKey: string;
    publishableKey: string;
    environment: 'sandbox' | 'production';
    supportedMethods: string[];
  };
  oneInch?: {
    apiKey: string;
    baseUrl: string;
    supportedChains: number[];
  };
  symbiosis?: {
    apiUrl: string;
    supportedChains: string[];
  };
  // Web2 Payment Processors
  stripe?: {
    publishableKey: string;
    secretKey?: string;
    webhookSecret?: string;
    apiVersion?: string;
    environment: 'test' | 'live';
  };
  paypal?: {
    clientId: string;
    clientSecret?: string;
    environment: 'sandbox' | 'production';
    currency: string;
    locale?: string;
  };
  square?: {
    applicationId: string;
    locationId: string;
    accessToken?: string;
    environment: 'sandbox' | 'production';
  };
  braintree?: {
    merchantId: string;
    publicKey: string;
    privateKey?: string;
    environment: 'sandbox' | 'production';
  };
  adyen?: {
    apiKey: string;
    merchantAccount: string;
    environment: 'test' | 'live';
    clientKey: string;
  };
  razorpay?: {
    keyId: string;
    keySecret?: string;
    currency: string;
    environment: 'test' | 'live';
  };
  // Digital Wallets
  applePay?: {
    merchantId: string;
    countryCode: string;
    currencyCode: string;
    supportedNetworks: string[];
    merchantCapabilities: string[];
  };
  googlePay?: {
    merchantId: string;
    merchantName: string;
    environment: 'TEST' | 'PRODUCTION';
    allowedCardNetworks: string[];
    allowedCardAuthMethods: string[];
  };
  amazonPay?: {
    sellerId: string;
    clientId: string;
    region: 'us' | 'eu' | 'jp';
    environment: 'sandbox' | 'production';
  };
  // Asian Payment Methods
  alipay?: {
    appId: string;
    privateKey?: string;
    environment: 'sandbox' | 'production';
  };
  wechatPay?: {
    appId: string;
    mchId: string;
    apiKey?: string;
    environment: 'sandbox' | 'production';
  };
  // BNPL Providers
  klarna?: {
    username: string;
    password?: string;
    region: 'na' | 'eu' | 'oc';
    environment: 'playground' | 'production';
  };
  affirm?: {
    publicApiKey: string;
    privateApiKey?: string;
    environment: 'sandbox' | 'production';
  };
  afterpay?: {
    merchantId: string;
    secretKey?: string;
    environment: 'sandbox' | 'production';
  };
  // Crypto Payment Processors
  coinbaseCommerce?: {
    apiKey: string;
    webhookSecret?: string;
    environment: 'sandbox' | 'production';
  };
  bitpay?: {
    token: string;
    environment: 'test' | 'prod';
  };
}

export interface PaymentState {
  wallet: WalletInfo | null;
  loading: boolean;
  error: string | null;
  transactions: Transaction[];
  supportedChains: ChainConfig[];
}

export interface Transaction {
  id: string;
  hash: string;
  type: PaymentMethod;
  status: 'pending' | 'confirmed' | 'failed';
  amount: string;
  currency: string;
  timestamp: number;
  chain: SupportedChain;
  metadata?: Record<string, any>;
}

export interface PaymentHooks {
  onConnect?: (wallet: WalletInfo) => void;
  onDisconnect?: () => void;
  onPaymentStart?: (request: PaymentRequest) => void;
  onPaymentSuccess?: (response: PaymentResponse) => void;
  onPaymentError?: (error: string) => void;
  onChainChange?: (chainId: number | string) => void;
  onAccountChange?: (accounts: string[]) => void;
}

export interface PaymentProviderInterface {
  // Universal methods
  initialize(config: any): Promise<void>;
  isAvailable(): Promise<boolean>;
  pay(request: PaymentRequest): Promise<PaymentResponse>;
  
  // Web3 specific methods
  connect?(): Promise<WalletInfo>;
  disconnect?(): Promise<void>;
  getBalance?(address: string, token?: string): Promise<string>;
  switchChain?(chainId: number | string): Promise<void>;
  addToken?(token: TokenInfo): Promise<boolean>;
  
  // Web2 specific methods
  createPaymentIntent?(request: PaymentRequest): Promise<PaymentIntent>;
  confirmPayment?(paymentIntentId: string, paymentMethod?: any): Promise<PaymentResponse>;
  capturePayment?(paymentId: string, amount?: string): Promise<PaymentResponse>;
  refundPayment?(paymentId: string, amount?: string, reason?: string): Promise<RefundResponse>;
  
  // Customer management
  createCustomer?(customerData: CustomerData): Promise<Customer>;
  updateCustomer?(customerId: string, updates: Partial<CustomerData>): Promise<Customer>;
  
  // Payment methods
  savePaymentMethod?(customerId: string, paymentMethod: any): Promise<SavedPaymentMethod>;
  listPaymentMethods?(customerId: string): Promise<SavedPaymentMethod[]>;
  deletePaymentMethod?(paymentMethodId: string): Promise<boolean>;
  
  // Webhooks and events
  verifyWebhook?(payload: string, signature: string): boolean;
  handleWebhook?(event: WebhookEvent): Promise<void>;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  chainId: number;
  // Additional token metadata
  coingeckoId?: string;
  coinmarketcapId?: string;
  price?: string;
  priceChange24h?: number;
  marketCap?: string;
  totalSupply?: string;
  circulatingSupply?: string;
}

export interface SwapProviderInterface {
  getQuote(request: SwapRequest): Promise<SwapResponse>;
  executeSwap(request: SwapRequest): Promise<SwapResponse>;
  getSupportedTokens(chainId: number): Promise<TokenInfo[]>;
}

export interface BridgeProviderInterface {
  getBridgeQuote(request: BridgeRequest): Promise<BridgeResponse>;
  executeBridge(request: BridgeRequest): Promise<BridgeResponse>;
  getSupportedChains(): Promise<ChainConfig[]>;
}

export interface PaymentManagerOptions {
  config: PaymentConfig;
  hooks?: PaymentHooks;
  defaultChain?: SupportedChain;
  autoConnect?: boolean;
  // Web2 specific options
  defaultCurrency?: string;
  defaultCountry?: string;
  enableFraudDetection?: boolean;
  enableAnalytics?: boolean;
  // UI/UX options
  theme?: PaymentTheme;
  locale?: string;
  customFields?: CustomField[];
  // Security options
  enableThreeDSecure?: boolean;
  riskThreshold?: number;
  // Business logic
  taxCalculation?: boolean;
  shippingCalculation?: boolean;
  discountCodes?: boolean;
}

// Additional interfaces needed for comprehensive payment support

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: string;
  taxRate?: number;
  category?: string;
}

export interface PaymentError {
  code: string;
  message: string;
  type: 'card_error' | 'invalid_request_error' | 'api_error' | 'authentication_error' | 'rate_limit_error';
  decline_code?: string;
  param?: string;
}

export interface CardInfo {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
  country: string;
  fingerprint: string;
}

export interface PaymentIntent {
  id: string;
  amount: string;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
  clientSecret: string;
  paymentMethod?: string;
  metadata?: Record<string, any>;
  nextAction?: any;
}

export interface RefundResponse {
  id: string;
  amount: string;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  reason?: string;
  receiptNumber?: string;
  metadata?: Record<string, any>;
}

export interface CustomerData {
  email?: string;
  name?: string;
  phone?: string;
  address?: Address;
  description?: string;
  metadata?: Record<string, any>;
}

export interface Customer {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  address?: Address;
  description?: string;
  created: number;
  metadata?: Record<string, any>;
  defaultPaymentMethod?: string;
}

export interface SavedPaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'wallet';
  card?: CardInfo;
  billingDetails?: Address;
  metadata?: Record<string, any>;
  created: number;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
  livemode: boolean;
  request?: {
    id: string;
    idempotency_key?: string;
  };
}

export interface PaymentTheme {
  colorPrimary?: string;
  colorBackground?: string;
  colorText?: string;
  colorDanger?: string;
  fontFamily?: string;
  borderRadius?: string;
  spacingUnit?: string;
}

export interface CustomField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'checkbox';
  required?: boolean;
  options?: string[];
  validation?: RegExp;
}

export interface PaymentAnalytics {
  totalVolume: string;
  totalTransactions: number;
  successRate: number;
  averageTransactionValue: string;
  topPaymentMethods: Array<{
    method: string;
    percentage: number;
    volume: string;
  }>;
  conversionRate: number;
  chargebackRate: number;
  refundRate: number;
  geographicBreakdown: Array<{
    country: string;
    volume: string;
    transactions: number;
  }>;
}

export interface FraudDetectionResult {
  riskScore: number;
  recommendation: 'approve' | 'review' | 'decline';
  factors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high';
    description: string;
  }>;
  deviceFingerprint?: string;
  ipGeolocation?: {
    country: string;
    region: string;
    city: string;
    isVpn: boolean;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  amount: string;
  currency: string;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  trialPeriodDays?: number;
  metadata?: Record<string, any>;
}

export interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing';
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  canceledAt?: number;
  trialStart?: number;
  trialEnd?: number;
  metadata?: Record<string, any>;
}

export interface TaxCalculation {
  totalTax: string;
  taxBreakdown: Array<{
    type: 'sales_tax' | 'vat' | 'gst' | 'other';
    rate: number;
    amount: string;
    jurisdiction: string;
  }>;
}

export interface ShippingRate {
  id: string;
  name: string;
  description?: string;
  amount: string;
  currency: string;
  estimatedDelivery?: {
    minimum: number;
    maximum: number;
    type: 'business_day' | 'day' | 'hour';
  };
}

export interface DiscountCode {
  id: string;
  code: string;
  type: 'percentage' | 'fixed_amount';
  value: string;
  currency?: string;
  minimumAmount?: string;
  maximumDiscount?: string;
  validFrom: number;
  validTo: number;
  usageLimit?: number;
  usedCount: number;
  metadata?: Record<string, any>;
}
