import { db } from '../db';
import { serviceProductsTable } from '../db/schema';
import { type GetProductsByCategoryInput, type ServiceProduct } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getProductsByCategory(input: GetProductsByCategoryInput): Promise<ServiceProduct[]> {
  try {
    // Query products filtered by category_id and only active products
    const results = await db.select()
      .from(serviceProductsTable)
      .where(and(
        eq(serviceProductsTable.category_id, input.category_id),
        eq(serviceProductsTable.is_active, true)
      ))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch products by category:', error);
    throw error;
  }
}