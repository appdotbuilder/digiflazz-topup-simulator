import { db } from '../db';
import { serviceCategoriesTable } from '../db/schema';
import { type CreateServiceCategoryInput, type ServiceCategory } from '../schema';

export const createServiceCategory = async (input: CreateServiceCategoryInput): Promise<ServiceCategory> => {
  try {
    // Insert service category record
    const result = await db.insert(serviceCategoriesTable)
      .values({
        name: input.name,
        code: input.code,
        description: input.description || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Service category creation failed:', error);
    throw error;
  }
};