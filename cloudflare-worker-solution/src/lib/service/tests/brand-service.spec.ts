import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrandService } from '../brand-service';
import { ApiClient } from '../../clients/api-client.interface';

describe('BrandService', () => {
	let brandService: BrandService;
	let mockApiClient: ApiClient;

	const mockProduct1 = { id: 'product-1', label: 'Product 1' };
	const mockProduct2 = { id: 'product-2', label: 'Product 2' };
	const mockConsolidatedProduct = { id: 'consolidated-product-1', label: 'Consolidated Product 1' };

	const mockBrand1 = {
		id: 'brand-1',
		products: ['product-1', 'product-2'],
		consolidated_products: ['consolidated-product-1'],
	};

	const mockResponseData = {
		data: [mockBrand1],
		embedded: {
			products: [mockProduct1, mockProduct2, mockConsolidatedProduct],
		},
	};

	beforeEach(() => {
		mockApiClient = {
			getData: vi.fn().mockResolvedValue(mockResponseData),
		};
		brandService = new BrandService(mockApiClient);
	});

	describe('getProductsByBrandId', () => {
		it('should return products for a valid brand ID', async () => {
			const result = await brandService.getProductsByBrandId('brand-1');

			expect(mockApiClient.getData).toHaveBeenCalledOnce();
			expect(result).toHaveLength(3); // 2 direct products + 1 consolidated product
			expect(result).toContain(mockProduct1);
			expect(result).toContain(mockProduct2);
			expect(result).toContain(mockConsolidatedProduct);
		});

		it('should return only direct products when no consolidated products exist', async () => {
			const dataWithoutConsolidated = {
				...mockResponseData,
				data: [{ ...mockBrand1, consolidated_products: [] }],
			};
			mockApiClient.getData = vi.fn().mockResolvedValue(dataWithoutConsolidated);

			const result = await brandService.getProductsByBrandId('brand-1');

			expect(result).toHaveLength(2);
			expect(result).toContain(mockProduct1);
			expect(result).toContain(mockProduct2);
			expect(result).not.toContain(mockConsolidatedProduct);
		});

		it('should return empty array when brand has no products', async () => {
			const dataWithoutProducts = {
				...mockResponseData,
				data: [{ ...mockBrand1, products: [], consolidated_products: [] }],
			};
			mockApiClient.getData = vi.fn().mockResolvedValue(dataWithoutProducts);

			const result = await brandService.getProductsByBrandId('brand-1');

			expect(result).toHaveLength(0);
		});

		it('should throw error when brand is not found', async () => {
			await expect(brandService.getProductsByBrandId('non-existent-brand')).rejects.toThrow('Brand not found');

			expect(mockApiClient.getData).toHaveBeenCalledOnce();
		});

		it('should filter out products that do not exist in embedded products', async () => {
			const dataWithMissingProduct = {
				...mockResponseData,
				data: [{ ...mockBrand1, products: ['product-1', 'non-existent-product'], consolidated_products: [] }],
			};
			mockApiClient.getData = vi.fn().mockResolvedValue(dataWithMissingProduct);

			const result = await brandService.getProductsByBrandId('brand-1');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(mockProduct1);
		});
	});
});
