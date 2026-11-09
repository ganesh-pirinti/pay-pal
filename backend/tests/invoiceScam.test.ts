import { describe, it, expect } from 'vitest';
import { analyzeInvoiceScam } from '../src/riskEngine.js';
import { InvoiceScamInputSchema } from '../src/validation.js';

describe('Invoice Scam Shield Risk Engine & Linguistic Security Tests', () => {

  it('1. Normal Invoice: Ordinary B2B invoice with standard payment instructions is Low Risk', () => {
    const text = `
      ACME CLOUD SOLUTIONS LLC
      Invoice #: INV-2026-9901
      Date: November 10, 2026
      Terms: Net 30 days
      Tax ID / EIN: 84-1928471
      
      Itemized Description:
      1. Cloud Infrastructure Management (Nov 2026) - $1,450.00
      2. Automated Security Monitoring - $350.00
      
      Subtotal: $1,800.00
      Sales Tax: $0.00
      Total Due: $1,800.00
      
      Payment Instructions:
      Please remit payment via ACH or corporate check within 30 days to ACME Cloud Solutions Operating Account.
      Thank you for your business.
    `;

    const validated = InvoiceScamInputSchema.parse({ invoiceText: text });
    const result = analyzeInvoiceScam(validated);

    expect(result.category).toBe('Legitimate / Low Risk');
    expect(result.riskScore).toBeLessThan(30);
    expect(result.urgencyDetected).toBe(false);
    expect(result.impersonationDetected).toBe(false);
  });

  it('2. Coercive Threat Invoice: High urgency and legal/police threats detected as High-Risk Scam', () => {
    const text = `
      NOTICE OF IMMEDIATE COLLECTION:
      Your subscription has auto-renewed for $899.99.
      Immediate payment required within 24 hours.
      If unpaid, legal action and arrest warrant will be issued by the sheriff's office for fraud.
      Call our billing desk immediately at 1-800-555-0199 or your account will be permanently frozen.
    `;

    const validated = InvoiceScamInputSchema.parse({ invoiceText: text });
    const result = analyzeInvoiceScam(validated);

    expect(result.category).toBe('High-Risk Scam');
    expect(result.riskScore).toBeGreaterThanOrEqual(65);
    expect(result.urgencyDetected).toBe(true);
    expect(result.warnings.some(w => w.category === 'Urgency & Coercion')).toBe(true);
  });

  it('3. Fake-Support & Impersonation Invoice: Geek Squad scam with unverified phone number', () => {
    const text = `
      GEEK SQUAD BEST BUY INVOICE #GS-88210
      Thank you for your purchase of Geek Squad Complete PC Protection auto-renewal fee of $499.00.
      Charged automatically from your checking balance.
      If you did not authorize this purchase or want to cancel your subscription, reach us at our toll free helpdesk:
      Call Support: +1-888-555-0144
      Customer care is open 24/7.
    `;

    const validated = InvoiceScamInputSchema.parse({ invoiceText: text });
    const result = analyzeInvoiceScam(validated);

    expect(result.category).toBe('High-Risk Scam');
    expect(result.impersonationDetected).toBe(true);
    expect(result.warnings.some(w => w.category === 'Impersonation')).toBe(true);
    expect(result.unverifiedContacts.length).toBeGreaterThan(0);

    // Verify phone number is flagged as UNVERIFIED with proper caveat
    const contact = result.unverifiedContacts[0];
    expect(contact.isVerified).toBe(false);
    expect(contact.verificationCaveat).toContain('UNVERIFIED');
    expect(contact.verificationCaveat).toContain('cannot be asserted as fraudulent without independent carrier registry checks');
  });

  it('4. Unusual Payment Destination: Cryptocurrency or Gift Card demand detected as Critical Risk', () => {
    const text = `
      INVOICE FOR TECHNICAL CONSULTING SERVICES
      Amount: $2,500.00
      Due: Immediate
      Payment Instructions:
      Due to banking compliance, payments must be sent via Bitcoin crypto wallet to address:
      BTC: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
      Alternatively, purchase $2,500 in Target Gift Cards and email the activation codes.
    `;

    const validated = InvoiceScamInputSchema.parse({ invoiceText: text });
    const result = analyzeInvoiceScam(validated);

    expect(result.category).toBe('High-Risk Scam');
    expect(result.paymentDestinations.length).toBeGreaterThan(0);
    expect(result.paymentDestinations.some(p => p.isUnusual)).toBe(true);
    expect(result.warnings.some(w => w.category === 'Unusual Payment Instruction')).toBe(true);
  });

  it('5. False Positive Test: Legitimate invoice containing urgent commercial terms is NOT classified as scam', () => {
    const text = `
      EXPEDITED FREIGHT & LOGISTICS INVOICE
      Invoice Number: LOG-4410
      Date: November 9, 2026
      Payment due upon receipt for emergency supply chain shipment.
      Terms: Net 15
      Tax ID: 12-3456789
      Item: Priority Air Cargo Service - $3,200.00
      Please remit to Logistics Corp Corporate Commercial Banking ACH Routing 021000021.
    `;

    const validated = InvoiceScamInputSchema.parse({ invoiceText: text });
    const result = analyzeInvoiceScam(validated);

    // Must NOT trigger high risk scam
    expect(result.category).toBe('Legitimate / Low Risk');
    expect(result.riskScore).toBeLessThan(35);
    expect(result.warnings.some(w => w.category === 'Commercial Terms')).toBe(true);
    expect(result.warnings.some(w => w.category === 'Urgency & Coercion')).toBe(false);
  });

  it('6. Phone Number Status Rigor: Flags phone number as unverified without falsely claiming definite fraud', () => {
    const text = `
      Direct questions regarding your invoice to our accounts receivable department at 1-800-555-0182.
    `;

    const result = analyzeInvoiceScam({ invoiceText: text });
    const contact = result.unverifiedContacts.find(c => c.value.includes('800-555-0182'));
    expect(contact).toBeDefined();
    expect(contact?.isVerified).toBe(false);
    expect(contact?.verificationCaveat).toContain('Do not dial numbers provided in unsolicited invoices');
    // Explanation must not say "this phone number is a convicted scammer"
    expect(result.disclaimer).toContain('does not constitute definitive proof');
  });

  it('7. Adversarial, Empty, and Oversized Input Handling', () => {
    // Empty text rejected
    expect(() => InvoiceScamInputSchema.parse({ invoiceText: '' })).toThrow();
    expect(() => InvoiceScamInputSchema.parse({ invoiceText: '    ' })).toThrow();

    // Too short (< 5 chars)
    expect(() => InvoiceScamInputSchema.parse({ invoiceText: 'pay' })).toThrow();

    // Oversized text (> 50,000 chars)
    const giantText = 'A'.repeat(55000);
    expect(() => InvoiceScamInputSchema.parse({ invoiceText: giantText })).toThrow();

    // Adversarial characters / SQL injection strings / HTML script tags handled safely
    const adversarialText = `
      <script>alert("xss")</script>
      SELECT * FROM users WHERE '1'='1'; DROP TABLE invoices; --
      %00%ff%fe\u0000\u0007\uFFFF
      Invoice with strange payloads: && || ; rm -rf /
    `;
    const validated = InvoiceScamInputSchema.parse({ invoiceText: adversarialText });
    const result = analyzeInvoiceScam(validated);
    expect(result).toBeDefined();
    expect(typeof result.riskScore).toBe('number');
  });
});
