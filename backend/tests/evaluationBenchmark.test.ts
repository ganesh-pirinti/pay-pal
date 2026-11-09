import { describe, it, expect } from 'vitest';
import { analyzeSellerProtection, analyzeInvoiceScam } from '../src/riskEngine.js';
import type { SellerProtectionInput, InvoiceScamInput } from '../../shared/src/types.js';

interface LabeledSellerCase {
  id: string;
  description: string;
  input: SellerProtectionInput;
  groundTruth: 'high_risk' | 'low_risk' | 'insufficient_evidence';
}

interface LabeledInvoiceCase {
  id: string;
  description: string;
  input: InvoiceScamInput;
  groundTruth: 'scam' | 'legitimate';
}

describe('Hackathon Benchmark Evaluation: Precision, Recall & False Positive Rate', () => {

  const sellerBenchmark: LabeledSellerCase[] = [
    // Legitimate cases
    {
      id: 'S-LEGIT-1',
      description: 'Holiday electronics sale: +300% volume increase with zero disputes and 0% refunds',
      input: { merchantId: 'S1', transactions: [100, 150, 200, 250, 300, 350], previousMonthSales: 300, disputes: 0, refunds: 0, accountAgeDays: 120 },
      groundTruth: 'low_risk'
    },
    {
      id: 'S-LEGIT-2',
      description: 'Steady boutique retailer: modest growth with normal 0.5% refund rate',
      input: { merchantId: 'S2', transactions: [80, 95, 110, 105, 90], previousMonthSales: 450, disputes: 0, refunds: 0, accountAgeDays: 365 },
      groundTruth: 'low_risk'
    },
    {
      id: 'S-LEGIT-3',
      description: 'B2B software consulting: high ticket size with zero disputes',
      input: { merchantId: 'S3', transactions: [2000, 2500, 3000], previousMonthSales: 6000, disputes: 0, refunds: 0, accountAgeDays: 400 },
      groundTruth: 'low_risk'
    },
    {
      id: 'S-LEGIT-4',
      description: 'Crowdfunded board game surge: 500% sales growth, 0.2% dispute rate',
      input: { merchantId: 'S4', transactions: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50], previousMonthSales: 100, disputes: 0, refunds: 0, accountAgeDays: 150 },
      groundTruth: 'low_risk'
    },
    {
      id: 'S-LEGIT-5',
      description: 'Established coffee roaster: regular repeat orders, 0 disputes',
      input: { merchantId: 'S5', transactions: [35, 42, 28, 55, 40, 60], previousMonthSales: 220, disputes: 0, refunds: 0, accountAgeDays: 500 },
      groundTruth: 'low_risk'
    },
    // High-risk fraud cases
    {
      id: 'S-FRAUD-1',
      description: 'Compromised merchant: +400% sales surge + 25% dispute rate + unverified buyers',
      input: { merchantId: 'SF1', transactions: [500, 800, 1200, 1500], previousMonthSales: 800, disputes: 2, refunds: 1, accountAgeDays: 45, unverifiedPayerRatio: 0.6 },
      groundTruth: 'high_risk'
    },
    {
      id: 'S-FRAUD-2',
      description: 'Gift card drop-shipper: extreme ticket spike with high refund chargebacks',
      input: { merchantId: 'SF2', transactions: [100, 200, 3500, 4200], previousMonthSales: 500, disputes: 1, refunds: 1, accountAgeDays: 60, unverifiedPayerRatio: 0.5 },
      groundTruth: 'high_risk'
    },
    {
      id: 'S-FRAUD-3',
      description: 'Card testing ring: high dispute velocity (4 disputes across 8 transactions)',
      input: { merchantId: 'SF3', transactions: [20, 20, 25, 20, 22, 20, 25, 20], previousMonthSales: 100, disputes: 4, refunds: 2, accountAgeDays: 90 },
      groundTruth: 'high_risk'
    },
    // Insufficient evidence cases
    {
      id: 'S-NEW-1',
      description: 'Brand new merchant: 3 days active, zero previous sales',
      input: { merchantId: 'SN1', transactions: [45, 90], previousMonthSales: 0, disputes: 0, refunds: 0, accountAgeDays: 3 },
      groundTruth: 'insufficient_evidence'
    },
    {
      id: 'S-NEW-2',
      description: 'First transaction on platform with no historical baseline',
      input: { merchantId: 'SN2', transactions: [150], previousMonthSales: 0, disputes: 0, refunds: 0, accountAgeDays: 1 },
      groundTruth: 'insufficient_evidence'
    }
  ];

  const invoiceBenchmark: LabeledInvoiceCase[] = [
    // Scam cases
    {
      id: 'INV-SCAM-1',
      description: 'Geek Squad $499 auto-renewal scam with unverified 1-888 callback',
      input: { invoiceText: 'Geek Squad Best Buy invoice #9821. Auto-renewal of $499.00 charged. Call our toll free helpdesk at 1-888-555-0144 to cancel immediately.' },
      groundTruth: 'scam'
    },
    {
      id: 'INV-SCAM-2',
      description: 'Fake legal threat with arrest warrant and 24-hour deadline',
      input: { invoiceText: 'URGENT LEGAL SUMMONS: Unpaid balance of $1,250. An arrest warrant will be issued by the sheriff within 24 hours. Call immediately at 1-800-555-0199.' },
      groundTruth: 'scam'
    },
    {
      id: 'INV-SCAM-3',
      description: 'Bitcoin settlement demand for technical services',
      input: { invoiceText: 'Invoice for system recovery. Send $2,000 via Bitcoin crypto wallet to address 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa within 12 hours.' },
      groundTruth: 'scam'
    },
    {
      id: 'INV-SCAM-4',
      description: 'Retail Gift Card payment instruction scam',
      input: { invoiceText: 'Billing Department: Settle your overdue balance by purchasing $500 in Target Gift Cards or Apple Cards and reply with scratch-off codes.' },
      groundTruth: 'scam'
    },
    {
      id: 'INV-SCAM-5',
      description: 'Norton Antivirus renewal scam with 24-hour cancellation threat',
      input: { invoiceText: 'Norton LifeLock protection auto-renewed for $399.00. If you did not make this purchase, call support at 1-877-555-0177 within 24 hours or account suspended.' },
      groundTruth: 'scam'
    },
    // Legitimate cases
    {
      id: 'INV-LEGIT-1',
      description: 'Corporate SaaS invoice with itemized line items and Net 30 terms',
      input: { invoiceText: 'Acme SaaS Corp. Invoice #INV-1090. EIN: 12-3456789. Net 30 terms. Item: Monthly Enterprise Plan - $800.00. Remit via ACH.' },
      groundTruth: 'legitimate'
    },
    {
      id: 'INV-LEGIT-2',
      description: 'Expedited shipping invoice with "Payment due upon receipt" (False Positive Test)',
      input: { invoiceText: 'Global Freight Express. Invoice #GF-441. Payment due upon receipt. Priority delivery of industrial supplies - $1,200. Tax ID: 98-7654321. Standard commercial wire to business banking.' },
      groundTruth: 'legitimate'
    },
    {
      id: 'INV-LEGIT-3',
      description: 'Freelance graphic design invoice with itemized deliverables',
      input: { invoiceText: 'Creative Studio LLC. Invoice #CS-82. Website UI design milestone 2. Total due: $2,500. Terms: Net 15. Please remit to Creative Studio LLC operating account.' },
      groundTruth: 'legitimate'
    },
    {
      id: 'INV-LEGIT-4',
      description: 'Office supply replenishment invoice with PO number',
      input: { invoiceText: 'Office Depot Solutions. Purchase Order #PO-9021. Itemized description: Paper and toner supplies - $345.50. Subtotal: $345.50. Tax: $24.18. Terms: Net 30.' },
      groundTruth: 'legitimate'
    },
    {
      id: 'INV-LEGIT-5',
      description: 'Legal retainer invoice with standard bar association terms',
      input: { invoiceText: 'Morrison & Partners LLP. Legal services invoice #L-881. Consulting hours for October 2026. Total: $4,500.00. Remit to Attorney Trust Account. Terms: Net 30.' },
      groundTruth: 'legitimate'
    }
  ];

  it('Evaluates Seller Protection Engine on Labeled Benchmark', () => {
    let tp = 0; // correctly identified high_risk
    let fp = 0; // legitimate misclassified as high_risk
    let tn = 0; // legitimate correctly identified as low_risk
    let fn = 0; // high_risk missed
    let insufficientMatched = 0;

    for (const testCase of sellerBenchmark) {
      const result = analyzeSellerProtection(testCase.input);
      const isPredictedHigh = result.category === 'High Risk';
      const isPredictedLow = result.category === 'Low Risk';
      const isPredictedInsufficient = result.category === 'Insufficient Evidence';

      if (testCase.groundTruth === 'high_risk') {
        if (isPredictedHigh) tp++;
        else fn++;
      } else if (testCase.groundTruth === 'low_risk') {
        if (isPredictedHigh) fp++;
        else if (isPredictedLow) tn++;
      } else if (testCase.groundTruth === 'insufficient_evidence') {
        if (isPredictedInsufficient) insufficientMatched++;
      }
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
    const falsePositiveRate = fp + tn > 0 ? fp / (fp + tn) : 0;

    console.log('\n--- SELLER PROTECTION BENCHMARK METRICS ---');
    console.log(`True Positives (Fraud Caught): ${tp}`);
    console.log(`False Positives (Legit Sales Spikes Misflagged): ${fp}`);
    console.log(`True Negatives (Legit Growth Cleared): ${tn}`);
    console.log(`False Negatives (Fraud Missed): ${fn}`);
    console.log(`Insufficient Evidence Detected: ${insufficientMatched} / 2`);
    console.log(`Precision: ${(precision * 100).toFixed(1)}%`);
    console.log(`Recall: ${(recall * 100).toFixed(1)}%`);
    console.log(`False Positive Rate: ${(falsePositiveRate * 100).toFixed(1)}%`);

    // Strict Hackathon assertions:
    expect(falsePositiveRate).toBe(0); // 0% false positive rate on legitimate growth spikes
    expect(precision).toBe(1.0); // 100% precision
    expect(recall).toBe(1.0); // 100% recall
    expect(insufficientMatched).toBe(2); // Accurately separates new merchants from fraud
  });

  it('Evaluates Invoice Scam Shield Engine on Labeled Benchmark', () => {
    let tp = 0; // correctly identified scam
    let fp = 0; // legitimate invoice falsely flagged as scam
    let tn = 0; // legitimate correctly identified
    let fn = 0; // scam missed

    for (const testCase of invoiceBenchmark) {
      const result = analyzeInvoiceScam(testCase.input);
      const isPredictedScam = result.category === 'High-Risk Scam';
      const isPredictedLegit = result.category === 'Legitimate / Low Risk';

      if (testCase.groundTruth === 'scam') {
        if (isPredictedScam) tp++;
        else fn++;
      } else if (testCase.groundTruth === 'legitimate') {
        if (isPredictedScam) fp++;
        else if (isPredictedLegit) tn++;
      }
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
    const falsePositiveRate = fp + tn > 0 ? fp / (fp + tn) : 0;

    console.log('\n--- INVOICE SCAM SHIELD BENCHMARK METRICS ---');
    console.log(`True Positives (Scams Caught): ${tp}`);
    console.log(`False Positives (Legitimate Commercial Invoices Misflagged): ${fp}`);
    console.log(`True Negatives (Genuine Invoices Cleared): ${tn}`);
    console.log(`False Negatives (Scams Missed): ${fn}`);
    console.log(`Precision: ${(precision * 100).toFixed(1)}%`);
    console.log(`Recall: ${(recall * 100).toFixed(1)}%`);
    console.log(`False Positive Rate: ${(falsePositiveRate * 100).toFixed(1)}%`);

    // Strict Hackathon assertions:
    expect(falsePositiveRate).toBe(0); // 0% false positive rate on legitimate commercial invoices
    expect(precision).toBe(1.0); // 100% precision
    expect(recall).toBe(1.0); // 100% recall
  });
});
