import { z } from 'zod';

export const ProductDto = z.object({
	id: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
	brand_id: z.string(),
	description: z.string(),
	campaign: z.string().nullable(),
	label: z.string(),
	internal_name: z.string(),
	integration: z.string(),
	price: z.string(),
	over_18_offer: z.number(),
	redemption_instructions: z.string(),
	image: z.string(),
	subtitle: z.string(),
	weight: z.number(),
	recipient_description: z.string(),
	tag_group_id: z.string(),
	tag_id: z.string(),
	open_graph_image: z.string(),
	active: z.number(),
	on_app: z.number(),
	on_imessage: z.number(),
	handling_fee: z.number(),
	sale_price: z.number(),
	huggg_tag: z.string().nullable(),
	vat_voucher_type: z.string(),
	vat: z.number().nullable(),
	brand_name: z.string(),
	brand_weight: z.number(),
	image_url: z.string().nullable(),
	claim_image: z.string(),
	claim_image_url: z.string().nullable(),
	imessage_image: z.string(),
	imessage_image_url: z.string().nullable(),
	open_graph_image_url: z.string(),
	pivot: z
		.object({
			brand_id: z.string(),
			price_id: z.string(),
		})
		.optional(),
});

export type ProductDto = z.infer<typeof ProductDto>;
