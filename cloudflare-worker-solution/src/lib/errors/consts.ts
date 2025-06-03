export const ErrorTypes = {
	NotFound: 'NotFound',
} as const;

export const HttpCodes = {
	[ErrorTypes.NotFound]: 404,
} as const;
