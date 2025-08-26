import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { serviceProductsTable, serviceCategoriesTable } from '../db/schema';
import { type CreateServiceProductInput, type CreateServiceCategoryInput } from '../schema';
import { createServiceProduct } from '../handlers/create_service_product';
import { eq } from 'drizzle-orm';

// Test category for setting up prerequisites
const testCategory: CreateServiceCategoryInput = {
  name: 'Mobile Credit',
  code: 'MOBILE',
  description: 'Mobile credit top-up services'
};

// Test service product input
const testInput: CreateServiceProductInput = {
  category_id: 1, // Will be set after creating category
  product_code: 'TELKOMSEL_10K',
  name: 'Telkomsel 10,000',
  description: 'Telkomsel credit 10,000 IDR',
  price: 11500,
  type: 'prepaid',
  provider: 'Telkomsel'
};

describe('createServiceProduct', () => {
  let categoryId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite category
    const categoryResult = await db.insert(serviceCategoriesTable)
      .values({
        name: testCategory.name,
        code: testCategory.code,
        description: testCategory.description || null,
        is_active: true
      })
      .returning()
      .execute();

    categoryId = categoryResult[0].id;
  });

  afterEach(resetDB);

  it('should create a service product', async () => {
    const input = { ...testInput, category_id: categoryId };
    const result = await createServiceProduct(input);

    // Basic field validation
    expect(result.category_id).toEqual(categoryId);
    expect(result.product_code).toEqual('TELKOMSEL_10K');
    expect(result.name).toEqual('Telkomsel 10,000');
    expect(result.description).toEqual('Telkomsel credit 10,000 IDR');
    expect(result.price).toEqual(11500);
    expect(typeof result.price).toBe('number');
    expect(result.type).toEqual('prepaid');
    expect(result.provider).toEqual('Telkomsel');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save service product to database', async () => {
    const input = { ...testInput, category_id: categoryId };
    const result = await createServiceProduct(input);

    // Query using proper drizzle syntax
    const products = await db.select()
      .from(serviceProductsTable)
      .where(eq(serviceProductsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].category_id).toEqual(categoryId);
    expect(products[0].product_code).toEqual('TELKOMSEL_10K');
    expect(products[0].name).toEqual('Telkomsel 10,000');
    expect(products[0].description).toEqual('Telkomsel credit 10,000 IDR');
    expect(parseFloat(products[0].price)).toEqual(11500);
    expect(products[0].type).toEqual('prepaid');
    expect(products[0].provider).toEqual('Telkomsel');
    expect(products[0].is_active).toBe(true);
    expect(products[0].created_at).toBeInstanceOf(Date);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle product with null description', async () => {
    const inputWithoutDescription = {
      ...testInput,
      category_id: categoryId,
      description: undefined
    };
    
    const result = await createServiceProduct(inputWithoutDescription);

    expect(result.description).toBeNull();
    expect(result.name).toEqual('Telkomsel 10,000');
    expect(result.price).toEqual(11500);
  });

  it('should create postpaid service product', async () => {
    const postpaidInput: CreateServiceProductInput = {
      category_id: categoryId,
      product_code: 'TELKOMSEL_POSTPAID',
      name: 'Telkomsel Postpaid Payment',
      description: 'Telkomsel postpaid bill payment',
      price: 2500,
      type: 'postpaid',
      provider: 'Telkomsel'
    };

    const result = await createServiceProduct(postpaidInput);

    expect(result.type).toEqual('postpaid');
    expect(result.name).toEqual('Telkomsel Postpaid Payment');
    expect(result.price).toEqual(2500);
    expect(typeof result.price).toBe('number');
  });

  it('should throw error when category does not exist', async () => {
    const inputWithInvalidCategory = {
      ...testInput,
      category_id: 99999 // Non-existent category
    };

    expect(createServiceProduct(inputWithInvalidCategory))
      .rejects.toThrow(/Service category with id 99999 not found/i);
  });

  it('should enforce unique product code constraint', async () => {
    const input = { ...testInput, category_id: categoryId };
    
    // Create first product
    await createServiceProduct(input);

    // Attempt to create product with same code
    const duplicateInput = {
      ...input,
      name: 'Different Name'
    };

    expect(createServiceProduct(duplicateInput))
      .rejects.toThrow();
  });

  it('should handle different providers and types correctly', async () => {
    const xlInput: CreateServiceProductInput = {
      category_id: categoryId,
      product_code: 'XL_20K',
      name: 'XL 20,000',
      description: 'XL credit 20,000 IDR',
      price: 21000,
      type: 'prepaid',
      provider: 'XL Axiata'
    };

    const result = await createServiceProduct(xlInput);

    expect(result.provider).toEqual('XL Axiata');
    expect(result.product_code).toEqual('XL_20K');
    expect(result.price).toEqual(21000);
    expect(result.type).toEqual('prepaid');
  });
});