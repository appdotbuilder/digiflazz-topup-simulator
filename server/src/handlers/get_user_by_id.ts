import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserByIdInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUserById(input: GetUserByIdInput): Promise<User | null> {
  try {
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    // Convert numeric field back to number
    return {
      ...user,
      wallet_balance: parseFloat(user.wallet_balance)
    };
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}