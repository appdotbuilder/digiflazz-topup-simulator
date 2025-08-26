import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { serviceCategoriesTable, serviceProductsTable } from '../db/schema';
import { type GetProductsByCategoryInput } from '../schema';
import { getProductsByCategory } from '../handlers/get_products_by_category';

// Test data
const testCategory = {
  name: 'Mobile Prepaid',
  code: 'MOBILE_PREPAID',
  description: 'Mobile prepaid top-up services'
};

const testProducts = [
  {
    category_id: 1, // Will be set after category creation
    product_code: 'TELKOMSEL_10K',
    name: 'Telkomsel 10K',
    description: 'Telkomsel prepaid 10,000 credit',
    price: 10500,
    type: 'prepaid' as const,
    provider: 'Telkomsel',
    is_active: true
  },
  {
    category_id: 1,
    product_code: 'TELKOMSEL_25K',
    name: 'Telkomsel 25K',
    description: 'Telkomsel prepaid 25,000 credit',
    price: 25500,
    type: 'prepaid' as const,
    provider: 'Telkomsel',
    is_active: true
  },
  {
    category_id: 1,
    product_code: 'TELKOMSEL_50K_INACTIVE',
    name: 'Telkomsel 50K (Inactive)',
    description: 'Inactive Telkomsel product',
    price: 50500,
    type: 'prepaid' as const,
    provider: 'Telkomsel',
    is_active: false // This should be filtered out
  }
];

const anotherCategoryProduct = {
  category_id: 2, // Different category
  product_code: 'PLN_TOKEN_20K',
  name: 'PLN Token 20K',
  description: 'PLN electricity token 20,000',
  price: 20500,
  type: 'prepaid' as const,
  provider: 'PLN',
  is_active: true
};

describe('getProductsByCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return active products for specified category', async () => {
    // Create test category
    const categoryResult = await db.insert(serviceCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;

    // Create test products with correct category_id
    const productsToInsert = testProducts.map(product => ({
      ...product,
      category_id: categoryId,
      price: product.price.toString() // Convert to string for numeric column
    }));

    await db.insert(serviceProductsTable)
      .values(productsToInsert)
      .execute();

    // Test the handler
    const input: GetProductsByCategoryInput = {
      category_id: categoryId
    };

    const result = await getProductsByCategory(input);

    // Should return only active products (2 out of 3)
    expect(result).toHaveLength(2);

    // Verify the returned products
    const productCodes = result.map(p => p.product_code).sort();
    expect(productCodes).toEqual(['TELKOMSEL_10K', 'TELKOMSEL_25K']);

    // Verify data structure and types
    result.forEach(product => {
      expect(product.id).toBeDefined();
      expect(product.category_id).toEqual(categoryId);
      expect(product.product_code).toBeDefined();
      expect(product.name).toBeDefined();
      expect(product.type).toBeDefined();
      expect(product.provider).toBeDefined();
      expect(product.is_active).toBe(true);
      expect(typeof product.price).toBe('number'); // Should be converted to number
      expect(product.created_at).toBeInstanceOf(Date);
      expect(product.updated_at).toBeInstanceOf(Date);
    });

    // Verify specific product details
    const telkomsel10K = result.find(p => p.product_code === 'TELKOMSEL_10K');
    expect(telkomsel10K).toBeDefined();
    expect(telkomsel10K!.name).toEqual('Telkomsel 10K');
    expect(telkomsel10K!.price).toEqual(10500);
    expect(telkomsel10K!.provider).toEqual('Telkomsel');
  });

  it('should return empty array for category with no active products', async () => {
    // Create test category
    const categoryResult = await db.insert(serviceCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;

    // Create only inactive products
    await db.insert(serviceProductsTable)
      .values({
        category_id: categoryId,
        product_code: 'INACTIVE_PRODUCT',
        name: 'Inactive Product',
        price: '10000',
        type: 'prepaid',
        provider: 'Test Provider',
        is_active: false
      })
      .execute();

    const input: GetProductsByCategoryInput = {
      category_id: categoryId
    };

    const result = await getProductsByCategory(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent category', async () => {
    const input: GetProductsByCategoryInput = {
      category_id: 99999 // Non-existent category ID
    };

    const result = await getProductsByCategory(input);

    expect(result).toHaveLength(0);
  });

  it('should not return products from different categories', async () => {
    // Create two categories
    const category1Result = await db.insert(serviceCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const category2Result = await db.insert(serviceCategoriesTable)
      .values({
        name: 'Electricity',
        code: 'ELECTRICITY',
        description: 'Electricity token services'
      })
      .returning()
      .execute();

    const category1Id = category1Result[0].id;
    const category2Id = category2Result[0].id;

    // Create products for both categories
    const category1Products = testProducts.slice(0, 2).map(product => ({
      ...product,
      category_id: category1Id,
      price: product.price.toString()
    }));

    const category2Products = [{
      ...anotherCategoryProduct,
      category_id: category2Id,
      price: anotherCategoryProduct.price.toString()
    }];

    await db.insert(serviceProductsTable)
      .values([...category1Products, ...category2Products])
      .execute();

    // Query category 1
    const input: GetProductsByCategoryInput = {
      category_id: category1Id
    };

    const result = await getProductsByCategory(input);

    // Should only return products from category 1
    expect(result).toHaveLength(2);
    result.forEach(product => {
      expect(product.category_id).toEqual(category1Id);
    });

    const productCodes = result.map(p => p.product_code).sort();
    expect(productCodes).toEqual(['TELKOMSEL_10K', 'TELKOMSEL_25K']);
  });

  it('should handle numeric price conversion correctly', async () => {
    // Create test category
    const categoryResult = await db.insert(serviceCategoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    
    const categoryId = categoryResult[0].id;

    // Create product with specific price
    await db.insert(serviceProductsTable)
      .values({
        category_id: categoryId,
        product_code: 'PRICE_TEST',
        name: 'Price Test Product',
        price: '15750.50', // Decimal price as string
        type: 'prepaid',
        provider: 'Test Provider',
        is_active: true
      })
      .execute();

    const input: GetProductsByCategoryInput = {
      category_id: categoryId
    };

    const result = await getProductsByCategory(input);

    expect(result).toHaveLength(1);
    expect(typeof result[0].price).toBe('number');
    expect(result[0].price).toEqual(15750.50);
  });
});