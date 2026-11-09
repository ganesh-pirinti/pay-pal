import { z } from 'zod';

export const SellerProtectionInputSchema = z.object({
  merchantId: z.string().trim().min(1, 'Merchant ID is required').max(100, 'Merchant ID is too long'),
  transactions: z.array(
    z.number()
      .positive('Transaction amounts must be positive values')
      .max(5000000, 'Individual transaction amount exceeds supported threshold ($5,000,000)')
  ).min(1, 'At least one transaction amount is required for assessment'),
  previousMonthSales: z.number()
    .min(0, 'Previous month sales cannot be negative')
    .max(100000000, 'Previous month sales exceed maximum allowable threshold'),
  disputes: z.number()
    .int('Disputes count must be an integer')
    .min(0, 'Disputes count cannot be negative')
    .max(100000, 'Disputes count exceeds allowable range'),
  refunds: z.number()
    .int('Refunds count must be an integer')
    .min(0, 'Refunds count cannot be negative')
    .max(100000, 'Refunds count exceeds allowable range'),
  accountAgeDays: z.number().int().min(0).max(36500).optional(),
  unverifiedPayerRatio: z.number().min(0).max(100).optional()
});

export const InvoiceScamInputSchema = z.object({
  invoiceText: z.string()
    .trim()
    .min(5, 'Invoice text must contain at least 5 characters')
    .max(50000, 'Invoice text exceeds maximum allowable size (50,000 characters)'),
  senderEmail: z.string().email('Invalid email address format').optional().or(z.literal('')),
  invoiceNumber: z.string().max(100).optional()
});

export const CreateOrderInputSchema = z.object({
  amount: z.union([
    z.number().positive('Amount must be greater than zero').max(10000, 'Sandbox test orders capped at $10,000.00'),
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid positive currency number with up to 2 decimal places')
  ]).transform(val => (typeof val === 'number' ? val.toFixed(2) : parseFloat(val).toFixed(2)))
    .refine(val => parseFloat(val) > 0, 'Amount must be greater than zero')
    .refine(val => parseFloat(val) <= 10000, 'Sandbox test orders capped at $10,000.00'),
  currency: z.string().toUpperCase().default('USD').refine(
    val => ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'].includes(val),
    'Currency must be one of: USD, EUR, GBP, CAD, AUD, JPY'
  ),
  description: z.string().max(127, 'Description cannot exceed 127 characters').optional()
});

export const OrderIdParamSchema = z.string()
  .trim()
  .min(8, 'Invalid PayPal Order ID format (too short)')
  .max(36, 'Invalid PayPal Order ID format (too long)')
  .regex(/^[A-Z0-9_-]+$/i, 'PayPal Order ID must contain only alphanumeric characters');

export const EvaluateSandboxTransactionSchema = z.object({
  orderId: OrderIdParamSchema,
  amount: z.number().positive('Transaction amount must be positive'),
  currency: z.string().default('USD'),
  buyerEmail: z.string().email('Invalid buyer email format').optional(),
  status: z.string().default('COMPLETED'),
  sellerHistory: z.object({
    previousSales: z.number().min(0).default(1000),
    disputes: z.number().int().min(0).default(0),
    refunds: z.number().int().min(0).default(0)
  }).optional()
});

export const InvestigateCaseInputSchema = z.object({
  caseTitle: z.string().max(200).optional(),
  merchantData: SellerProtectionInputSchema.optional(),
  invoiceText: z.string().max(50000).optional(),
  sandboxOrderId: z.string().max(50).optional()
}).refine(data => data.merchantData || data.invoiceText || data.sandboxOrderId, {
  message: 'At least one investigation vector (merchantData, invoiceText, or sandboxOrderId) must be provided.'
});

export const HumanReviewActionSchema = z.object({
  action: z.enum([
    'Approve Standard Flow',
    'Request Additional Documentation',
    'Place on 48h Rolling Monitor',
    'Escalate to Compliance Specialist'
  ]),
  notes: z.string().max(1000).optional()
});
