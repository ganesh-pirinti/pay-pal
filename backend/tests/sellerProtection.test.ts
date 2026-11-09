import { describe, it, expect } from 'vitest';
import { analyzeSellerProtection } from '../src/riskEngine.js';
import { SellerProtectionInputSchema } from '../src/validation.js';

describe('Seller Protection Risk Engine & Validation Tests', () => {

  it('1. Legitimate Merchant: High sales volume spike with healthy risk indicators MUST NOT be classified as fraudulent', () => {
    const input = {
      merchantId: 'MERCHANT_GROWTH_001',
      transactions: [120, 150, 180, 200, 250, 300, 310, 290, 400, 350], // Total $2,550
      previousMonthSales: 800, // +218.75% growth surge
      disputes: 0, // 0.0% dispute rate
      refunds: 0, // 0.0% refund rate
      accountAgeDays: 180,
      unverifiedPayerRatio: 0.05
    };

    const validated = SellerProtectionInputSchema.parse(input);
    const result = analyzeSellerProtection(validated);

    // Sales spike alone must NOT trigger high risk or fraud
    expect(result.category).toBe('Low Risk');
    expect(result.riskScore).toBeLessThan(35);
    expect(result.explanation).toContain('Sales volume surge');
    expect(result.explanation).toContain('remain healthy');
    expect(result.signals.some(s => s.id === 'SALES_VOLUME_ACCELERATION')).toBe(true);
    expect(result.recommendations.some(r => r.includes('do not apply restrictive holds'))).toBe(true);
  });

  it('2. Suspicious Merchant: Sales spike PLUS multiple independent risk signals classified as High Risk', () => {
    const input = {
      merchantId: 'MERCHANT_COMPROMISED_002',
      transactions: [250, 300, 450, 500, 600, 800, 950, 1200, 1400, 3200], // Surge with ticket anomaly
      previousMonthSales: 1000,
      disputes: 3, // 30% dispute rate (extreme anomaly)
      refunds: 2, // 20% refund rate
      accountAgeDays: 60,
      unverifiedPayerRatio: 0.65 // High unverified buyer concentration
    };

    const validated = SellerProtectionInputSchema.parse(input);
    const result = analyzeSellerProtection(validated);

    expect(result.category).toBe('High Risk');
    expect(result.riskScore).toBeGreaterThanOrEqual(65);
    expect(result.explanation).toContain('compound risk signals');
    expect(result.signals.some(s => s.id === 'HIGH_DISPUTE_RATE')).toBe(true);
    expect(result.signals.some(s => s.id === 'HIGH_REFUND_RATE')).toBe(true);
    expect(result.recommendations.some(r => r.includes('compliance and fulfillment review'))).toBe(true);
  });

  it('3. New Merchant: Insufficient historical baseline explicitly distinguished from malicious fraud', () => {
    const input = {
      merchantId: 'MERCHANT_NEWBIE_003',
      transactions: [75, 120],
      previousMonthSales: 0, // Zero baseline
      disputes: 0,
      refunds: 0,
      accountAgeDays: 12 // Newly created
    };

    const validated = SellerProtectionInputSchema.parse(input);
    const result = analyzeSellerProtection(validated);

    expect(result.category).toBe('Insufficient Evidence');
    expect(result.explanation).toContain('unestablished transaction history');
    expect(result.explanation).toContain('unverified tenure rather than confirmed malicious activity');
    expect(result.recommendations.some(r => r.includes('Do not restrict account purely due to lack of historical baseline'))).toBe(true);
  });

  it('4. Isolated Dispute Surge: Stable sales but elevated dispute rate triggers proportionate medium/high alert', () => {
    const input = {
      merchantId: 'MERCHANT_DISPUTES_004',
      transactions: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
      previousMonthSales: 500, // Stable, no spike
      disputes: 2, // 20% dispute rate
      refunds: 0,
      accountAgeDays: 200
    };

    const validated = SellerProtectionInputSchema.parse(input);
    const result = analyzeSellerProtection(validated);

    expect(['Medium Risk', 'High Risk']).toContain(result.category);
    expect(result.signals.some(s => s.id === 'HIGH_DISPUTE_RATE')).toBe(true);
    expect(result.recommendations.some(r => r.includes('dispute'))).toBe(true);
  });

  it('5. Isolated Refund Surge: High customer dissatisfaction detected', () => {
    const input = {
      merchantId: 'MERCHANT_REFUNDS_005',
      transactions: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
      previousMonthSales: 1000,
      disputes: 0,
      refunds: 3, // 30% refund rate
      accountAgeDays: 300
    };

    const validated = SellerProtectionInputSchema.parse(input);
    const result = analyzeSellerProtection(validated);

    expect(result.signals.some(s => s.id === 'HIGH_REFUND_RATE')).toBe(true);
    expect(result.riskScore).toBeGreaterThanOrEqual(30);
  });

  it('6. Input Validation & Error Handling: Rejects negative, empty, or missing values', () => {
    // Negative transaction
    const negativeTest = {
      merchantId: 'M-1',
      transactions: [100, -50],
      previousMonthSales: 100,
      disputes: 0,
      refunds: 0
    };
    expect(() => SellerProtectionInputSchema.parse(negativeTest)).toThrow();

    // Empty transactions
    const emptyTest = {
      merchantId: 'M-1',
      transactions: [],
      previousMonthSales: 100,
      disputes: 0,
      refunds: 0
    };
    expect(() => SellerProtectionInputSchema.parse(emptyTest)).toThrow();

    // Negative disputes
    const negativeDisputeTest = {
      merchantId: 'M-1',
      transactions: [100],
      previousMonthSales: 100,
      disputes: -2,
      refunds: 0
    };
    expect(() => SellerProtectionInputSchema.parse(negativeDisputeTest)).toThrow();

    // Unreasonably large transaction value
    const extremeValueTest = {
      merchantId: 'M-1',
      transactions: [99999999999],
      previousMonthSales: 100,
      disputes: 0,
      refunds: 0
    };
    expect(() => SellerProtectionInputSchema.parse(extremeValueTest)).toThrow();
  });

  it('7. Advisory Safety: Never claims to freeze, restrict, or modify real PayPal accounts', () => {
    const input = {
      merchantId: 'MERCHANT_SAFETY_007',
      transactions: [500, 800, 1200],
      previousMonthSales: 200,
      disputes: 2,
      refunds: 1
    };
    const result = analyzeSellerProtection(input);
    expect(result.disclaimer).toContain('does not execute account freezes');
    expect(result.isSimulated).toBe(true);
  });
});
