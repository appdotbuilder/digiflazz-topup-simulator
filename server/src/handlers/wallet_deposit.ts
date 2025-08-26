import { db } from '../db';
import { transactionsTable, usersTable } from '../db/schema';
import { type WalletDepositInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export async function walletDeposit(input: WalletDepositInput): Promise<Transaction> {
    try {
        // 1. Verify user exists
        const users = await db.select()
            .from(usersTable)
            .where(eq(usersTable.id, input.user_id))
            .execute();

        if (users.length === 0) {
            throw new Error(`User with id ${input.user_id} not found`);
        }

        // 2. Create a transaction record with status 'pending'
        const referenceId = 'PAY_' + Date.now().toString();
        
        const transactionResult = await db.insert(transactionsTable)
            .values({
                user_id: input.user_id,
                transaction_type: 'wallet_deposit',
                amount: input.amount.toString(), // Convert number to string for numeric column
                status: 'pending',
                payment_method: input.payment_method,
                reference_id: referenceId,
                product_id: null,
                target_number: null,
                digiflazz_reference: null
            })
            .returning()
            .execute();

        const transaction = transactionResult[0];

        // 3. Simulate payment gateway integration (always successful in simulation)
        const paymentSuccess = true; // In real implementation, this would be an API call

        if (paymentSuccess) {
            // 4. Update user's wallet balance on successful payment
            const currentUser = users[0];
            const currentBalance = parseFloat(currentUser.wallet_balance);
            const newBalance = currentBalance + input.amount;

            await db.update(usersTable)
                .set({ 
                    wallet_balance: newBalance.toString(),
                    updated_at: new Date()
                })
                .where(eq(usersTable.id, input.user_id))
                .execute();

            // 5. Update transaction status to 'completed'
            const updatedTransactionResult = await db.update(transactionsTable)
                .set({ 
                    status: 'completed',
                    updated_at: new Date()
                })
                .where(eq(transactionsTable.id, transaction.id))
                .returning()
                .execute();

            const completedTransaction = updatedTransactionResult[0];

            // Convert numeric fields back to numbers before returning
            return {
                ...completedTransaction,
                amount: parseFloat(completedTransaction.amount)
            };
        } else {
            // Update transaction status to 'failed' if payment fails
            const failedTransactionResult = await db.update(transactionsTable)
                .set({ 
                    status: 'failed',
                    updated_at: new Date()
                })
                .where(eq(transactionsTable.id, transaction.id))
                .returning()
                .execute();

            const failedTransaction = failedTransactionResult[0];

            return {
                ...failedTransaction,
                amount: parseFloat(failedTransaction.amount)
            };
        }
    } catch (error) {
        console.error('Wallet deposit failed:', error);
        throw error;
    }
}