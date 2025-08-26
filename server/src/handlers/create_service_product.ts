import { db } from '../db';
import { serviceProductsTable, serviceCategoriesTable } from '../db/schema';
import { type CreateServiceProductInput, type ServiceProduct } from '../schema';
import { eq } from 'drizzle-orm';

export async function createServiceProduct(input: CreateServiceProductInput): Promise<ServiceProduct> {
  try {
    // Verify that the category exists first to prevent foreign key constraint violation
    const categoryExists = await db.select()
      .from(serviceCategoriesTable)
      .where(eq(serviceCategoriesTable.id, input.category_id))
      .execute();

    if (categoryExists.length === 0) {
      throw new Error(`Service category with id ${input.category_id} not found`);
    }

    // Insert service product record
    const result = await db.insert(serviceProductsTable)
      .values({
        category_id: input.category_id,
        product_code: input.product_code,
        name: input.name,
        description: input.description || null,
        price: input.price.toString(), // Convert number to string for numeric column
        type: input.type,
        provider: input.provider,
        is_active: true // Default value
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Service product creation failed:', error);
    throw error;
  }
}