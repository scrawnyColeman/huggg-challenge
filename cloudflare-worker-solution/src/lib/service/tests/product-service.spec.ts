import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductService } from '../product-service';
import { ApiClient } from '../../clients/api-client.interface';

describe('ProductService', () => {
	let productService: ProductService;
	let mockApiClient: ApiClient;

	const mockStore1 = {
		id: 'store-1',
		brand_id: 'brand-1',
		name: 'Store 1',
	};

	const mockStore2 = {
		id: 'store-2',
		brand_id: 'brand-1',
		name: 'Store 2',
	};

	const mockStore3 = {
		id: 'store-3',
		brand_id: 'brand-1',
		name: 'Store 3',
	};

	const mockProduct = {
		id: 'product-1',
		brand_id: 'brand-1',
		label: 'Test Product',
	};

	const mockBrand1 = {
		id: 'brand-1',
		name: 'Brand 1',
		products: ['product-1'],
		consolidated_products: [],
		stores: ['store-1', 'store-2'],
	};

	const mockBrand2 = {
		id: 'brand-2',
		name: 'Brand 2',
		products: [],
		consolidated_products: ['product-1'],
		stores: ['store-3'],
	};

	const mockData = {
		data: [mockBrand1, mockBrand2],
		embedded: {
			products: [mockProduct],
			stores: [mockStore1, mockStore2, mockStore3],
		},
	};

	beforeEach(() => {
		mockApiClient = {
			getData: vi.fn().mockResolvedValue(mockData),
		};
		productService = new ProductService(mockApiClient);
	});

	describe('getStoresByProductId', () => {
		it('should return stores from brands that have the product', async () => {
			const result = await productService.getStoresByProductId('product-1');

			expect(mockApiClient.getData).toHaveBeenCalledOnce();
			expect(result).toHaveLength(3);
			expect(result).toContain(mockStore1);
			expect(result).toContain(mockStore2);
			expect(result).toContain(mockStore3);
		});

		it('should return stores from direct products only when no consolidated products', async () => {
			const dataWithoutConsolidated = {
				...mockData,
				data: [
					{
						...mockBrand1,
						products: ['product-1'],
						consolidated_products: [],
					},
					{
						...mockBrand2,
						products: [],
						consolidated_products: [],
					},
				],
			};
			mockApiClient.getData = vi.fn().mockResolvedValue(dataWithoutConsolidated);

			const result = await productService.getStoresByProductId('product-1');

			expect(result).toHaveLength(2); // Only stores from brand-1
			expect(result).toContain(mockStore1);
			expect(result).toContain(mockStore2);
			expect(result).not.toContain(mockStore3);
		});

		it('should return stores from consolidated products only', async () => {
			const dataWithConsolidatedOnly = {
				...mockData,
				data: [
					{
						...mockBrand1,
						products: [],
						consolidated_products: [],
					},
					{
						...mockData.data[1],
						products: [],
						consolidated_products: ['product-1'],
					},
				],
			};
			mockApiClient.getData = vi.fn().mockResolvedValue(dataWithConsolidatedOnly);

			const result = await productService.getStoresByProductId('product-1');

			expect(result).toHaveLength(1); // Only store from brand-2
			expect(result).toContain(mockStore3);
			expect(result).not.toContain(mockStore1);
			expect(result).not.toContain(mockStore2);
		});

		it('should return empty array when no brands have the product', async () => {
			const dataWithoutProduct = {
				...mockData,
				data: [
					{
						...mockBrand1,
						products: [],
						consolidated_products: [],
					},
					{
						...mockData.data[1],
						products: [],
						consolidated_products: [],
					},
				],
			};
			mockApiClient.getData = vi.fn().mockResolvedValue(dataWithoutProduct);

			const result = await productService.getStoresByProductId('product-1');

			expect(result).toHaveLength(0);
		});

		it('should throw error when product does not exist', async () => {
			await expect(productService.getStoresByProductId('non-existent-product')).rejects.toThrow('Product not found');

			expect(mockApiClient.getData).toHaveBeenCalledOnce();
		});

		it('should filter out stores that do not exist in embedded stores', async () => {
			const dataWithMissingStore = {
				...mockData,
				data: [
					{
						...mockBrand1,
						stores: ['store-1', 'non-existent-store'],
					},
				],
				embedded: {
					...mockData.embedded,
					stores: [mockStore1], // Only store-1 exists
				},
			};
			mockApiClient.getData = vi.fn().mockResolvedValue(dataWithMissingStore);

			const result = await productService.getStoresByProductId('product-1');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(mockStore1);
		});

		it('should deduplicate stores when multiple brands have the same store', async () => {
			const dataWithDuplicateStores = {
				...mockData,
				data: [
					{
						...mockBrand1,
						stores: ['store-1', 'store-2'],
					},
					{
						...mockData.data[1],
						stores: ['store-1', 'store-3'], // store-1 appears in both brands
					},
				],
			};
			mockApiClient.getData = vi.fn().mockResolvedValue(dataWithDuplicateStores);

			const result = await productService.getStoresByProductId('product-1');

			expect(result).toHaveLength(3); // store-1 should only appear once
			const storeIds = result.map((store) => store.id);
			expect(storeIds).toContain('store-1');
			expect(storeIds).toContain('store-2');
			expect(storeIds).toContain('store-3');
			expect(storeIds.filter((id) => id === 'store-1')).toHaveLength(1);
		});

		it('should handle API client errors', async () => {
			const apiError = new Error('API connection failed');
			mockApiClient.getData = vi.fn().mockRejectedValue(apiError);

			await expect(productService.getStoresByProductId('product-1')).rejects.toThrow('API connection failed');
		});

		it('should call API client exactly once per method call', async () => {
			await productService.getStoresByProductId('product-1');
			await productService.getStoresByProductId('product-1');

			expect(mockApiClient.getData).toHaveBeenCalledTimes(2);
		});

		it('should handle empty stores array in brand', async () => {
			const dataWithEmptyStores = {
				...mockData,
				data: [
					{
						...mockBrand1,
						stores: [],
					},
				],
			};
			mockApiClient.getData = vi.fn().mockResolvedValue(dataWithEmptyStores);

			const result = await productService.getStoresByProductId('product-1');

			expect(result).toHaveLength(0);
		});
	});
});
