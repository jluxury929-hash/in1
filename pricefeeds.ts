import { PriceData } from '../types';
import { config } from '../config';
import logger from '../utils/logger';

export class PriceFeedAggregator {
  private priceCache: Map<string, PriceData> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPriceUpdates();
  }

  private startPriceUpdates(): void {
    this.updatePrices(); // Initial update
    
    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, 100); // Update every 100ms for ultra-high frequency
  }

  private async updatePrices(): Promise<void> {
    const tokens = ['ETH', 'BTC', 'USDT', 'USDC', 'BNB', 'MATIC', 'ARB', 'OP'];
    
    for (const token of tokens) {
      try {
        const priceData = await this.fetchPrice(token);
        this.priceCache.set(token, priceData);
      } catch (error) {
        logger.error(`Failed to update price for ${token}:`, error);
      }
    }
  }

  private async fetchPrice(token: string): Promise<PriceData> {
    // Simplified price fetching - in reality would use multiple exchanges
    const basePrice = this.getBasePrice(token);
    const volatility = (Math.random() - 0.5) * 0.02; // ±1% volatility
    const price = basePrice * (1 + volatility);

    return {
      token,
      price,
      timestamp: new Date(),
      source: 'Aggregator',
      volume24h: Math.random() * 1000000000,
      change24h: (Math.random() - 0.5) * 10
    };
  }

  private getBasePrice(token: string): number {
    const prices: Record<string, number> = {
      'ETH': 2000,
      'BTC': 45000,
      'USDT': 1,
      'USDC': 1,
      'BNB': 300,
      'MATIC': 0.8,
      'ARB': 1.2,
      'OP': 1.5
    };

    return prices[token] || 1;
  }

  public getPrice(token: string, source?: string): PriceData | undefined {
    return this.priceCache.get(token);
  }

  public getAllPrices(): Map<string, PriceData> {
    return new Map(this.priceCache);
  }

  public findArbitrageOpportunities(minProfitPercent: number): any[] {
    const opportunities: any[] = [];
    const prices = Array.from(this.priceCache.values());

    // Simple arbitrage detection (would be more complex in reality)
    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const priceA = prices[i];
        const priceB = prices[j];

        if (priceA.token === priceB.token) {
          const priceDiff = Math.abs(priceA.price - priceB.price);
          const profitPercent = (priceDiff / Math.min(priceA.price, priceB.price)) * 100;

          if (profitPercent > minProfitPercent) {
            opportunities.push({
              token: priceA.token,
              exchangeA: priceA.source,
              exchangeB: priceB.source,
              priceA: priceA.price,
              priceB: priceB.price,
              profitPercent,
              profitUSD: priceDiff * 1000 // Assuming 1000 units
            });
          }
        }
      }
    }

    return opportunities;
  }
}

export const priceFeedAggregator = new PriceFeedAggregator();
