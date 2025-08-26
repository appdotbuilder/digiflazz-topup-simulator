import { type ServiceProduct } from '../schema';

export async function getAllProducts(): Promise<ServiceProduct[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all active service products from the database.
    // This simulates the complete product catalog from Digiflazz API.
    // Real implementation should periodically sync with Digiflazz to keep products updated.
    return Promise.resolve([]);
}