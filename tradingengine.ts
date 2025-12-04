import { EventEmitter } from 'events';
import { config } from '../config';
import { Strategy, TradeOpportunity, TradeResult, PerformanceMetrics } from '../types';
import { strategyRegistry } from '../strategies/strategyRegistry';
import { aiDecisionEngine } from '../ai/decisionEngine';
import { walletManager } from '../blockchain/wallet';
import logger from '../utils/logger';

export class TradingEngine extends EventEmitter {
  private isRunning: boolean = false;
  private metrics: PerformanceMetrics;
  private executionQueue: TradeOpportunity[] = [];
  private activeStrategies: Map<string, Strategy> = new Map();
  private tradeHistory: TradeResult[] = [];

  constructor() {
    super();
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfitUSD: 0,
      totalLossUSD: 0,
      netProfitUSD: 0,
      averageTradeTime: 0,
      tradesPerSecond: 0,
      successRate: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
      timestamp: Date.now()
    };
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Trading engine is already running');
      return;
    }

    logger.info('Starting trading engine...');
    this.isRunning = true;

    // Initialize strategies
    await this.initializeStrategies();

    // Start main trading loop
    this.startTradingLoop();

    // Start performance monitoring
    this.startPerformanceMonitoring();

    this.emit('engine_started');
    logger.info('Trading engine started successfully');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Trading engine is not running');
      return;
    }

    logger.info('Stopping trading engine...');
    this.isRunning = false;

    this.emit('engine_stopped');
    logger.info('Trading engine stopped');
  }

  public isEngineRunning(): boolean {
    return this.isRunning;
  }

  private async initializeStrategies(): Promise<void> {
    const strategies = strategyRegistry.getAllEnabledStrategies();
    
    for (const strategy of strategies) {
      this.activeStrategies.set(strategy.id, strategy);
      logger.info(`Activated strategy: ${strategy.name} (${strategy.type})`);
    }
  }

  private startTradingLoop(): void {
    const loopInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(loopInterval);
        return;
      }

      try {
        await this.processTradingCycle();
      } catch (error) {
        logger.error('Error in trading cycle:', error);
      }
    }, config.strategies.rotationIntervalMs);
  }

  private async processTradingCycle(): Promise<void> {
    // Find opportunities using active strategies
    const opportunities = await this.findOpportunities();

    // Evaluate opportunities with AI
    const evaluatedOpportunities = await this.evaluateOpportunities(opportunities);

    // Filter by confidence threshold
    const highConfidenceOpportunities = evaluatedOpportunities.filter(
      opp => opp.confidence >= config.ai.confidenceThreshold
    );

    // Execute best opportunities
    for (const opportunity of highConfidenceOpportunities) {
      await this.executeOpportunity(opportunity);
    }
  }

  private async findOpportunities(): Promise<TradeOpportunity[]> {
    const opportunities: TradeOpportunity[] = [];

    for (const strategy of this.activeStrategies.values()) {
      try {
        const strategyOpportunities = await this.executeStrategy(strategy);
        opportunities.push(...strategyOpportunities);
      } catch (error) {
        logger.error(`Error executing strategy ${strategy.name}:`, error);
      }
    }

    return opportunities;
  }

  private async executeStrategy(strategy: Strategy): Promise<TradeOpportunity[]> {
    // This is a simplified implementation
    // In reality, each strategy would have its own complex logic
    
    const opportunities: TradeOpportunity[] = [];
    
    // Generate mock opportunity for demonstration
    if (Math.random() > 0.7) {
      opportunities.push({
        id: `${strategy.id}_${Date.now()}`,
        type: strategy.type === 'ARBITRAGE' ? 'ARBITRAGE' : 'FLASH_LOAN',
        tokenA: 'ETH',
        tokenB: 'USDT',
        exchangeA: 'Uniswap',
        exchangeB: 'Sushiswap',
        priceA: 2000 + Math.random() * 100,
        priceB: 2010 + Math.random() * 100,
        profitUSD: Math.random() * 50,
        profitPercent: Math.random() * 2,
        gasEstimate: Math.random() * 0.01,
        confidence: Math.random(),
        timestamp: new Date()
      });
    }

    return opportunities;
  }

  private async evaluateOpportunities(opportunities: TradeOpportunity[]): Promise<TradeOpportunity[]> {
    // Use AI decision engine to evaluate opportunities
    const evaluatedOpportunities: TradeOpportunity[] = [];

    for (const opportunity of opportunities) {
      const aiEvaluation = await aiDecisionEngine.evaluateOpportunity(opportunity);
      
      evaluatedOpportunities.push({
        ...opportunity,
        confidence: aiEvaluation.confidence,
        profitUSD: aiEvaluation.adjustedProfit || opportunity.profitUSD
      });
    }

    // Sort by confidence
    return evaluatedOpportunities.sort((a, b) => b.confidence - a.confidence);
  }

  private async executeOpportunity(opportunity: TradeOpportunity): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info(`Executing opportunity: ${opportunity.id}`);

      // Check risk limits
      if (!this.checkRiskLimits(opportunity)) {
        logger.warn(`Opportunity rejected by risk limits: ${opportunity.id}`);
        return;
      }

      // Execute trade (simplified - in reality would be complex blockchain interaction)
      const success = await this.performTrade(opportunity);

      const executionTime = Date.now() - startTime;
      
      const result: TradeResult = {
        id: `trade_${Date.now()}`,
        strategyId: 'unknown',
        opportunity,
        success,
        profitUSD: success ? opportunity.profitUSD : 0,
        gasUsed: success ? opportunity.gasEstimate : 0,
        transactionHash: success ? `0x${Math.random().toString(16).substr(2, 64)}` : undefined,
        executionTime,
        timestamp: new Date()
      };

      this.recordTradeResult(result);
      this.emit('trade_executed', result);

    } catch (error) {
      logger.error(`Failed to execute opportunity ${opportunity.id}:`, error);
    }
  }

  private checkRiskLimits(opportunity: TradeOpportunity): boolean {
    if (!config.risk.enableRiskLimits) {
      return true;
    }

    // Check position size
    if (opportunity.profitUSD > config.risk.maxPositionSizeETH * 2000) {
      return false;
    }

    // Check daily loss limit
    if (this.metrics.totalLossUSD > config.risk.maxDailyLossETH * 2000) {
      return false;
    }

    return true;
  }

  private async performTrade(opportunity: TradeOpportunity): Promise<boolean> {
    // Simplified trade execution
    // In reality, this would involve complex blockchain interactions
    return Math.random() > 0.2; // 80% success rate for demo
  }

  private recordTradeResult(result: TradeResult): Promise<void> {
    this.tradeHistory.push(result);
    this.metrics.totalTrades++;

    if (result.success) {
      this.metrics.successfulTrades++;
      this.metrics.totalProfitUSD += result.profitUSD;
      this.metrics.netProfitUSD += result.profitUSD;
    } else {
      this.metrics.failedTrades++;
      this.metrics.totalLossUSD += Math.abs(result.profitUSD);
      this.metrics.netProfitUSD -= Math.abs(result.profitUSD);
    }

    // Update derived metrics
    this.updateDerivedMetrics();

    return Promise.resolve();
  }

  private updateDerivedMetrics(): void {
    if (this.metrics.totalTrades > 0) {
      this.metrics.successRate = (this.metrics.successfulTrades / this.metrics.totalTrades) * 100;
      this.metrics.winRate = this.metrics.successRate;
    }

    if (this.metrics.totalLossUSD > 0) {
      this.metrics.profitFactor = this.metrics.totalProfitUSD / this.metrics.totalLossUSD;
    }

    // Calculate average trade time
    if (this.tradeHistory.length > 0) {
      const totalTime = this.tradeHistory.reduce((sum, trade) => sum + trade.executionTime, 0);
      this.metrics.averageTradeTime = totalTime / this.tradeHistory.length;
    }

    this.metrics.timestamp = Date.now();
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      if (this.isRunning) {
        this.emit('performance_update', this.getPerformanceMetrics());
      }
    }, 5000); // Update every 5 seconds
  }

  public getSystemStatus(): any {
    return {
      isRunning: this.isRunning,
      activeStrategies: this.activeStrategies.size,
      totalStrategies: strategyRegistry.getAllStrategies().length,
      tradesExecuted: this.metrics.totalTrades,
      opportunitiesFound: this.executionQueue.length,
      currentBalance: 0, // Would get from wallet
      profitToday: this.metrics.netProfitUSD,
      uptime: process.uptime(),
      performance: this.metrics,
      lastUpdate: Date.now()
    };
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.initializeMetrics();
    this.tradeHistory = [];
    logger.info('Metrics reset');
  }
}

export const tradingEngine = new TradingEngine();
