import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Lock,
  Check,
  ChevronRight,
  ChevronLeft,
  ShoppingCart,
  User,
  MapPin,
  Package,
  Shield,
  AlertCircle,
  Bitcoin,
  Smartphone,
  Globe,
  Loader2
} from 'lucide-react';

// Katalyst Core
import { useMultithreading } from '@katalyst/hooks/use-multithreading';
import { usePayment } from '../payments/hooks';

// Design System
import { Button } from '@katalyst/design-system/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@katalyst/design-system/ui/card';
import { Input } from '@katalyst/design-system/ui/input';
import { Label } from '@katalyst/design-system/ui/label';
import { RadioGroup, RadioGroupItem } from '@katalyst/design-system/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@katalyst/design-system/ui/select';
import { Badge } from '@katalyst/design-system/ui/badge';
import { Progress } from '@katalyst/design-system/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@katalyst/design-system/ui/tabs';
import { Alert, AlertDescription } from '@katalyst/design-system/ui/alert';
import { Separator } from '@katalyst/design-system/ui/separator';
import { GlowCard } from '@katalyst/design-system/components/GlowCard';

interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CheckoutData {
  customer: {
    email: string;
    name: string;
    phone?: string;
  };
  shipping: {
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  billing: {
    sameAsShipping: boolean;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  payment: {
    method: 'stripe' | 'paypal' | 'crypto' | 'apple' | 'google';
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    cardholderName?: string;
    cryptoWallet?: string;
    cryptoNetwork?: string;
  };
}

interface CheckoutFlowProps {
  items: CheckoutItem[];
  onComplete?: (orderId: string) => void;
  onCancel?: () => void;
}

const CHECKOUT_STEPS = [
  { id: 'cart', title: 'Review Cart', icon: ShoppingCart },
  { id: 'customer', title: 'Customer Info', icon: User },
  { id: 'shipping', title: 'Shipping', icon: MapPin },
  { id: 'payment', title: 'Payment', icon: CreditCard },
  { id: 'confirm', title: 'Confirm', icon: Check }
];

const PAYMENT_METHODS = [
  { id: 'stripe', name: 'Credit/Debit Card', icon: CreditCard, description: 'Secure payment via Stripe' },
  { id: 'paypal', name: 'PayPal', icon: Globe, description: 'Fast checkout with PayPal' },
  { id: 'crypto', name: 'Cryptocurrency', icon: Bitcoin, description: 'Pay with Bitcoin, ETH, or USDC' },
  { id: 'apple', name: 'Apple Pay', icon: Smartphone, description: 'One-touch payment' },
  { id: 'google', name: 'Google Pay', icon: Smartphone, description: 'Fast and secure' }
];

const CRYPTO_NETWORKS = [
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
  { id: 'polygon', name: 'Polygon', symbol: 'MATIC' },
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
  { id: 'solana', name: 'Solana', symbol: 'SOL' }
];

export function CheckoutFlow({ items, onComplete, onCancel }: CheckoutFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    customer: { email: '', name: '', phone: '' },
    shipping: { address: '', city: '', state: '', zip: '', country: 'US' },
    billing: { sameAsShipping: true },
    payment: { method: 'stripe' }
  });

  // Katalyst Hooks
  const { executeTask } = useMultithreading();
  const { 
    processPayment, 
    validateCard, 
    calculateTax, 
    calculateShipping,
    isProcessing: paymentProcessing 
  } = usePayment();

  // Calculate totals
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const [tax, setTax] = useState(0);
  const [shipping, setShipping] = useState(0);
  const total = subtotal + tax + shipping;

  // Calculate tax and shipping when address changes
  useEffect(() => {
    if (checkoutData.shipping.zip && checkoutData.shipping.state) {
      calculateTax(subtotal, checkoutData.shipping.state).then(setTax);
      calculateShipping(items, checkoutData.shipping.zip).then(setShipping);
    }
  }, [checkoutData.shipping, subtotal, items]);

  // Validate current step
  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (currentStep) {
      case 0: // Cart
        if (items.length === 0) {
          newErrors.cart = 'Your cart is empty';
        }
        break;
        
      case 1: // Customer
        if (!checkoutData.customer.email) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutData.customer.email)) {
          newErrors.email = 'Invalid email address';
        }
        if (!checkoutData.customer.name) {
          newErrors.name = 'Name is required';
        }
        break;
        
      case 2: // Shipping
        if (!checkoutData.shipping.address) newErrors.address = 'Address is required';
        if (!checkoutData.shipping.city) newErrors.city = 'City is required';
        if (!checkoutData.shipping.state) newErrors.state = 'State is required';
        if (!checkoutData.shipping.zip) newErrors.zip = 'ZIP code is required';
        break;
        
      case 3: // Payment
        if (checkoutData.payment.method === 'stripe') {
          if (!checkoutData.payment.cardNumber) {
            newErrors.cardNumber = 'Card number is required';
          }
          if (!checkoutData.payment.expiryDate) {
            newErrors.expiryDate = 'Expiry date is required';
          }
          if (!checkoutData.payment.cvv) {
            newErrors.cvv = 'CVV is required';
          }
        } else if (checkoutData.payment.method === 'crypto') {
          if (!checkoutData.payment.cryptoWallet) {
            newErrors.cryptoWallet = 'Wallet address is required';
          }
          if (!checkoutData.payment.cryptoNetwork) {
            newErrors.cryptoNetwork = 'Select a network';
          }
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Process payment
  const handlePayment = async () => {
    if (!validateStep()) return;
    
    setIsProcessing(true);
    
    try {
      // Execute payment processing in parallel threads
      const paymentTask = await executeTask({
        id: `payment-${Date.now()}`,
        operation: 'process_payment',
        data: {
          method: checkoutData.payment.method,
          amount: total,
          currency: 'USD',
          customer: checkoutData.customer,
          shipping: checkoutData.shipping,
          items: items.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        },
        priority: 'high',
        status: 'pending'
      });
      
      // Process payment based on method
      const result = await processPayment({
        provider: checkoutData.payment.method,
        amount: total,
        currency: 'USD',
        metadata: {
          orderId: `ORD-${Date.now()}`,
          customerEmail: checkoutData.customer.email,
          items: items.length
        }
      });
      
      if (result.success) {
        onComplete?.(result.orderId);
      } else {
        setErrors({ payment: result.error || 'Payment failed' });
      }
    } catch (error) {
      setErrors({ payment: 'An error occurred processing your payment' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Navigation
  const handleNext = () => {
    if (validateStep()) {
      if (currentStep === CHECKOUT_STEPS.length - 1) {
        handlePayment();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {CHECKOUT_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center ${
                index < CHECKOUT_STEPS.length - 1 ? 'flex-1' : ''
              }`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  index <= currentStep
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <div className="ml-2">
                <div className="text-sm font-medium">{step.title}</div>
              </div>
              {index < CHECKOUT_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 transition-all ${
                    index < currentStep ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <Progress value={(currentStep + 1) / CHECKOUT_STEPS.length * 100} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>{CHECKOUT_STEPS[currentStep].title}</CardTitle>
                  <CardDescription>
                    {currentStep === 0 && 'Review your items before checkout'}
                    {currentStep === 1 && 'Enter your contact information'}
                    {currentStep === 2 && 'Where should we deliver your order?'}
                    {currentStep === 3 && 'Choose your payment method'}
                    {currentStep === 4 && 'Review and confirm your order'}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Cart Review */}
                  {currentStep === 0 && (
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                          {item.image && (
                            <img src={item.image} alt={item.name} className="w-16 h-16 rounded object-cover" />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Quantity: {item.quantity}
                            </p>
                          </div>
                          <div className="text-lg font-semibold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Customer Info */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={checkoutData.customer.email}
                          onChange={(e) => setCheckoutData(prev => ({
                            ...prev,
                            customer: { ...prev.customer, email: e.target.value }
                          }))}
                          className={errors.email ? 'border-red-500' : ''}
                        />
                        {errors.email && (
                          <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={checkoutData.customer.name}
                          onChange={(e) => setCheckoutData(prev => ({
                            ...prev,
                            customer: { ...prev.customer, name: e.target.value }
                          }))}
                          className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && (
                          <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="phone">Phone (optional)</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={checkoutData.customer.phone}
                          onChange={(e) => setCheckoutData(prev => ({
                            ...prev,
                            customer: { ...prev.customer, phone: e.target.value }
                          }))}
                        />
                      </div>
                    </div>
                  )}

                  {/* Shipping Address */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="address">Street Address *</Label>
                        <Input
                          id="address"
                          value={checkoutData.shipping.address}
                          onChange={(e) => setCheckoutData(prev => ({
                            ...prev,
                            shipping: { ...prev.shipping, address: e.target.value }
                          }))}
                          className={errors.address ? 'border-red-500' : ''}
                        />
                        {errors.address && (
                          <p className="text-sm text-red-500 mt-1">{errors.address}</p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={checkoutData.shipping.city}
                            onChange={(e) => setCheckoutData(prev => ({
                              ...prev,
                              shipping: { ...prev.shipping, city: e.target.value }
                            }))}
                            className={errors.city ? 'border-red-500' : ''}
                          />
                          {errors.city && (
                            <p className="text-sm text-red-500 mt-1">{errors.city}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="state">State *</Label>
                          <Input
                            id="state"
                            value={checkoutData.shipping.state}
                            onChange={(e) => setCheckoutData(prev => ({
                              ...prev,
                              shipping: { ...prev.shipping, state: e.target.value }
                            }))}
                            className={errors.state ? 'border-red-500' : ''}
                          />
                          {errors.state && (
                            <p className="text-sm text-red-500 mt-1">{errors.state}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="zip">ZIP Code *</Label>
                          <Input
                            id="zip"
                            value={checkoutData.shipping.zip}
                            onChange={(e) => setCheckoutData(prev => ({
                              ...prev,
                              shipping: { ...prev.shipping, zip: e.target.value }
                            }))}
                            className={errors.zip ? 'border-red-500' : ''}
                          />
                          {errors.zip && (
                            <p className="text-sm text-red-500 mt-1">{errors.zip}</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="country">Country</Label>
                          <Select
                            value={checkoutData.shipping.country}
                            onValueChange={(value) => setCheckoutData(prev => ({
                              ...prev,
                              shipping: { ...prev.shipping, country: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="US">United States</SelectItem>
                              <SelectItem value="CA">Canada</SelectItem>
                              <SelectItem value="UK">United Kingdom</SelectItem>
                              <SelectItem value="AU">Australia</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Method */}
                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <RadioGroup
                        value={checkoutData.payment.method}
                        onValueChange={(value: any) => setCheckoutData(prev => ({
                          ...prev,
                          payment: { ...prev.payment, method: value }
                        }))}
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <div key={method.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={method.id} id={method.id} />
                            <Label
                              htmlFor={method.id}
                              className="flex items-center gap-2 cursor-pointer flex-1"
                            >
                              <method.icon className="h-5 w-5" />
                              <div>
                                <div className="font-medium">{method.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {method.description}
                                </div>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>

                      {/* Credit Card Fields */}
                      {checkoutData.payment.method === 'stripe' && (
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label htmlFor="cardNumber">Card Number</Label>
                            <Input
                              id="cardNumber"
                              placeholder="1234 5678 9012 3456"
                              value={checkoutData.payment.cardNumber}
                              onChange={(e) => setCheckoutData(prev => ({
                                ...prev,
                                payment: { ...prev.payment, cardNumber: e.target.value }
                              }))}
                              className={errors.cardNumber ? 'border-red-500' : ''}
                            />
                            {errors.cardNumber && (
                              <p className="text-sm text-red-500 mt-1">{errors.cardNumber}</p>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="expiry">Expiry Date</Label>
                              <Input
                                id="expiry"
                                placeholder="MM/YY"
                                value={checkoutData.payment.expiryDate}
                                onChange={(e) => setCheckoutData(prev => ({
                                  ...prev,
                                  payment: { ...prev.payment, expiryDate: e.target.value }
                                }))}
                                className={errors.expiryDate ? 'border-red-500' : ''}
                              />
                              {errors.expiryDate && (
                                <p className="text-sm text-red-500 mt-1">{errors.expiryDate}</p>
                              )}
                            </div>
                            
                            <div>
                              <Label htmlFor="cvv">CVV</Label>
                              <Input
                                id="cvv"
                                placeholder="123"
                                value={checkoutData.payment.cvv}
                                onChange={(e) => setCheckoutData(prev => ({
                                  ...prev,
                                  payment: { ...prev.payment, cvv: e.target.value }
                                }))}
                                className={errors.cvv ? 'border-red-500' : ''}
                              />
                              {errors.cvv && (
                                <p className="text-sm text-red-500 mt-1">{errors.cvv}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Crypto Payment */}
                      {checkoutData.payment.method === 'crypto' && (
                        <div className="space-y-4 mt-4">
                          <div>
                            <Label>Select Network</Label>
                            <RadioGroup
                              value={checkoutData.payment.cryptoNetwork}
                              onValueChange={(value) => setCheckoutData(prev => ({
                                ...prev,
                                payment: { ...prev.payment, cryptoNetwork: value }
                              }))}
                            >
                              {CRYPTO_NETWORKS.map((network) => (
                                <div key={network.id} className="flex items-center space-x-2">
                                  <RadioGroupItem value={network.id} id={network.id} />
                                  <Label htmlFor={network.id}>
                                    {network.name} ({network.symbol})
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                            {errors.cryptoNetwork && (
                              <p className="text-sm text-red-500 mt-1">{errors.cryptoNetwork}</p>
                            )}
                          </div>
                          
                          <div>
                            <Label htmlFor="wallet">Wallet Address</Label>
                            <Input
                              id="wallet"
                              placeholder="0x..."
                              value={checkoutData.payment.cryptoWallet}
                              onChange={(e) => setCheckoutData(prev => ({
                                ...prev,
                                payment: { ...prev.payment, cryptoWallet: e.target.value }
                              }))}
                              className={errors.cryptoWallet ? 'border-red-500' : ''}
                            />
                            {errors.cryptoWallet && (
                              <p className="text-sm text-red-500 mt-1">{errors.cryptoWallet}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {errors.payment && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{errors.payment}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Order Confirmation */}
                  {currentStep === 4 && (
                    <div className="space-y-4">
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          Your payment information is encrypted and secure
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Customer Information</h4>
                          <p className="text-sm text-muted-foreground">
                            {checkoutData.customer.name}<br />
                            {checkoutData.customer.email}<br />
                            {checkoutData.customer.phone}
                          </p>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="font-semibold mb-2">Shipping Address</h4>
                          <p className="text-sm text-muted-foreground">
                            {checkoutData.shipping.address}<br />
                            {checkoutData.shipping.city}, {checkoutData.shipping.state} {checkoutData.shipping.zip}<br />
                            {checkoutData.shipping.country}
                          </p>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="font-semibold mb-2">Payment Method</h4>
                          <p className="text-sm text-muted-foreground">
                            {PAYMENT_METHODS.find(m => m.id === checkoutData.payment.method)?.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={currentStep === 0 ? onCancel : handleBack}
              disabled={isProcessing}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              {currentStep === 0 ? 'Cancel' : 'Back'}
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={isProcessing || (currentStep === 0 && items.length === 0)}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : currentStep === CHECKOUT_STEPS.length - 1 ? (
                <>
                  Complete Order
                  <Check className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <GlowCard className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.name} × {item.quantity}
                    </span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              {/* Security Badges */}
              <div className="flex items-center justify-center gap-2 pt-4">
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  SSL Secure
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  PCI Compliant
                </Badge>
              </div>
            </CardContent>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}