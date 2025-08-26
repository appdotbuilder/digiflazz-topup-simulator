import { db } from '../db';
import { serviceProductsTable } from '../db/schema';
import { type ServiceProduct } from '../schema';
import { eq } from 'drizzle-orm';

export const getAllProducts = async (): Promise<ServiceProduct[]> => {
  try {
    // Fetch all active service products
    const results = await db.select()
      .from(serviceProductsTable)
      .where(eq(serviceProductsTable.is_active, true))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Get all products failed:', error);
    throw error;
  }
};