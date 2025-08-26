import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserByIdInput } from '../schema';
import { getUserById } from '../handlers/get_user_by_id';

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create test user
    const testUser = await db.insert(usersTable)
      .values({
        email: 'john@example.com',
        name: 'John Doe',
        phone: '+1234567890',
        wallet_balance: '150.75'
      })
      .returning()
      .execute();

    const input: GetUserByIdInput = {
      user_id: testUser[0].id
    };

    const result = await getUserById(input);

    // Verify user is returned with correct data
    expect(result).toBeDefined();
    expect(result!.id).toEqual(testUser[0].id);
    expect(result!.email).toEqual('john@example.com');
    expect(result!.name).toEqual('John Doe');
    expect(result!.phone).toEqual('+1234567890');
    expect(result!.wallet_balance).toEqual(150.75);
    expect(typeof result!.wallet_balance).toEqual('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const input: GetUserByIdInput = {
      user_id: 999999 // Non-existent user ID
    };

    const result = await getUserById(input);

    expect(result).toBeNull();
  });

  it('should handle zero wallet balance correctly', async () => {
    // Create test user with zero balance
    const testUser = await db.insert(usersTable)
      .values({
        email: 'zero@example.com',
        name: 'Zero Balance',
        phone: '+1234567891',
        wallet_balance: '0.00'
      })
      .returning()
      .execute();

    const input: GetUserByIdInput = {
      user_id: testUser[0].id
    };

    const result = await getUserById(input);

    expect(result).toBeDefined();
    expect(result!.wallet_balance).toEqual(0);
    expect(typeof result!.wallet_balance).toEqual('number');
  });

  it('should handle large wallet balance correctly', async () => {
    // Create test user with large balance
    const testUser = await db.insert(usersTable)
      .values({
        email: 'rich@example.com',
        name: 'Rich User',
        phone: '+1234567892',
        wallet_balance: '9999999.99'
      })
      .returning()
      .execute();

    const input: GetUserByIdInput = {
      user_id: testUser[0].id
    };

    const result = await getUserById(input);

    expect(result).toBeDefined();
    expect(result!.wallet_balance).toEqual(9999999.99);
    expect(typeof result!.wallet_balance).toEqual('number');
  });

  it('should preserve all user fields correctly', async () => {
    // Create test user with all fields populated
    const testUser = await db.insert(usersTable)
      .values({
        email: 'complete@example.com',
        name: 'Complete User',
        phone: '+1234567893',
        wallet_balance: '42.50'
      })
      .returning()
      .execute();

    const input: GetUserByIdInput = {
      user_id: testUser[0].id
    };

    const result = await getUserById(input);

    expect(result).toBeDefined();
    
    // Verify all fields are present and have correct types
    expect(typeof result!.id).toEqual('number');
    expect(typeof result!.email).toEqual('string');
    expect(typeof result!.name).toEqual('string');
    expect(typeof result!.phone).toEqual('string');
    expect(typeof result!.wallet_balance).toEqual('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Verify values match
    expect(result!.email).toEqual('complete@example.com');
    expect(result!.name).toEqual('Complete User');
    expect(result!.phone).toEqual('+1234567893');
    expect(result!.wallet_balance).toEqual(42.50);
  });
});