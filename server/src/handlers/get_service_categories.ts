import { db } from '../db';
import { serviceCategoriesTable } from '../db/schema';
import { type ServiceCategory } from '../schema';
import { eq } from 'drizzle-orm';

export const getServiceCategories = async (): Promise<ServiceCategory[]> => {
  try {
    // Fetch all active service categories from the database
    const results = await db.select()
      .from(serviceCategoriesTable)
      .where(eq(serviceCategoriesTable.is_active, true))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch service categories:', error);
    throw error;
  }
};