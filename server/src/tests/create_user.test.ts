import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  name: 'John Doe',
  phone: '1234567890'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with correct data', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('John Doe');
    expect(result.phone).toEqual('1234567890');
    expect(result.wallet_balance).toEqual(0);
    expect(typeof result.wallet_balance).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database with initial wallet balance', async () => {
    const result = await createUser(testInput);

    // Query database to verify the user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('John Doe');
    expect(users[0].phone).toEqual('1234567890');
    expect(parseFloat(users[0].wallet_balance)).toEqual(0);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple users with unique IDs', async () => {
    const user1 = await createUser(testInput);
    
    const secondInput: CreateUserInput = {
      email: 'second@example.com',
      name: 'Jane Smith',
      phone: '0987654321'
    };
    
    const user2 = await createUser(secondInput);

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('test@example.com');
    expect(user2.email).toEqual('second@example.com');
    expect(user1.wallet_balance).toEqual(0);
    expect(user2.wallet_balance).toEqual(0);
  });

  it('should handle different phone number formats', async () => {
    const inputWithLongPhone: CreateUserInput = {
      email: 'longphone@example.com',
      name: 'Long Phone User',
      phone: '12345678901234'
    };

    const result = await createUser(inputWithLongPhone);

    expect(result.phone).toEqual('12345678901234');
    expect(result.wallet_balance).toEqual(0);
  });

  it('should enforce unique email constraint', async () => {
    await createUser(testInput);

    // Try to create another user with the same email
    const duplicateInput: CreateUserInput = {
      email: 'test@example.com', // Same email
      name: 'Different Name',
      phone: '9999999999'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/unique/i);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createUser(testInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at >= beforeCreation).toBe(true);
    expect(result.created_at <= afterCreation).toBe(true);
    expect(result.updated_at >= beforeCreation).toBe(true);
    expect(result.updated_at <= afterCreation).toBe(true);
  });
});