import { BrandDto } from '@/lib/dtos/brand';
import { ProductDto } from '@/lib/dtos/product';
import { StoreDto } from '@/lib/dtos/store';
import { z } from 'zod';

export const GetDataResponseDto = z.object({
	current_page: z.number(),
	data: z.array(BrandDto),
	from: z.number(),
	last_page: z.number(),
	next_page_url: z.string().nullable(),
	path: z.string(),
	per_page: z.number(),
	prev_page_url: z.string().nullable(),
	to: z.number(),
	total: z.number(),
	embedded: z.object({
		products: z.array(ProductDto),
		stores: z.array(StoreDto),
	}),
});

export type GetDataResponseDto = z.infer<typeof GetDataResponseDto>;
