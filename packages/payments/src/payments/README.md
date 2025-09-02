# 💳 Katalyst Payment Integration

**Advanced payment processing for NFT marketplaces and Web3 applications with support for crypto, fiat, swaps, and cross-chain bridges.**

## 🚀 Features

### Payment Methods
- **Crypto Payments**: Native blockchain transactions via WalletConnect
- **Fiat Payments**: Credit cards, bank transfers via Hyperswitch
- **Token Swaps**: DEX aggregation via 1inch API
- **Cross-Chain Bridges**: Asset transfers via Symbiosis
- **NFT Purchases**: Specialized NFT transaction handling

### Wallet Integration
- **WalletConnect v2**: Universal wallet connection protocol
- **Multi-Chain Support**: Ethereum, Polygon, BSC, Arbitrum, Optimism, Avalanche
- **Chain Switching**: Seamless network switching
- **Balance Queries**: Real-time balance checking

### Developer Experience
- **React Hooks**: Easy integration with React applications
- **TypeScript**: Full type safety and IntelliSense
- **Zustand Store**: Global state management
- **Error Handling**: Comprehensive error management
- **Transaction History**: Built-in transaction tracking

## 📦 Installation

The payment module is part of the Katalyst shared library:

```bash
npm install katalyst-shared
# or
yarn add katalyst-shared
```

## 🔧 Environment Variables

Create a `.env` file with your API keys:

```env
# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Hyperswitch (optional - for fiat payments)
HYPERSWITCH_API_KEY=your_api_key
NEXT_PUBLIC_HYPERSWITCH_PUBLISHABLE_KEY=your_publishable_key

# 1inch (optional - for token swaps)
ONEINCH_API_KEY=your_api_key
```

## 🚀 Quick Start

### 1. Basic Setup

```typescript
import { quickStartPayments } from 'katalyst-shared';

const paymentManager = quickStartPayments({
  walletConnectProjectId: 'your-project-id',
  hyperswitchApiKey: 'your-hyperswitch-key', // optional
  oneInchApiKey: 'your-1inch-key', // optional
  environment: 'sandbox', // or 'production'
  hooks: {
    onConnect: (wallet) => console.log('Connected:', wallet),
    onPaymentSuccess: (result) => console.log('Success:', result),
    onPaymentError: (error) => console.error('Error:', error),
  },
});
```

### 2. React Integration

```typescript
import { usePaymentManager, useWallet, usePayment } from 'katalyst-shared';

function PaymentComponent() {
  const { manager } = usePaymentManager({
    config: createPaymentConfig({
      walletConnect: {
        projectId: 'your-project-id',
        chains: [], // Uses defaults
        metadata: {
          name: 'My NFT Marketplace',
          description: 'Trade NFTs across chains',
          url: 'https://my-marketplace.com',
          icons: ['https://my-marketplace.com/icon.png'],
        },
      },
    }),
    autoConnect: true,
  });

  const { wallet, connect, disconnect, isConnected } = useWallet(manager);
  const { processPayment, loading } = usePayment(manager);

  const handleConnect = () => connect('walletconnect');
  
  const handlePayment = async () => {
    await processPayment({
      id: `payment-${Date.now()}`,
      amount: '0.1',
      currency: 'ETH',
      recipient: '0x742d35Cc6342C4532CA3C632e4c5ACb5b9ADA5f0',
      method: 'crypto',
      provider: 'walletconnect',
      chain: 'ethereum',
    });
  };

  return (
    <div>
      {!isConnected ? (
        <button onClick={handleConnect}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected: {wallet?.address}</p>
          <button onClick={handlePayment} disabled={loading}>
            {loading ? 'Processing...' : 'Pay 0.1 ETH'}
          </button>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
```

## 💡 Usage Examples

### NFT Purchase

```typescript
// Purchase an NFT with crypto
const result = await paymentManager.processPayment({
  id: `nft-${tokenId}`,
  amount: '0.5',
  currency: 'ETH',
  recipient: sellerAddress,
  method: 'nft',
  provider: 'walletconnect',
  chain: 'ethereum',
  metadata: {
    contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    tokenId: '1234',
    buyer: buyerAddress,
    seller: sellerAddress,
  },
});
```

