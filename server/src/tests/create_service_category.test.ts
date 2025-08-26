import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { serviceCategoriesTable } from '../db/schema';
import { type CreateServiceCategoryInput } from '../schema';
import { createServiceCategory } from '../handlers/create_service_category';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateServiceCategoryInput = {
  name: 'Mobile Prepaid',
  code: 'MOBILE_PREPAID',
  description: 'Mobile prepaid top-up services'
};

// Test input without optional description
const minimalInput: CreateServiceCategoryInput = {
  name: 'Internet Data',
  code: 'INTERNET_DATA'
};

describe('createServiceCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a service category with all fields', async () => {
    const result = await createServiceCategory(testInput);

    // Basic field validation
    expect(result.name).toEqual('Mobile Prepaid');
    expect(result.code).toEqual('MOBILE_PREPAID');
    expect(result.description).toEqual('Mobile prepaid top-up services');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a service category without description', async () => {
    const result = await createServiceCategory(minimalInput);

    // Basic field validation
    expect(result.name).toEqual('Internet Data');
    expect(result.code).toEqual('INTERNET_DATA');
    expect(result.description).toBeNull();
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save service category to database', async () => {
    const result = await createServiceCategory(testInput);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(serviceCategoriesTable)
      .where(eq(serviceCategoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Mobile Prepaid');
    expect(categories[0].code).toEqual('MOBILE_PREPAID');
    expect(categories[0].description).toEqual('Mobile prepaid top-up services');
    expect(categories[0].is_active).toBe(true);
    expect(categories[0].created_at).toBeInstanceOf(Date);
  });

  it('should enforce unique code constraint', async () => {
    // Create first category
    await createServiceCategory(testInput);

    // Try to create another category with the same code
    const duplicateInput: CreateServiceCategoryInput = {
      name: 'Different Name',
      code: 'MOBILE_PREPAID', // Same code
      description: 'Different description'
    };

    await expect(createServiceCategory(duplicateInput)).rejects.toThrow(/unique constraint|duplicate key/i);
  });

  it('should handle empty description correctly', async () => {
    const inputWithEmptyDescription: CreateServiceCategoryInput = {
      name: 'Test Category',
      code: 'TEST_CAT',
      description: undefined
    };

    const result = await createServiceCategory(inputWithEmptyDescription);

    expect(result.name).toEqual('Test Category');
    expect(result.code).toEqual('TEST_CAT');
    expect(result.description).toBeNull();
    expect(result.is_active).toBe(true);
  });

  it('should create multiple service categories successfully', async () => {
    const firstCategory = await createServiceCategory({
      name: 'Mobile Prepaid',
      code: 'MOBILE_PREPAID',
      description: 'Mobile prepaid services'
    });

    const secondCategory = await createServiceCategory({
      name: 'Mobile Postpaid',
      code: 'MOBILE_POSTPAID',
      description: 'Mobile postpaid services'
    });

    // Verify both categories exist
    const allCategories = await db.select()
      .from(serviceCategoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
    expect(allCategories.map(c => c.code)).toContain('MOBILE_PREPAID');
    expect(allCategories.map(c => c.code)).toContain('MOBILE_POSTPAID');

    // Verify they have different IDs
    expect(firstCategory.id).not.toEqual(secondCategory.id);
  });
});