import { db } from '../db';
import { usersTable, serviceProductsTable, transactionsTable } from '../db/schema';
import { type TopUpInput, type Transaction } from '../schema';
import { eq, and } from 'drizzle-orm';

export const processTopUp = async (input: TopUpInput): Promise<Transaction> => {
  try {
    // 1. Validate that the product exists and is active
    const products = await db.select()
      .from(serviceProductsTable)
      .where(
        and(
          eq(serviceProductsTable.id, input.product_id),
          eq(serviceProductsTable.is_active, true)
        )
      )
      .execute();

    if (products.length === 0) {
      throw new Error('Product not found or inactive');
    }

    const product = products[0];
    const productPrice = parseFloat(product.price);

    // 2. Check user exists and wallet balance (if paying with wallet)
    if (input.payment_method === 'wallet') {
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const user = users[0];
      const userBalance = parseFloat(user.wallet_balance);

      if (userBalance < productPrice) {
        throw new Error('Insufficient wallet balance');
      }
    } else {
      // Still validate user exists for payment gateway
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();

      if (users.length === 0) {
        throw new Error('User not found');
      }
    }

    // 3. Create a transaction record with status 'pending'
    const transactionData = {
      user_id: input.user_id,
      transaction_type: 'topup' as const,
      amount: productPrice.toString(),
      status: 'pending' as const,
      payment_method: input.payment_method,
      reference_id: input.payment_method === 'payment_gateway' ? 'PAY_' + Date.now().toString() : null,
      product_id: input.product_id,
      target_number: input.target_number,
      digiflazz_reference: null // Will be set after API simulation
    };

    const transactionResults = await db.insert(transactionsTable)
      .values(transactionData)
      .returning()
      .execute();

    const transaction = transactionResults[0];

    // 4. Simulate Digiflazz API call for top-up processing
    const digiflazzReference = 'DGF_' + Date.now().toString();
    
    // Simulate API success (90% success rate for demonstration)
    const isApiSuccess = Math.random() > 0.1;

    let finalStatus: 'completed' | 'failed' = isApiSuccess ? 'completed' : 'failed';

    // 5. If wallet payment and API successful, deduct amount from wallet
    if (input.payment_method === 'wallet' && isApiSuccess) {
      // Fetch current balance first
      const currentUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, input.user_id))
        .execute();
      
      const currentBalance = parseFloat(currentUsers[0].wallet_balance);
      const newBalance = currentBalance - productPrice;

      await db.update(usersTable)
        .set({
          wallet_balance: newBalance.toString(),
          updated_at: new Date()
        })
        .where(eq(usersTable.id, input.user_id))
        .execute();
    }

    // 6. Update transaction status based on Digiflazz response
    const updatedTransactionResults = await db.update(transactionsTable)
      .set({
        status: finalStatus,
        digiflazz_reference: digiflazzReference,
        updated_at: new Date()
      })
      .where(eq(transactionsTable.id, transaction.id))
      .returning()
      .execute();

    const finalTransaction = updatedTransactionResults[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...finalTransaction,
      amount: parseFloat(finalTransaction.amount)
    };

  } catch (error) {
    console.error('Top-up processing failed:', error);
    throw error;
  }
};