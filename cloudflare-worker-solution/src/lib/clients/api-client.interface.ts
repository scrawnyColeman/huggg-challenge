import { type GetDataResponseDto } from './dtos/get-data.dto';

export interface ApiClient {
	getData: () => Promise<GetDataResponseDto>;
}
