import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const transactionTypeEnum = pgEnum('transaction_type', ['topup', 'wallet_deposit', 'wallet_withdrawal']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'completed', 'failed', 'cancelled']);
export const paymentMethodEnum = pgEnum('payment_method', ['wallet', 'payment_gateway']);
export const serviceTypeEnum = pgEnum('service_type', ['prepaid', 'postpaid']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  wallet_balance: numeric('wallet_balance', { precision: 10, scale: 2 }).notNull().default('0.00'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Service categories table
export const serviceCategoriesTable = pgTable('service_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Service products table (simulating Digiflazz products)
export const serviceProductsTable = pgTable('service_products', {
  id: serial('id').primaryKey(),
  category_id: integer('category_id').notNull(),
  product_code: text('product_code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  type: serviceTypeEnum('type').notNull(),
  provider: text('provider').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  transaction_type: transactionTypeEnum('transaction_type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  status: transactionStatusEnum('status').notNull().default('pending'),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  reference_id: text('reference_id'), // Payment gateway reference
  product_id: integer('product_id'), // For topup transactions
  target_number: text('target_number'), // Phone number for topup
  digiflazz_reference: text('digiflazz_reference'), // Digiflazz transaction reference
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  transactions: many(transactionsTable),
}));

export const serviceCategoriesRelations = relations(serviceCategoriesTable, ({ many }) => ({
  products: many(serviceProductsTable),
}));

export const serviceProductsRelations = relations(serviceProductsTable, ({ one, many }) => ({
  category: one(serviceCategoriesTable, {
    fields: [serviceProductsTable.category_id],
    references: [serviceCategoriesTable.id],
  }),
  transactions: many(transactionsTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.user_id],
    references: [usersTable.id],
  }),
  product: one(serviceProductsTable, {
    fields: [transactionsTable.product_id],
    references: [serviceProductsTable.id],
  }),
}));

// TypeScript types for the tables
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type ServiceCategory = typeof serviceCategoriesTable.$inferSelect;
export type NewServiceCategory = typeof serviceCategoriesTable.$inferInsert;

export type ServiceProduct = typeof serviceProductsTable.$inferSelect;
export type NewServiceProduct = typeof serviceProductsTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  serviceCategories: serviceCategoriesTable,
  serviceProducts: serviceProductsTable,
  transactions: transactionsTable,
};