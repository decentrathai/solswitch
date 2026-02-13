const express = require('express');
const cors = require('cors');
const path = require('path');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Solana devnet connection
const SOLANA_RPC = 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_RPC);

// Token mapping: EVM tokens -> Solana equivalents
const TOKEN_MAP = {
  'ETH': { solana: 'SOL', ratio: 24.5, solMint: 'So11111111111111111111111111111111111111112' },
  'WETH': { solana: 'SOL', ratio: 24.5, solMint: 'So11111111111111111111111111111111111111112' },
  'USDC': { solana: 'USDC', ratio: 1.0, solMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
  'USDT': { solana: 'USDT', ratio: 1.0, solMint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
  'WBTC': { solana: 'tBTC', ratio: 1.0, solMint: '6DNSN2BJsaPFdBAy8hxQfCZyG11hwo4JGMdiXCQkUbLP' },
  'DAI': { solana: 'USDC', ratio: 1.0, solMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
  'LINK': { solana: 'LINK', ratio: 1.0, solMint: 'LinKGWvNaUVpjBhXFo8JrmYaTqKj8VHGK2VRdFAQnE6' },
  'UNI': { solana: 'RAY', ratio: 0.8, solMint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
  'AAVE': { solana: 'JUP', ratio: 2.1, solMint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
  'MATIC': { solana: 'SOL', ratio: 0.006, solMint: 'So11111111111111111111111111111111111111112' },
  'BNB': { solana: 'SOL', ratio: 3.8, solMint: 'So11111111111111111111111111111111111111112' },
  'SHIB': { solana: 'BONK', ratio: 45.0, solMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  'PEPE': { solana: 'BONK', ratio: 30.0, solMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
};

// Gas costs per chain (in USD, average for token transfer)
const GAS_COSTS = {
  ethereum: { transfer: 5.20, swap: 25.00, approve: 8.50, bridge: 35.00 },
  bsc: { transfer: 0.15, swap: 0.80, approve: 0.10, bridge: 2.50 },
  polygon: { transfer: 0.01, swap: 0.08, approve: 0.005, bridge: 1.20 },
  solana: { transfer: 0.00025, swap: 0.005, approve: 0, bridge: 0 },
};

// API: Scan EVM wallet (simulated with realistic data for demo)
app.post('/api/scan', async (req, res) => {
  const { address, chain } = req.body;
  if (!address) return res.status(400).json({ error: 'Address required' });

  // Generate deterministic but realistic-looking balances from address
  const seed = address.toLowerCase().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const tokens = [];
  const allTokens = Object.keys(TOKEN_MAP);
  
  // Each wallet has 3-8 tokens
  const count = 3 + (seed % 6);
  for (let i = 0; i < count; i++) {
    const token = allTokens[(seed + i * 7) % allTokens.length];
    const balance = ((seed * (i + 1) * 17) % 10000) / 100;
    const usdPrice = getTokenPrice(token);
    if (balance > 0) {
      tokens.push({
        symbol: token,
        balance: balance,
        usdValue: balance * usdPrice,
        chain: chain || 'ethereum',
      });
    }
  }

  res.json({ address, chain: chain || 'ethereum', tokens });
});

// API: Get migration plan
app.post('/api/migrate/plan', async (req, res) => {
  const { tokens, sourceChain } = req.body;
  if (!tokens || !tokens.length) return res.status(400).json({ error: 'Tokens required' });

  const plan = tokens.map(t => {
    const mapping = TOKEN_MAP[t.symbol] || { solana: 'SOL', ratio: 0.01, solMint: 'So11111111111111111111111111111111111111112' };
    const gasCost = GAS_COSTS[sourceChain] || GAS_COSTS.ethereum;
    const solanaGas = GAS_COSTS.solana;
    
    const bridgeFee = t.usdValue * 0.003; // 0.3% bridge fee
    const evmGasTotal = gasCost.approve + gasCost.bridge;
    const solanaGasTotal = solanaGas.swap;
    const totalFees = bridgeFee + evmGasTotal + solanaGasTotal;
    const annualSavings = (gasCost.swap - solanaGas.swap) * 365; // assuming 1 swap/day

    return {
      from: { symbol: t.symbol, balance: t.balance, chain: sourceChain || 'ethereum', usdValue: t.usdValue },
      to: { symbol: mapping.solana, amount: t.balance * mapping.ratio, mint: mapping.solMint },
      fees: {
        bridgeFee: bridgeFee.toFixed(4),
        evmGas: evmGasTotal.toFixed(4),
        solanaGas: solanaGasTotal.toFixed(4),
        totalUsd: totalFees.toFixed(4),
        percentOfValue: ((totalFees / t.usdValue) * 100).toFixed(2),
      },
      savings: {
        perTransaction: (gasCost.swap - solanaGas.swap).toFixed(4),
        annualEstimate: annualSavings.toFixed(2),
        percentSaved: (((gasCost.swap - solanaGas.swap) / gasCost.swap) * 100).toFixed(1),
      },
      route: `${t.symbol} (${sourceChain}) → Wormhole Bridge → ${mapping.solana} (Solana)`,
      jupiterQuote: mapping.solana !== t.symbol ? `Jupiter: ${mapping.solana}/USDC` : null,
    };
  });

  const totalUsdValue = tokens.reduce((sum, t) => sum + t.usdValue, 0);
  const totalFees = plan.reduce((sum, p) => sum + parseFloat(p.fees.totalUsd), 0);
  const totalAnnualSavings = plan.reduce((sum, p) => sum + parseFloat(p.savings.annualEstimate), 0);

  res.json({
    plan,
    summary: {
      totalTokens: tokens.length,
      totalUsdValue: totalUsdValue.toFixed(2),
      totalMigrationFees: totalFees.toFixed(2),
      totalAnnualSavings: totalAnnualSavings.toFixed(2),
      estimatedTime: `${tokens.length * 2}-${tokens.length * 5} minutes`,
    }
  });
});

// API: Execute migration (devnet simulation)
app.post('/api/migrate/execute', async (req, res) => {
  const { plan } = req.body;
  
  // Simulate migration steps
  const steps = [];
  for (const item of (plan || [])) {
    steps.push({
      step: `Bridge ${item.from.symbol} via Wormhole`,
      status: 'completed',
      txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
      chain: item.from.chain,
    });
    steps.push({
      step: `Swap to ${item.to.symbol} via Jupiter`,
      status: 'completed', 
      txHash: Buffer.from(Math.random().toString()).toString('base64').slice(0, 44),
      chain: 'solana',
    });
  }

  res.json({ success: true, steps, message: 'Migration completed on devnet!' });
});

// API: Get fee comparison
app.get('/api/fees/compare', (req, res) => {
  res.json({
    chains: Object.entries(GAS_COSTS).map(([chain, costs]) => ({
      chain,
      ...costs,
      dailyCost: (costs.transfer * 5 + costs.swap * 3).toFixed(2),
      monthlyCost: ((costs.transfer * 5 + costs.swap * 3) * 30).toFixed(2),
    }))
  });
});

// API: Jupiter quote proxy (real API on mainnet, simulated for devnet)
app.get('/api/jupiter/quote', async (req, res) => {
  const { inputMint, outputMint, amount } = req.query;
  try {
    const resp = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`);
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.json({ 
      inputMint, outputMint, amount,
      outAmount: Math.floor(parseInt(amount) * 0.98).toString(),
      priceImpactPct: '0.1',
      routePlan: [{ swapInfo: { label: 'Raydium' } }],
      simulated: true
    });
  }
});

// API: Solana devnet balance
app.get('/api/solana/balance/:address', async (req, res) => {
  try {
    const pubkey = new PublicKey(req.params.address);
    const balance = await connection.getBalance(pubkey);
    res.json({ address: req.params.address, balance: balance / LAMPORTS_PER_SOL, lamports: balance });
  } catch (e) {
    res.json({ error: e.message });
  }
});

function getTokenPrice(symbol) {
  const prices = {
    ETH: 1982, WETH: 1982, USDC: 1, USDT: 1, WBTC: 67674, DAI: 1,
    LINK: 14.5, UNI: 7.2, AAVE: 185, MATIC: 0.48, BNB: 310,
    SHIB: 0.000012, PEPE: 0.0000089,
  };
  return prices[symbol] || 1;
}

const PORT = process.env.PORT || 3900;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`SolSwitch running on http://localhost:${PORT}`);
});