### Token Swap

```typescript
// Swap USDC for USDT with price optimization
const swapResult = await paymentManager.swap({
  fromToken: '0xA0b86a33E6441b4a46c9c3d47C36f0Ab6b8C6b9a', // USDC
  toToken: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
  amount: '100000000', // 100 USDC
  slippage: 0.5, // 0.5%
  chain: 'ethereum',
  recipient: walletAddress,
});
```

### Cross-Chain Bridge

```typescript
// Bridge USDC from Ethereum to Polygon
const bridgeResult = await paymentManager.bridge({
  fromChain: 'ethereum',
  toChain: 'polygon',
  token: '0xA0b86a33E6441b4a46c9c3d47C36f0Ab6b8C6b9a', // USDC
  amount: '100000000', // 100 USDC
  recipient: walletAddress,
});
```

### Fiat Payment

```typescript
// Process credit card payment
const fiatResult = await paymentManager.processPayment({
  id: `subscription-${Date.now()}`,
  amount: '29.99',
  currency: 'USD',
  recipient: 'merchant-account',
  method: 'fiat',
  provider: 'hyperswitch',
  metadata: {
    description: 'Premium Subscription',
    customer_email: 'user@example.com',
  },
});
```

## 🎯 Advanced Usage

### Custom Configuration

```typescript
import { PaymentManager, createPaymentConfig } from 'katalyst-shared';

const config = createPaymentConfig({
  walletConnect: {
    projectId: 'your-project-id',
    chains: [
      // Custom chain configurations
      {
        chainId: 1,
        name: 'Ethereum',
        rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/your-key',
        blockExplorer: 'https://etherscan.io',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      },
    ],
    metadata: {
      name: 'Advanced DApp',
      description: 'Full-featured Web3 application',
      url: 'https://advanced-dapp.com',
      icons: ['https://advanced-dapp.com/icon.png'],
    },
  },
  oneInch: {
    apiKey: 'your-1inch-key',
    baseUrl: 'https://api.1inch.dev/swap/v6.0',
    supportedChains: [1, 137, 56, 42161, 10, 43114],
  },
});

const paymentManager = new PaymentManager({
  config,
  hooks: {
    onConnect: (wallet) => {
      console.log(`Connected to ${wallet.provider}`);
      // Store wallet info in your app state
    },
    onChainChange: (chainId) => {
      console.log(`Switched to chain ${chainId}`);
      // Update UI for new chain
    },
    onPaymentStart: (request) => {
      console.log(`Starting ${request.method} payment`);
      // Show loading UI
    },
    onPaymentSuccess: (response) => {
      console.log(`Payment successful: ${response.txHash}`);
      // Show success message, update UI
    },
    onPaymentError: (error) => {
      console.error(`Payment failed: ${error}`);
      // Show error message
    },
  },
  autoConnect: false,
});
```

### State Management with Zustand

```typescript
import { usePaymentStore, useWallet, useTransactions } from 'katalyst-shared';

function PaymentDashboard() {
  const wallet = useWallet();
  const transactions = useTransactions();
  const { setSelectedChain, addFavoriteToken } = usePaymentActions();

  const pendingTxs = transactions.filter(tx => tx.status === 'pending');
  const recentTxs = transactions.slice(0, 10);

  return (
    <div>
      <h2>Payment Dashboard</h2>
      {wallet && <p>Balance: {wallet.balance} ETH</p>}
      
      <section>
        <h3>Pending Transactions ({pendingTxs.length})</h3>
        {pendingTxs.map(tx => (
          <div key={tx.id}>
            {tx.type}: {tx.amount} {tx.currency}
          </div>
        ))}
      </section>

      <section>
        <h3>Recent Transactions</h3>
        {recentTxs.map(tx => (
          <div key={tx.id}>
            {tx.type}: {tx.amount} {tx.currency} - {tx.status}
          </div>
        ))}
      </section>
    </div>
  );
}
```

