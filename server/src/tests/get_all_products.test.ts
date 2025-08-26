import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { serviceCategoriesTable, serviceProductsTable } from '../db/schema';
import { getAllProducts } from '../handlers/get_all_products';
import { eq } from 'drizzle-orm';

describe('getAllProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getAllProducts();
    expect(result).toEqual([]);
  });

  it('should return all active products', async () => {
    // Create a service category first
    const category = await db.insert(serviceCategoriesTable)
      .values({
        name: 'Mobile Prepaid',
        code: 'MOBILE_PREPAID',
        description: 'Mobile prepaid top-up services'
      })
      .returning()
      .execute();

    // Create multiple products - some active, some inactive
    await db.insert(serviceProductsTable)
      .values([
        {
          category_id: category[0].id,
          product_code: 'TSEL_10K',
          name: 'Telkomsel 10K',
          description: 'Telkomsel prepaid 10,000',
          price: '10000.00',
          type: 'prepaid',
          provider: 'Telkomsel',
          is_active: true
        },
        {
          category_id: category[0].id,
          product_code: 'TSEL_20K',
          name: 'Telkomsel 20K',
          description: 'Telkomsel prepaid 20,000',
          price: '20000.00',
          type: 'prepaid',
          provider: 'Telkomsel',
          is_active: true
        },
        {
          category_id: category[0].id,
          product_code: 'TSEL_INACTIVE',
          name: 'Telkomsel Inactive',
          description: 'Inactive product',
          price: '5000.00',
          type: 'prepaid',
          provider: 'Telkomsel',
          is_active: false
        }
      ])
      .execute();

    const result = await getAllProducts();

    // Should only return active products
    expect(result).toHaveLength(2);
    
    // Verify product details
    const product1 = result.find(p => p.product_code === 'TSEL_10K');
    const product2 = result.find(p => p.product_code === 'TSEL_20K');
    
    expect(product1).toBeDefined();
    expect(product1!.name).toEqual('Telkomsel 10K');
    expect(product1!.price).toEqual(10000);
    expect(typeof product1!.price).toBe('number');
    expect(product1!.is_active).toBe(true);
    
    expect(product2).toBeDefined();
    expect(product2!.name).toEqual('Telkomsel 20K');
    expect(product2!.price).toEqual(20000);
    expect(typeof product2!.price).toBe('number');
    expect(product2!.is_active).toBe(true);

    // Verify inactive product is not returned
    const inactiveProduct = result.find(p => p.product_code === 'TSEL_INACTIVE');
    expect(inactiveProduct).toBeUndefined();
  });

  it('should return products with correct data types', async () => {
    // Create a service category first
    const category = await db.insert(serviceCategoriesTable)
      .values({
        name: 'Internet Package',
        code: 'INTERNET',
        description: 'Internet data packages'
      })
      .returning()
      .execute();

    // Create a product
    await db.insert(serviceProductsTable)
      .values({
        category_id: category[0].id,
        product_code: 'INDOSAT_1GB',
        name: 'Indosat 1GB',
        description: 'Indosat internet 1GB',
        price: '15500.50',
        type: 'postpaid',
        provider: 'Indosat',
        is_active: true
      })
      .execute();

    const result = await getAllProducts();

    expect(result).toHaveLength(1);
    const product = result[0];
    
    // Verify all field types
    expect(typeof product.id).toBe('number');
    expect(typeof product.category_id).toBe('number');
    expect(typeof product.product_code).toBe('string');
    expect(typeof product.name).toBe('string');
    expect(typeof product.description).toBe('string');
    expect(typeof product.price).toBe('number');
    expect(product.price).toEqual(15500.50);
    expect(product.type).toEqual('postpaid');
    expect(typeof product.provider).toBe('string');
    expect(typeof product.is_active).toBe('boolean');
    expect(product.created_at).toBeInstanceOf(Date);
    expect(product.updated_at).toBeInstanceOf(Date);
  });

  it('should handle multiple categories correctly', async () => {
    // Create multiple categories
    const mobileCategory = await db.insert(serviceCategoriesTable)
      .values({
        name: 'Mobile',
        code: 'MOBILE',
        description: 'Mobile services'
      })
      .returning()
      .execute();

    const internetCategory = await db.insert(serviceCategoriesTable)
      .values({
        name: 'Internet',
        code: 'INTERNET',
        description: 'Internet services'
      })
      .returning()
      .execute();

    // Create products in different categories
    await db.insert(serviceProductsTable)
      .values([
        {
          category_id: mobileCategory[0].id,
          product_code: 'MOBILE_PROD',
          name: 'Mobile Product',
          description: 'Mobile service',
          price: '10000.00',
          type: 'prepaid',
          provider: 'Provider1',
          is_active: true
        },
        {
          category_id: internetCategory[0].id,
          product_code: 'INTERNET_PROD',
          name: 'Internet Product',
          description: 'Internet service',
          price: '25000.00',
          type: 'postpaid',
          provider: 'Provider2',
          is_active: true
        }
      ])
      .execute();

    const result = await getAllProducts();

    expect(result).toHaveLength(2);
    
    const mobileProduct = result.find(p => p.product_code === 'MOBILE_PROD');
    const internetProduct = result.find(p => p.product_code === 'INTERNET_PROD');
    
    expect(mobileProduct).toBeDefined();
    expect(mobileProduct!.category_id).toEqual(mobileCategory[0].id);
    expect(mobileProduct!.price).toEqual(10000);
    
    expect(internetProduct).toBeDefined();
    expect(internetProduct!.category_id).toEqual(internetCategory[0].id);
    expect(internetProduct!.price).toEqual(25000);
  });

  it('should verify products are saved correctly in database', async () => {
    // Create category
    const category = await db.insert(serviceCategoriesTable)
      .values({
        name: 'Test Category',
        code: 'TEST_CAT',
        description: 'Test category'
      })
      .returning()
      .execute();

    // Create product
    const insertedProduct = await db.insert(serviceProductsTable)
      .values({
        category_id: category[0].id,
        product_code: 'TEST_PROD',
        name: 'Test Product',
        description: 'Test description',
        price: '99999.99',
        type: 'prepaid',
        provider: 'TestProvider',
        is_active: true
      })
      .returning()
      .execute();

    // Verify the product exists in database
    const dbProducts = await db.select()
      .from(serviceProductsTable)
      .where(eq(serviceProductsTable.id, insertedProduct[0].id))
      .execute();

    expect(dbProducts).toHaveLength(1);
    expect(dbProducts[0].product_code).toEqual('TEST_PROD');
    expect(parseFloat(dbProducts[0].price)).toEqual(99999.99);

    // Verify handler returns the same product
    const result = await getAllProducts();
    const handlerProduct = result.find(p => p.id === insertedProduct[0].id);
    
    expect(handlerProduct).toBeDefined();
    expect(handlerProduct!.product_code).toEqual('TEST_PROD');
    expect(handlerProduct!.price).toEqual(99999.99);
    expect(typeof handlerProduct!.price).toBe('number');
  });
});