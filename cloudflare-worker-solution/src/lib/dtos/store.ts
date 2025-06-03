import { z } from 'zod';

export const StoreDto = z.object({
	id: z.string(),
	brand_id: z.string(),
	latitiude: z.string(),
	longitude: z.string(),
	website: z.string().nullable(),
	name: z.string(),
	description: z.string(),
	visible: z.number(),
	description_markdown: z.string(),
	image: z.string(),
	image_url: z.string(),
	latitude: z.string(),
});

export type StoreDto = z.infer<typeof StoreDto>;