## 🔗 Supported Chains

| Chain | Chain ID | Native Token | Status |
|-------|----------|--------------|--------|
| Ethereum | 1 | ETH | ✅ |
| Polygon | 137 | MATIC | ✅ |
| BSC | 56 | BNB | ✅ |
| Arbitrum | 42161 | ETH | ✅ |
| Optimism | 10 | ETH | ✅ |
| Avalanche | 43114 | AVAX | ✅ |
| Solana | solana:5eykt4... | SOL | 🚧 |
| Bitcoin | bip122:000000... | BTC | 🚧 |

## 🛡️ Security

- **Non-Custodial**: Never stores private keys or seed phrases
- **Secure RPC**: Uses authenticated RPC endpoints
- **Input Validation**: Validates all transaction parameters
- **Error Handling**: Comprehensive error management
- **Rate Limiting**: Built-in protection against spam
- **Audit Ready**: Code designed for security audits

## 🔧 API Reference

### Core Classes

- **`PaymentManager`**: Main orchestration class
- **`WalletConnectProvider`**: WalletConnect integration
- **`HyperswitchProvider`**: Fiat payment processing  
- **`OneInchProvider`**: DEX aggregation
- **`SymbiosisProvider`**: Cross-chain bridging

### React Hooks

- **`usePaymentManager`**: Main payment manager hook
- **`useWallet`**: Wallet connection and management
- **`usePayment`**: Payment processing
- **`useSwap`**: Token swapping
- **`useBridge`**: Cross-chain bridging
- **`useTokens`**: Token management
- **`useTransactions`**: Transaction history

### Utilities

- **`validatePaymentRequest`**: Validate payment parameters
- **`formatAmount`**: Format token amounts
- **`getExplorerUrl`**: Generate block explorer URLs
- **`calculateGasCost`**: Estimate gas costs
- **`isValidAddress`**: Validate wallet addresses

## 🐛 Troubleshooting

### Common Issues

**Wallet Connection Fails**
```
Error: WalletConnect initialization failed
```
- Check your WalletConnect project ID
- Ensure HTTPS is used in production
- Verify metadata is properly configured

**Transaction Rejected**
```
Error: Transaction rejected by user
```
- User declined transaction in wallet
- Insufficient gas or balance
- Network congestion

**Unsupported Chain**
```
Error: Unsupported chain: polygon
```
- Chain not configured in supported chains
- Check chain ID matches configuration
- Ensure RPC endpoint is accessible

**API Rate Limiting**
```
Error: Rate limit exceeded
```
- Implement request throttling
- Use API keys for higher limits
- Add retry logic with exponential backoff

### Debug Mode

Enable debug logging:

```typescript
// Set environment variable
process.env.DEBUG = 'katalyst:payments';

// Or use debug flag
const paymentManager = new PaymentManager({
  config,
  debug: true,
});
```

## 📚 Examples Repository

See the `/examples` directory for complete working examples:

- Basic wallet connection
- NFT marketplace integration
- DeFi swap interface
- Cross-chain bridge UI
- Fiat payment gateway

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](../../../../LICENSE) file for details.

## 🙏 Acknowledgments

- [WalletConnect](https://walletconnect.com/) - Universal wallet connection
- [Hyperswitch](https://hyperswitch.io/) - Payment orchestration
- [1inch](https://1inch.io/) - DEX aggregation
- [Symbiosis](https://symbiosis.finance/) - Cross-chain bridges
- [Zustand](https://github.com/pmndrs/zustand) - State management

## 📞 Support

- 📖 [Documentation](https://docs.katalyst.dev/payments)
- 🐛 [Bug Reports](https://github.com/swcstudio/katalyst/issues)
- 💬 [Discussions](https://github.com/swcstudio/katalyst/discussions)
- 📧 [Email Support](mailto:support@katalyst.dev)

---

**Built with ❤️ by the Katalyst team**

*Making Web3 payments accessible, powerful, and secure.*