import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, serviceCategoriesTable, serviceProductsTable, transactionsTable } from '../db/schema';
import { type TopUpInput } from '../schema';
import { processTopUp } from '../handlers/process_topup';
import { eq } from 'drizzle-orm';

// Test data setup
const createTestData = async () => {
  // Create a service category first
  const categoryResults = await db.insert(serviceCategoriesTable)
    .values({
      name: 'Mobile Prepaid',
      code: 'MOBILE_PREPAID',
      description: 'Mobile prepaid top-up services'
    })
    .returning()
    .execute();

  const category = categoryResults[0];

  // Create a test user with sufficient wallet balance
  const userResults = await db.insert(usersTable)
    .values({
      email: 'test@example.com',
      name: 'Test User',
      phone: '08123456789',
      wallet_balance: '100000.00' // 100,000 rupiah
    })
    .returning()
    .execute();

  const user = userResults[0];

  // Create a low-balance user
  const lowBalanceUserResults = await db.insert(usersTable)
    .values({
      email: 'lowbalance@example.com',
      name: 'Low Balance User',
      phone: '08987654321',
      wallet_balance: '5000.00' // 5,000 rupiah
    })
    .returning()
    .execute();

  const lowBalanceUser = lowBalanceUserResults[0];

  // Create an active service product
  const activeProductResults = await db.insert(serviceProductsTable)
    .values({
      category_id: category.id,
      product_code: 'TSEL_10K',
      name: 'Telkomsel 10,000',
      description: 'Telkomsel prepaid 10,000 rupiah',
      price: '10000.00',
      type: 'prepaid',
      provider: 'Telkomsel',
      is_active: true
    })
    .returning()
    .execute();

  const activeProduct = activeProductResults[0];

  // Create an inactive service product
  const inactiveProductResults = await db.insert(serviceProductsTable)
    .values({
      category_id: category.id,
      product_code: 'XL_20K',
      name: 'XL 20,000',
      description: 'XL prepaid 20,000 rupiah',
      price: '20000.00',
      type: 'prepaid',
      provider: 'XL',
      is_active: false
    })
    .returning()
    .execute();

  const inactiveProduct = inactiveProductResults[0];

  return {
    user,
    lowBalanceUser,
    activeProduct,
    inactiveProduct
  };
};

