import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type GetUserTransactionsInput, type Transaction } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserTransactions(input: GetUserTransactionsInput): Promise<Transaction[]> {
  try {
    // Apply pagination defaults
    const limit = input.limit ?? 10;
    const offset = input.offset ?? 0;
    
    // Build complete query in one chain to maintain proper type inference
    const results = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, input.user_id))
      .orderBy(desc(transactionsTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert numeric column to number
    }));
  } catch (error) {
    console.error('Failed to fetch user transactions:', error);
    throw error;
  }
}