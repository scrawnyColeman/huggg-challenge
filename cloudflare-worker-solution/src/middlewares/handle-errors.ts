import { BaseError } from '@/lib/errors/__base-error';

export const handleErrors = async (handler: () => Promise<Response>) => {
	try {
		return await handler();
	} catch (e) {
		const isKnownError = e instanceof BaseError;
		const isPublic = isKnownError && e.isUserFacing;

		if (!isKnownError) console.error(e);

		return new Response(JSON.stringify({ error: isPublic ? e.message : 'Oops. Something went wrong' }), {
			status: isKnownError ? e.httpCode : 500,
			statusText: isKnownError ? e.message : 'Internal Server Error',
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
