import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type WalletDepositInput } from '../schema';
import { walletDeposit } from '../handlers/wallet_deposit';
import { eq } from 'drizzle-orm';

describe('walletDeposit', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    // Create test user before each test
    const createTestUser = async () => {
        const userResult = await db.insert(usersTable)
            .values({
                email: 'test@example.com',
                name: 'Test User',
                phone: '1234567890',
                wallet_balance: '100.00'
            })
            .returning()
            .execute();
        
        return userResult[0];
    };

    const testInput: WalletDepositInput = {
        user_id: 0, // Will be set in tests
        amount: 50.00,
        payment_method: 'payment_gateway'
    };

    it('should create a wallet deposit transaction successfully', async () => {
        const user = await createTestUser();
        const input = { ...testInput, user_id: user.id };

        const result = await walletDeposit(input);

        // Validate transaction fields
        expect(result.user_id).toEqual(user.id);
        expect(result.transaction_type).toEqual('wallet_deposit');
        expect(result.amount).toEqual(50.00);
        expect(result.status).toEqual('completed');
        expect(result.payment_method).toEqual('payment_gateway');
        expect(result.reference_id).toMatch(/^PAY_\d+$/);
        expect(result.product_id).toBeNull();
        expect(result.target_number).toBeNull();
        expect(result.digiflazz_reference).toBeNull();
        expect(result.id).toBeDefined();
        expect(result.created_at).toBeInstanceOf(Date);
        expect(result.updated_at).toBeInstanceOf(Date);
        expect(typeof result.amount).toBe('number');
    });

    it('should save transaction to database with correct values', async () => {
        const user = await createTestUser();
        const input = { ...testInput, user_id: user.id };

        const result = await walletDeposit(input);

        // Verify transaction was saved to database
        const transactions = await db.select()
            .from(transactionsTable)
            .where(eq(transactionsTable.id, result.id))
            .execute();

        expect(transactions).toHaveLength(1);
        const transaction = transactions[0];
        expect(transaction.user_id).toEqual(user.id);
        expect(transaction.transaction_type).toEqual('wallet_deposit');
        expect(parseFloat(transaction.amount)).toEqual(50.00);
        expect(transaction.status).toEqual('completed');
        expect(transaction.payment_method).toEqual('payment_gateway');
        expect(transaction.reference_id).toMatch(/^PAY_\d+$/);
        expect(transaction.created_at).toBeInstanceOf(Date);
        expect(transaction.updated_at).toBeInstanceOf(Date);
    });

    it('should update user wallet balance correctly', async () => {
        const user = await createTestUser();
        const input = { ...testInput, user_id: user.id };
        const initialBalance = parseFloat(user.wallet_balance);

        await walletDeposit(input);

        // Verify user's wallet balance was updated
        const updatedUsers = await db.select()
            .from(usersTable)
            .where(eq(usersTable.id, user.id))
            .execute();

        expect(updatedUsers).toHaveLength(1);
        const updatedUser = updatedUsers[0];
        expect(parseFloat(updatedUser.wallet_balance)).toEqual(initialBalance + 50.00);
        expect(updatedUser.updated_at).toBeInstanceOf(Date);
        expect(updatedUser.updated_at > user.updated_at).toBe(true);
    });

    it('should handle multiple deposits correctly', async () => {
        const user = await createTestUser();
        const initialBalance = parseFloat(user.wallet_balance);

        // First deposit
        const firstInput = { ...testInput, user_id: user.id, amount: 25.00 };
        const firstResult = await walletDeposit(firstInput);

        // Second deposit
        const secondInput = { ...testInput, user_id: user.id, amount: 35.00 };
        const secondResult = await walletDeposit(secondInput);

        // Verify both transactions were created
        expect(firstResult.amount).toEqual(25.00);
        expect(secondResult.amount).toEqual(35.00);
        expect(firstResult.id).not.toEqual(secondResult.id);

        // Verify final wallet balance
        const updatedUsers = await db.select()
            .from(usersTable)
            .where(eq(usersTable.id, user.id))
            .execute();

        const finalBalance = parseFloat(updatedUsers[0].wallet_balance);
        expect(finalBalance).toEqual(initialBalance + 25.00 + 35.00);
    });

    it('should throw error for non-existent user', async () => {
        const input = { ...testInput, user_id: 99999 };

        await expect(walletDeposit(input)).rejects.toThrow(/user with id 99999 not found/i);
    });

    it('should handle large deposit amounts correctly', async () => {
        const user = await createTestUser();
        const largeAmount = 9999.99;
        const input = { ...testInput, user_id: user.id, amount: largeAmount };

        const result = await walletDeposit(input);

        expect(result.amount).toEqual(largeAmount);
        expect(result.status).toEqual('completed');

        // Verify balance update
        const updatedUsers = await db.select()
            .from(usersTable)
            .where(eq(usersTable.id, user.id))
            .execute();

        const expectedBalance = parseFloat(user.wallet_balance) + largeAmount;
        expect(parseFloat(updatedUsers[0].wallet_balance)).toEqual(expectedBalance);
    });

    it('should handle decimal amounts correctly', async () => {
        const user = await createTestUser();
        const decimalAmount = 33.33;
        const input = { ...testInput, user_id: user.id, amount: decimalAmount };

        const result = await walletDeposit(input);

        expect(result.amount).toEqual(decimalAmount);

        // Verify precise decimal handling in database
        const updatedUsers = await db.select()
            .from(usersTable)
            .where(eq(usersTable.id, user.id))
            .execute();

        const expectedBalance = parseFloat(user.wallet_balance) + decimalAmount;
        const actualBalance = parseFloat(updatedUsers[0].wallet_balance);
        
        // Use toBeCloseTo for floating point precision issues
        expect(actualBalance).toBeCloseTo(expectedBalance, 2);
    });

    it('should generate unique reference IDs for concurrent deposits', async () => {
        const user = await createTestUser();
        const input1 = { ...testInput, user_id: user.id, amount: 10.00 };
        const input2 = { ...testInput, user_id: user.id, amount: 20.00 };

        // Execute deposits concurrently
        const [result1, result2] = await Promise.all([
            walletDeposit(input1),
            walletDeposit(input2)
        ]);

        expect(result1.reference_id).not.toEqual(result2.reference_id);
        expect(result1.reference_id).toMatch(/^PAY_\d+$/);
        expect(result2.reference_id).toMatch(/^PAY_\d+$/);
    });
});