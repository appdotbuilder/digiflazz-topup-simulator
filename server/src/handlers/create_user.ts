import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Insert user record with initial wallet balance of 0
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        name: input.name,
        phone: input.phone,
        wallet_balance: '0.00' // Convert to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const user = result[0];
    return {
      ...user,
      wallet_balance: parseFloat(user.wallet_balance) // Convert string back to number
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};