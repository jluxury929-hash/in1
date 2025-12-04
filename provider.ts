import { ethers } from 'ethers';
import { RPC_ENDPOINTS } from '../config';
import logger from '../utils/logger';

export class BlockchainProvider {
  private providers: Map<string, ethers.JsonRpcProvider[]> = new Map();
  private currentProviderIndex: Map<string, number> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize providers for each chain
    Object.entries(RPC_ENDPOINTS).forEach(([chain, endpoints]) => {
      const providers = endpoints.map(endpoint => 
        new ethers.JsonRpcProvider(endpoint)
      );
      this.providers.set(chain, providers);
      this.currentProviderIndex.set(chain, 0);
    });
  }

  public getProvider(chain: string): ethers.JsonRpcProvider {
    const providers = this.providers.get(chain);
    if (!providers || providers.length === 0) {
      throw new Error(`No providers available for chain: ${chain}`);
    }

    const currentIndex = this.currentProviderIndex.get(chain) || 0;
    const provider = providers[currentIndex];

    // Test provider health
    this.testProviderHealth(provider, chain).then(isHealthy => {
      if (!isHealthy) {
        logger.warn(`Provider ${currentIndex} for ${chain} is unhealthy, switching...`);
        this.switchProvider(chain);
      }
    });

    return provider;
  }

  private async testProviderHealth(provider: ethers.JsonRpcProvider, chain: string): Promise<boolean> {
    try {
      await provider.getBlockNumber();
      return true;
    } catch (error) {
      logger.error(`Provider health check failed for ${chain}:`, error);
      return false;
    }
  }

  private switchProvider(chain: string): void {
    const providers = this.providers.get(chain);
    if (!providers || providers.length <= 1) return;

    const currentIndex = this.currentProviderIndex.get(chain) || 0;
    const nextIndex = (currentIndex + 1) % providers.length;
    this.currentProviderIndex.set(chain, nextIndex);
    
    logger.info(`Switched to provider ${nextIndex} for ${chain}`);
  }

  public getHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    this.providers.forEach((providers, chain) => {
      const currentIndex = this.currentProviderIndex.get(chain) || 0;
      status[chain] = {
        totalProviders: providers.length,
        currentProvider: currentIndex,
        healthy: true
      };
    });

    return status;
  }

  public async getGasPrice(chain: string): Promise<bigint> {
    try {
      const provider = this.getProvider(chain);
      return await provider.getFeeData().then(feeData => feeData.gasPrice || BigInt(0));
    } catch (error) {
      logger.error(`Failed to get gas price for ${chain}:`, error);
      return BigInt(0);
    }
  }

  public async getBalance(address: string, chain: string): Promise<bigint> {
    try {
      const provider = this.getProvider(chain);
      return await provider.getBalance(address);
    } catch (error) {
      logger.error(`Failed to get balance for ${address} on ${chain}:`, error);
      return BigInt(0);
    }
  }
}

export const blockchainProvider = new BlockchainProvider();
