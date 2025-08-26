import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { serviceCategoriesTable } from '../db/schema';
import { getServiceCategories } from '../handlers/get_service_categories';
import { eq } from 'drizzle-orm';

describe('getServiceCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getServiceCategories();
    expect(result).toEqual([]);
  });

  it('should return only active service categories', async () => {
    // Create test categories - some active, some inactive
    await db.insert(serviceCategoriesTable).values([
      {
        name: 'Mobile Credit',
        code: 'MOBILE',
        description: 'Mobile phone credit top-up',
        is_active: true
      },
      {
        name: 'Internet Package',
        code: 'INTERNET',
        description: 'Internet data packages',
        is_active: true
      },
      {
        name: 'Electricity',
        code: 'PLN',
        description: 'Electricity bill payment',
        is_active: false // This should not be returned
      }
    ]).execute();

    const result = await getServiceCategories();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Mobile Credit');
    expect(result[0].code).toEqual('MOBILE');
    expect(result[0].description).toEqual('Mobile phone credit top-up');
    expect(result[0].is_active).toBe(true);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].name).toEqual('Internet Package');
    expect(result[1].code).toEqual('INTERNET');
    expect(result[1].is_active).toBe(true);

    // Verify inactive category is not included
    const categoryNames = result.map(cat => cat.name);
    expect(categoryNames).not.toContain('Electricity');
  });

  it('should return categories with null descriptions', async () => {
    // Create category with null description
    await db.insert(serviceCategoriesTable).values({
      name: 'Water Bill',
      code: 'WATER',
      description: null,
      is_active: true
    }).execute();

    const result = await getServiceCategories();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Water Bill');
    expect(result[0].description).toBeNull();
    expect(result[0].is_active).toBe(true);
  });

  it('should verify data is correctly saved in database', async () => {
    // Create a test category
    const testCategory = {
      name: 'Gaming Voucher',
      code: 'GAMING',
      description: 'Gaming platform vouchers',
      is_active: true
    };

    await db.insert(serviceCategoriesTable).values(testCategory).execute();

    // Fetch via handler
    const handlerResult = await getServiceCategories();

    // Verify directly from database
    const dbResult = await db.select()
      .from(serviceCategoriesTable)
      .where(eq(serviceCategoriesTable.code, 'GAMING'))
      .execute();

    expect(handlerResult).toHaveLength(1);
    expect(dbResult).toHaveLength(1);
    
    // Compare handler result with direct database query
    expect(handlerResult[0].name).toEqual(dbResult[0].name);
    expect(handlerResult[0].code).toEqual(dbResult[0].code);
    expect(handlerResult[0].description).toEqual(dbResult[0].description);
    expect(handlerResult[0].is_active).toEqual(dbResult[0].is_active);
  });

  it('should handle multiple active categories with different data types', async () => {
    // Create categories with various data configurations
    await db.insert(serviceCategoriesTable).values([
      {
        name: 'Category A',
        code: 'CAT_A',
        description: 'Description with special chars: áéíóú & symbols!',
        is_active: true
      },
      {
        name: 'Category B',
        code: 'CAT_B',
        description: '',
        is_active: true
      },
      {
        name: 'Category C',
        code: 'CAT_C',
        description: null,
        is_active: true
      }
    ]).execute();

    const result = await getServiceCategories();

    expect(result).toHaveLength(3);
    
    // Verify all are active
    result.forEach(category => {
      expect(category.is_active).toBe(true);
      expect(category.id).toBeDefined();
      expect(category.created_at).toBeInstanceOf(Date);
    });

    // Check specific data handling
    const catA = result.find(cat => cat.code === 'CAT_A');
    const catB = result.find(cat => cat.code === 'CAT_B');
    const catC = result.find(cat => cat.code === 'CAT_C');

    expect(catA?.description).toEqual('Description with special chars: áéíóú & symbols!');
    expect(catB?.description).toEqual('');
    expect(catC?.description).toBeNull();
  });
});