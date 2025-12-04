import { TradeOpportunity, Strategy } from '../types';
import { neuralNetworkPredictor } from './neuralNetwork';
import { config } from '../config';
import logger from '../utils/logger';

export interface AIEvaluation {
  confidence: number;
  adjustedProfit?: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: 'EXECUTE' | 'SKIP' | 'WAIT';
  reasoning: string[];
}

export class AIDecisionEngine {
  private evaluationHistory: Map<string, AIEvaluation> = new Map();

  public async evaluateOpportunity(opportunity: TradeOpportunity): Promise<AIEvaluation> {
    const reasoning: string[] = [];
    let confidence = opportunity.confidence;
    let adjustedProfit = opportunity.profitUSD;

    // 1. Neural network prediction
    try {
      const predictedProfit = await neuralNetworkPredictor.predictProfit(opportunity);
      const profitAlignment = predictedProfit / opportunity.profitUSD;
      
      if (profitAlignment > 1.2) {
        confidence += 0.1;
        reasoning.push('AI predicts higher than expected profit');
      } else if (profitAlignment < 0.8) {
        confidence -= 0.1;
        reasoning.push('AI predicts lower than expected profit');
      }

      adjustedProfit = predictedProfit;
    } catch (error) {
      logger.error('Failed to get AI prediction:', error);
    }

    // 2. Market condition analysis
    const marketScore = await this.analyzeMarketConditions(opportunity);
    confidence *= marketScore;
    reasoning.push(`Market condition score: ${marketScore.toFixed(2)}`);

    // 3. Risk assessment
    const risk = this.assessRisk(opportunity, confidence);
    reasoning.push(`Risk level: ${risk}`);

    // 4. Gas cost optimization
    const gasOptimization = await this.optimizeGasCosts(opportunity);
    adjustedProfit -= gasOptimization.excessCost;
    reasoning.push(`Gas optimization: -$${gasOptimization.excessCost.toFixed(2)}`);

    // 5. Final confidence calculation
    confidence = Math.max(0, Math.min(1, confidence));

    // 6. Recommendation
    const recommendation = this.makeRecommendation(confidence, risk, adjustedProfit);

    const evaluation: AIEvaluation = {
      confidence,
      adjustedProfit,
      risk,
      recommendation,
      reasoning
    };

    // Store evaluation for learning
    this.evaluationHistory.set(opportunity.id, evaluation);

    return evaluation;
  }

  private async analyzeMarketConditions(opportunity: TradeOpportunity): Promise<number> {
    // Simplified market analysis
    // In reality, would analyze volatility, volume, spreads, etc.
    
    let score = 1.0;

    // Time-based analysis
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 17) {
      score *= 1.1; // Business hours
    } else {
      score *= 0.9; // Off hours
    }

    // Profit size analysis
    if (opportunity.profitUSD > 50) {
      score *= 1.2; // Large profit
    } else if (opportunity.profitUSD < 5) {
      score *= 0.8; // Small profit
    }

    return Math.max(0.1, Math.min(2, score));
  }

  private assessRisk(opportunity: TradeOpportunity, confidence: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    let riskScore = 0;

    // Profit size risk
    if (opportunity.profitUSD > 100) riskScore += 2;
    else if (opportunity.profitUSD > 50) riskScore += 1;

    // Gas cost risk
    if (opportunity.gasEstimate > 0.05) riskScore += 2;
    else if (opportunity.gasEstimate > 0.02) riskScore += 1;

    // Confidence risk
    if (confidence < 0.5) riskScore += 2;
    else if (confidence < 0.7) riskScore += 1;

    // Opportunity age risk
    const age = Date.now() - opportunity.timestamp.getTime();
    if (age > 30000) riskScore += 2; // 30 seconds
    else if (age > 10000) riskScore += 1; // 10 seconds

    if (riskScore >= 4) return 'HIGH';
    if (riskScore >= 2) return 'MEDIUM';
    return 'LOW';
  }

  private async optimizeGasCosts(opportunity: TradeOpportunity): Promise<{ excessCost: number }> {
    // Simplified gas optimization
    const optimalGas = 0.01; // ETH
    const excessCost = Math.max(0, opportunity.gasEstimate - optimalGas) * 2000; // Convert to USD

    return { excessCost };
  }

  private makeRecommendation(confidence: number, risk: string, profit: number): 'EXECUTE' | 'SKIP' | 'WAIT' {
    // High confidence and good profit
    if (confidence >= config.ai.confidenceThreshold && profit > config.trading.minProfitThresholdUSD) {
      if (risk === 'HIGH' && confidence < 0.9) {
        return 'WAIT';
      }
      return 'EXECUTE';
    }

    // Low profit or confidence
    if (profit < config.trading.minProfitThresholdUSD / 2 || confidence < 0.3) {
      return 'SKIP';
    }

    return 'WAIT';
  }

  public getStrategyPerformance(): Map<string, any> {
    const performance = new Map();

    // Analyze performance by opportunity type
    const typePerformance = new Map();
    
    for (const evaluation of this.evaluationHistory.values()) {
      const key = 'all'; // Could group by type, risk, etc.
      
      if (!typePerformance.has(key)) {
        typePerformance.set(key, {
          totalEvaluations: 0,
          averageConfidence: 0,
          riskDistribution: { LOW: 0, MEDIUM: 0, HIGH: 0 },
          recommendationDistribution: { EXECUTE: 0, SKIP: 0, WAIT: 0 }
        });
      }

      const stats = typePerformance.get(key);
      stats.totalEvaluations++;
      stats.averageConfidence = (stats.averageConfidence * (stats.totalEvaluations - 1) + evaluation.confidence) / stats.totalEvaluations;
      stats.riskDistribution[evaluation.risk]++;
      stats.recommendationDistribution[evaluation.recommendation]++;
    }

    return typePerformance;
  }
}

export const aiDecisionEngine = new AIDecisionEngine();
