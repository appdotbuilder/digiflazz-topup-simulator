import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable, serviceCategoriesTable, serviceProductsTable } from '../db/schema';
import { type GetUserTransactionsInput } from '../schema';
import { getUserTransactions } from '../handlers/get_user_transactions';

describe('getUserTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no transactions', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
        wallet_balance: '100.00'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const input: GetUserTransactionsInput = {
      user_id: userId
    };

    const result = await getUserTransactions(input);

    expect(result).toEqual([]);
  });

  it('should return user transactions ordered by created_at DESC', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
        wallet_balance: '100.00'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple transactions with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await db.insert(transactionsTable)
      .values([
        {
          user_id: userId,
          transaction_type: 'wallet_deposit',
          amount: '50.00',
          status: 'completed',
          payment_method: 'payment_gateway',
          created_at: twoHoursAgo,
          updated_at: twoHoursAgo
        },
        {
          user_id: userId,
          transaction_type: 'wallet_withdrawal',
          amount: '25.00',
          status: 'pending',
          payment_method: 'wallet',
          created_at: oneHourAgo,
          updated_at: oneHourAgo
        },
        {
          user_id: userId,
          transaction_type: 'wallet_deposit',
          amount: '100.00',
          status: 'completed',
          payment_method: 'payment_gateway',
          created_at: now,
          updated_at: now
        }
      ])
      .execute();

    const input: GetUserTransactionsInput = {
      user_id: userId
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(3);
    
    // Verify ordering by created_at DESC (newest first)
    expect(result[0].amount).toEqual(100.00);
    expect(result[0].transaction_type).toEqual('wallet_deposit');
    expect(result[1].amount).toEqual(25.00);
    expect(result[1].transaction_type).toEqual('wallet_withdrawal');
    expect(result[2].amount).toEqual(50.00);
    expect(result[2].transaction_type).toEqual('wallet_deposit');

    // Verify numeric conversion
    result.forEach(transaction => {
      expect(typeof transaction.amount).toBe('number');
      expect(transaction.created_at).toBeInstanceOf(Date);
      expect(transaction.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should only return transactions for the specified user', async () => {
    // Create two users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          name: 'User One',
          phone: '1111111111',
          wallet_balance: '100.00'
        },
        {
          email: 'user2@example.com',
          name: 'User Two',
          phone: '2222222222',
          wallet_balance: '200.00'
        }
      ])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create transactions for both users
    await db.insert(transactionsTable)
      .values([
        {
          user_id: user1Id,
          transaction_type: 'wallet_deposit',
          amount: '50.00',
          status: 'completed',
          payment_method: 'payment_gateway'
        },
        {
          user_id: user2Id,
          transaction_type: 'wallet_deposit',
          amount: '75.00',
          status: 'completed',
          payment_method: 'payment_gateway'
        },
        {
          user_id: user1Id,
          transaction_type: 'wallet_withdrawal',
          amount: '25.00',
          status: 'pending',
          payment_method: 'wallet'
        }
      ])
      .execute();

    const input: GetUserTransactionsInput = {
      user_id: user1Id
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(2);
    result.forEach(transaction => {
      expect(transaction.user_id).toEqual(user1Id);
    });
  });

  it('should support pagination with limit and offset', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
        wallet_balance: '100.00'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create 5 transactions
    const transactions = [];
    for (let i = 0; i < 5; i++) {
      transactions.push({
        user_id: userId,
        transaction_type: 'wallet_deposit' as const,
        amount: `${10 + i}.00`,
        status: 'completed' as const,
        payment_method: 'payment_gateway' as const,
        created_at: new Date(Date.now() + i * 1000), // Different timestamps for ordering
        updated_at: new Date(Date.now() + i * 1000)
      });
    }

    await db.insert(transactionsTable)
      .values(transactions)
      .execute();

    // Test first page
    const firstPageInput: GetUserTransactionsInput = {
      user_id: userId,
      limit: 2,
      offset: 0
    };

    const firstPage = await getUserTransactions(firstPageInput);
    expect(firstPage).toHaveLength(2);
    expect(firstPage[0].amount).toEqual(14.00); // Newest (highest timestamp)
    expect(firstPage[1].amount).toEqual(13.00);

    // Test second page
    const secondPageInput: GetUserTransactionsInput = {
      user_id: userId,
      limit: 2,
      offset: 2
    };

    const secondPage = await getUserTransactions(secondPageInput);
    expect(secondPage).toHaveLength(2);
    expect(secondPage[0].amount).toEqual(12.00);
    expect(secondPage[1].amount).toEqual(11.00);

    // Test last page
    const lastPageInput: GetUserTransactionsInput = {
      user_id: userId,
      limit: 2,
      offset: 4
    };

    const lastPage = await getUserTransactions(lastPageInput);
    expect(lastPage).toHaveLength(1);
    expect(lastPage[0].amount).toEqual(10.00); // Oldest
  });

  it('should use default pagination when limit and offset not provided', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
        wallet_balance: '100.00'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create 15 transactions (more than default limit)
    const transactions = [];
    for (let i = 0; i < 15; i++) {
      transactions.push({
        user_id: userId,
        transaction_type: 'wallet_deposit' as const,
        amount: `${10 + i}.00`,
        status: 'completed' as const,
        payment_method: 'payment_gateway' as const
      });
    }

    await db.insert(transactionsTable)
      .values(transactions)
      .execute();

    const input: GetUserTransactionsInput = {
      user_id: userId
      // No limit or offset provided
    };

    const result = await getUserTransactions(input);

    // Should return default limit of 10
    expect(result).toHaveLength(10);
  });

  it('should handle topup transactions with product references', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User',
        phone: '1234567890',
        wallet_balance: '100.00'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(serviceCategoriesTable)
      .values({
        name: 'Mobile Pulsa',
        code: 'PULSA',
        description: 'Mobile top-up services'
      })
      .returning()
      .execute();

    const productResult = await db.insert(serviceProductsTable)
      .values({
        category_id: categoryResult[0].id,
        product_code: 'TSEL10',
        name: 'Telkomsel 10k',
        price: '10000.00',
        type: 'prepaid',
        provider: 'Telkomsel'
      })
      .returning()
      .execute();

    // Create topup transaction
    await db.insert(transactionsTable)
      .values({
        user_id: userResult[0].id,
        transaction_type: 'topup',
        amount: '10000.00',
        status: 'completed',
        payment_method: 'wallet',
        product_id: productResult[0].id,
        target_number: '08123456789',
        digiflazz_reference: 'DGF123456'
      })
      .execute();

    const input: GetUserTransactionsInput = {
      user_id: userResult[0].id
    };

    const result = await getUserTransactions(input);

    expect(result).toHaveLength(1);
    expect(result[0].transaction_type).toEqual('topup');
    expect(result[0].amount).toEqual(10000.00);
    expect(result[0].product_id).toEqual(productResult[0].id);
    expect(result[0].target_number).toEqual('08123456789');
    expect(result[0].digiflazz_reference).toEqual('DGF123456');
  });
});