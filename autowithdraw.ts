import { WALLET_CONFIG } from '../config';
import logger from '../utils/logger';

export class AutoWithdrawSystem {
  private isRunning: boolean = false;
  private withdrawalInterval: NodeJS.Timeout | null = null;
  private withdrawalHistory: any[] = [];

  public start(intervalMinutes: number = 60): void {
    if (this.isRunning) {
      logger.warn('Auto-withdraw system is already running');
      return;
    }

    this.isRunning = true;
    logger.info(`Starting auto-withdraw system with ${intervalMinutes} minute intervals`);

    this.withdrawalInterval = setInterval(async () => {
      await this.performWithdrawal();
    }, intervalMinutes * 60 * 1000);
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.withdrawalInterval) {
      clearInterval(this.withdrawalInterval);
      this.withdrawalInterval = null;
    }

    logger.info('Stopped auto-withdraw system');
  }

  private async performWithdrawal(): Promise<void> {
    try {
      logger.info('Performing scheduled withdrawal...');
      
      // Simulate withdrawal
      const withdrawal = {
        id: `withdraw_${Date.now()}`,
        amount: Math.random() * 10,
        toAddress: WALLET_CONFIG.address,
        timestamp: new Date(),
        status: 'completed'
      };

      this.withdrawalHistory.push(withdrawal);
      logger.info(`Withdrawal completed: ${withdrawal.amount} ETH to ${withdrawal.toAddress}`);

    } catch (error) {
      logger.error('Failed to perform withdrawal:', error);
    }
  }

  public async withdrawAll(): Promise<void> {
    await this.performWithdrawal();
  }

  public async withdrawTo(chainId: string, toAddress: string, amount: string): Promise<any> {
    const withdrawal = {
      id: `withdraw_${Date.now()}`,
      chainId,
      toAddress,
      amount,
      timestamp: new Date(),
      status: 'completed'
    };

    this.withdrawalHistory.push(withdrawal);
    logger.info(`Manual withdrawal: ${amount} to ${toAddress} on ${chainId}`);

    return withdrawal;
  }

  public getStatistics(): any {
    const totalWithdrawn = this.withdrawalHistory.reduce((sum, w) => sum + w.amount, 0);
    
    return {
      isRunning: this.isRunning,
      totalWithdrawals: this.withdrawalHistory.length,
      totalWithdrawn,
      lastWithdrawal: this.withdrawalHistory.length > 0 
        ? this.withdrawalHistory[this.withdrawalHistory.length - 1].timestamp
        : null,
      withdrawalHistory: this.withdrawalHistory.slice(-10) // Last 10 withdrawals
    };
  }
}

export const autoWithdrawSystem = new AutoWithdrawSystem();
