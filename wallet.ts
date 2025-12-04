import { ethers } from 'ethers';
import { WALLET_CONFIG } from '../config';
import { blockchainProvider } from './provider';
import logger from '../utils/logger';

export class WalletManager {
  private wallet: ethers.Wallet | null = null;
  private connectedWallet: ethers.Wallet | null = null;

  constructor() {
    this.initializeWallet();
  }

  private initializeWallet(): void {
    if (WALLET_CONFIG.privateKey) {
      try {
        this.wallet = new ethers.Wallet(WALLET_CONFIG.privateKey);
        logger.info(`Wallet initialized: ${this.wallet.address}`);
      } catch (error) {
        logger.error('Failed to initialize wallet:', error);
      }
    } else {
      logger.warn('No private key configured - wallet functionality disabled');
    }
  }

  public getWallet(): ethers.Wallet | null {
    return this.wallet;
  }

  public getAddress(): string {
    return this.connectedWallet?.address || this.wallet?.address || '';
  }

  public async connectToChain(chain: string): Promise<ethers.Wallet | null> {
    if (!this.wallet) {
      logger.error('Wallet not initialized');
      return null;
    }

    try {
      const provider = blockchainProvider.getProvider(chain);
      this.connectedWallet = this.wallet.connect(provider);
      logger.info(`Wallet connected to ${chain}: ${this.connectedWallet.address}`);
      return this.connectedWallet;
    } catch (error) {
      logger.error(`Failed to connect wallet to ${chain}:`, error);
      return null;
    }
  }

  public async getAllBalances(): Promise<Record<string, string>> {
    const balances: Record<string, string> = {};
    const address = this.getAddress();

    if (!address) {
      return balances;
    }

    const chains = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism'];
    
    for (const chain of chains) {
      try {
        const balance = await blockchainProvider.getBalance(address, chain);
        balances[chain.toUpperCase()] = ethers.formatEther(balance);
      } catch (error) {
        logger.error(`Failed to get balance for ${chain}:`, error);
        balances[chain.toUpperCase()] = '0.0';
      }
    }

    return balances;
  }

  public async sendTransaction(transaction: ethers.TransactionRequest): Promise<ethers.TransactionResponse | null> {
    if (!this.connectedWallet) {
      logger.error('Wallet not connected to any chain');
      return null;
    }

    try {
      const tx = await this.connectedWallet.sendTransaction(transaction);
      logger.info(`Transaction sent: ${tx.hash}`);
      return tx;
    } catch (error) {
      logger.error('Failed to send transaction:', error);
      return null;
    }
  }

  public async estimateGas(transaction: ethers.TransactionRequest): Promise<bigint> {
    if (!this.connectedWallet) {
      logger.error('Wallet not connected to any chain');
      return BigInt(0);
    }

    try {
      return await this.connectedWallet.estimateGas(transaction);
    } catch (error) {
      logger.error('Failed to estimate gas:', error);
      return BigInt(0);
    }
  }
}

export const walletManager = new WalletManager();