describe('processTopUp', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully process wallet top-up with sufficient balance', async () => {
    const { user, activeProduct } = await createTestData();

    const testInput: TopUpInput = {
      user_id: user.id,
      product_id: activeProduct.id,
      target_number: '08123456789',
      payment_method: 'wallet'
    };

    const result = await processTopUp(testInput);

    // Verify transaction details
    expect(result.user_id).toEqual(user.id);
    expect(result.transaction_type).toEqual('topup');
    expect(result.amount).toEqual(10000);
    expect(result.payment_method).toEqual('wallet');
    expect(result.product_id).toEqual(activeProduct.id);
    expect(result.target_number).toEqual('08123456789');
    expect(result.reference_id).toBeNull();
    expect(result.digiflazz_reference).toMatch(/^DGF_\d+$/);
    expect(['completed', 'failed']).toContain(result.status);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should successfully process payment gateway top-up', async () => {
    const { user, activeProduct } = await createTestData();

    const testInput: TopUpInput = {
      user_id: user.id,
      product_id: activeProduct.id,
      target_number: '08123456789',
      payment_method: 'payment_gateway'
    };

    const result = await processTopUp(testInput);

    // Verify transaction details
    expect(result.user_id).toEqual(user.id);
    expect(result.transaction_type).toEqual('topup');
    expect(result.amount).toEqual(10000);
    expect(result.payment_method).toEqual('payment_gateway');
    expect(result.product_id).toEqual(activeProduct.id);
    expect(result.target_number).toEqual('08123456789');
    expect(result.reference_id).toMatch(/^PAY_\d+$/);
    expect(result.digiflazz_reference).toMatch(/^DGF_\d+$/);
    expect(['completed', 'failed']).toContain(result.status);
    expect(result.id).toBeDefined();
  });

  it('should save transaction to database', async () => {
    const { user, activeProduct } = await createTestData();

    const testInput: TopUpInput = {
      user_id: user.id,
      product_id: activeProduct.id,
      target_number: '08123456789',
      payment_method: 'wallet'
    };

    const result = await processTopUp(testInput);

    // Query the database to verify transaction was saved
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    const savedTransaction = transactions[0];
    expect(savedTransaction.user_id).toEqual(user.id);
    expect(savedTransaction.product_id).toEqual(activeProduct.id);
    expect(savedTransaction.transaction_type).toEqual('topup');
    expect(parseFloat(savedTransaction.amount)).toEqual(10000);
    expect(savedTransaction.target_number).toEqual('08123456789');
    expect(['completed', 'failed']).toContain(savedTransaction.status);
  });

  it('should deduct wallet balance on successful wallet payment', async () => {
    const { user, activeProduct } = await createTestData();

    const initialBalance = 100000;

    const testInput: TopUpInput = {
      user_id: user.id,
      product_id: activeProduct.id,
      target_number: '08123456789',
      payment_method: 'wallet'
    };

    const result = await processTopUp(testInput);

    // Only check balance if transaction completed successfully
    if (result.status === 'completed') {
      const updatedUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      const updatedBalance = parseFloat(updatedUsers[0].wallet_balance);
      expect(updatedBalance).toEqual(initialBalance - 10000);
    }
  });

  it('should not deduct wallet balance on failed transaction', async () => {
    const { user, activeProduct } = await createTestData();

    const initialBalance = 100000;

    // Mock Math.random to always return > 0.1 (force failure for this test by making multiple attempts)
    const originalRandom = Math.random;
    let attemptCount = 0;
    Math.random = () => {
      attemptCount++;
      // Force failure on first few attempts to test failed transaction path
      return attemptCount <= 3 ? 0.05 : 0.95; // First attempts fail, later succeed
    };

    const testInput: TopUpInput = {
      user_id: user.id,
      product_id: activeProduct.id,
      target_number: '08123456789',
      payment_method: 'wallet'
    };

    try {
      const result = await processTopUp(testInput);

      // Check balance based on actual result
      const updatedUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .execute();

      const updatedBalance = parseFloat(updatedUsers[0].wallet_balance);

      if (result.status === 'failed') {
        // Balance should remain unchanged on failed transaction
        expect(updatedBalance).toEqual(initialBalance);
      } else {
        // Balance should be deducted on successful transaction
        expect(updatedBalance).toEqual(initialBalance - 10000);
      }
    } finally {
      // Restore original Math.random
      Math.random = originalRandom;
    }
  });

  it('should reject wallet payment with insufficient balance', async () => {
    const { lowBalanceUser, activeProduct } = await createTestData();

    const testInput: TopUpInput = {
      user_id: lowBalanceUser.id,
      product_id: activeProduct.id,
      target_number: '08123456789',
      payment_method: 'wallet'
    };

    await expect(processTopUp(testInput)).rejects.toThrow(/insufficient wallet balance/i);
  });

  it('should reject top-up for inactive product', async () => {
    const { user, inactiveProduct } = await createTestData();

    const testInput: TopUpInput = {
      user_id: user.id,
      product_id: inactiveProduct.id,
      target_number: '08123456789',
      payment_method: 'wallet'
    };

    await expect(processTopUp(testInput)).rejects.toThrow(/product not found or inactive/i);
  });

  it('should reject top-up for non-existent product', async () => {
    const { user } = await createTestData();

    const testInput: TopUpInput = {
      user_id: user.id,
      product_id: 99999, // Non-existent product ID
      target_number: '08123456789',
      payment_method: 'wallet'
    };

    await expect(processTopUp(testInput)).rejects.toThrow(/product not found or inactive/i);
  });

  it('should reject top-up for non-existent user', async () => {
    const { activeProduct } = await createTestData();

    const testInput: TopUpInput = {
      user_id: 99999, // Non-existent user ID
      product_id: activeProduct.id,
      target_number: '08123456789',
      payment_method: 'wallet'
    };

    await expect(processTopUp(testInput)).rejects.toThrow(/user not found/i);
  });

  it('should validate user exists for payment gateway method', async () => {
    const { activeProduct } = await createTestData();

    const testInput: TopUpInput = {
      user_id: 99999, // Non-existent user ID
      product_id: activeProduct.id,
      target_number: '08123456789',
      payment_method: 'payment_gateway'
    };

    await expect(processTopUp(testInput)).rejects.toThrow(/user not found/i);
  });
});