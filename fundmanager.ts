import { config } from '../config';
import { walletManager } from '../blockchain/wallet';
import logger from '../utils/logger';

export class FundManager {
  private tradingAllocation: number = 0.5; // 50% for trading
  private gasAllocation: number = 0.5; // 50% for gas
  private totalBalance: number = 0;
  private lastUpdate: Date = new Date();

  constructor() {
    this.initializeAllocations();
  }

  private async initializeAllocations(): Promise<void> {
    try {
      const balances = await walletManager.getAllBalances();
      this.totalBalance = Object.values(balances).reduce((sum, balance) => 
        sum + parseFloat(balance), 0
      );
      logger.info(`Fund manager initialized with ${this.totalBalance} ETH total balance`);
    } catch (error) {
      logger.error('Failed to initialize fund allocations:', error);
    }
  }

  public getAllocations(): any {
    const tradingFunds = this.totalBalance * this.tradingAllocation;
    const gasFunds = this.totalBalance * this.gasAllocation;

    return {
      totalBalance: this.totalBalance,
      tradingAllocation: this.tradingAllocation,
      gasAllocation: this.gasAllocation,
      tradingFunds,
      gasFunds,
      lastUpdate: this.lastUpdate
    };
  }

  public getStatistics(): any {
    return {
      ...this.getAllocations(),
      efficiency: this.tradingAllocation / this.gasAllocation,
      rebalanceHistory: []
    };
  }

  public async rebalance(): Promise<void> {
    // Implement rebalancing logic
    this.lastUpdate = new Date();
    logger.info('Funds rebalanced');
  }
}

export const fundManager = new FundManager();
