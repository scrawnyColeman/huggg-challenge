import { z } from 'zod';

export const BrandDto = z.object({
	id: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
	name: z.string(),
	internal_name: z.string(),
	logo: z.string(),
	colour: z.string(),
	success: z.string(),
	share: z.string(),
	weight: z.number(),
	deleted_at: z.string().nullable(),
	expiry: z.number(),
	website: z.string().nullable(),
	integration_id: z.number(),
	user_id: z.string(),
	email: z.string().nullable(),
	vat: z.number(),
	faq: z.string().nullable(),
	description: z.string(),
	redeem: z.string().nullable(),
	location_text: z.string().nullable(),
	map_pin_url: z.string(),
	consolidated: z.number(),
	default_location_description_markdown: z.string(),
	products: z.array(z.string()),
	consolidated_products: z.array(z.string()),
	stores: z.array(z.string()),
	logo_url: z.string(),
});

export type BrandDto = z.infer<typeof BrandDto>;
