import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string(),
  wallet_balance: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Service category schema
export const serviceCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type ServiceCategory = z.infer<typeof serviceCategorySchema>;

// Service product schema (from Digiflazz API simulation)
export const serviceProductSchema = z.object({
  id: z.number(),
  category_id: z.number(),
  product_code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  type: z.enum(['prepaid', 'postpaid']),
  provider: z.string(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ServiceProduct = z.infer<typeof serviceProductSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  transaction_type: z.enum(['topup', 'wallet_deposit', 'wallet_withdrawal']),
  amount: z.number(),
  status: z.enum(['pending', 'completed', 'failed', 'cancelled']),
  payment_method: z.enum(['wallet', 'payment_gateway']),
  reference_id: z.string().nullable(),
  product_id: z.number().nullable(),
  target_number: z.string().nullable(),
  digiflazz_reference: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Input schemas for creating users
export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().min(10)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schemas for wallet operations
export const walletDepositInputSchema = z.object({
  user_id: z.number(),
  amount: z.number().positive(),
  payment_method: z.enum(['payment_gateway'])
});

export type WalletDepositInput = z.infer<typeof walletDepositInputSchema>;

// Input schemas for top-up operations
export const topUpInputSchema = z.object({
  user_id: z.number(),
  product_id: z.number(),
  target_number: z.string().min(10),
  payment_method: z.enum(['wallet', 'payment_gateway'])
});

export type TopUpInput = z.infer<typeof topUpInputSchema>;

// Input schemas for creating service categories
export const createServiceCategoryInputSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().nullable().optional()
});

export type CreateServiceCategoryInput = z.infer<typeof createServiceCategoryInputSchema>;

// Input schemas for creating service products
export const createServiceProductInputSchema = z.object({
  category_id: z.number(),
  product_code: z.string(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.number().positive(),
  type: z.enum(['prepaid', 'postpaid']),
  provider: z.string().min(1)
});

export type CreateServiceProductInput = z.infer<typeof createServiceProductInputSchema>;

// Query schemas
export const getUserByIdInputSchema = z.object({
  user_id: z.number()
});

export type GetUserByIdInput = z.infer<typeof getUserByIdInputSchema>;

export const getProductsByCategoryInputSchema = z.object({
  category_id: z.number()
});

export type GetProductsByCategoryInput = z.infer<typeof getProductsByCategoryInputSchema>;

export const getUserTransactionsInputSchema = z.object({
  user_id: z.number(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetUserTransactionsInput = z.infer<typeof getUserTransactionsInputSchema>;