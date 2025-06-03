import { BaseError } from './__base-error';
import { ErrorTypes } from './consts';

export class NotFoundError extends BaseError {
	constructor(message: string, data: Record<string, any> | null = null, unwrappedError: Error | null = null) {
		super(message, ErrorTypes.NotFound, true, data, unwrappedError);
		this.name = new.target.prototype.constructor.name;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}
