import { HttpCodes, ErrorTypes } from './consts';

export abstract class BaseError extends Error {
	public name: string;
	public httpCode: number = 500;
	public isUserFacing: boolean;
	public data: Record<string, any> | null;
	public unwrappedError: Error | null;

	protected constructor(
		message: string,
		type: keyof typeof ErrorTypes,
		isUserFacing: boolean,
		data: Record<string, any> | null = null,
		unwrappedError: Error | null = null
	) {
		super(message);

		console.log(type, {
			message,
			type,
			isUserFacing,
			data: JSON.stringify(data, null, 4),
			unwrappedError,
		});

		this.name = new.target.prototype.constructor.name;
		Object.setPrototypeOf(this, new.target.prototype);

		this.httpCode = HttpCodes[type];
		this.isUserFacing = isUserFacing;
		this.data = data;
		this.unwrappedError = unwrappedError;
	}
}
