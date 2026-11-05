import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, UnexpectedError, sleep } from 'n8n-workflow';

type Context = IExecuteFunctions | ILoadOptionsFunctions;
export const paths: Record<string, string> = {
	contact: '/contacts',
	lead: '/leads',
	campaign: '/campaigns',
	pool: '/pools',
	field: '/fields',
	organization: '/organization',
};
const keys: Record<string, string> = {
	contact: 'contacts',
	lead: 'leads',
	campaign: 'campaigns',
	pool: 'pools',
	field: 'fields',
	organization: 'organization',
};
export function objectValue(value: unknown, label: string): IDataObject {
	const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
		throw new UnexpectedError(`${label} must be a JSON object`);
	return parsed as IDataObject;
}
export function rows(value: unknown, resource: string): IDataObject[] {
	const root = value as IDataObject;
	const data = Array.isArray(value) ? value : root?.[keys[resource]];
	const result = Array.isArray(data)
		? data
		: data !== undefined
			? [data]
			: root && root.id !== undefined
				? [root]
				: null;
	if (!result)
		throw new UnexpectedError(
			`Unexpected ${resource} response; expected a record, array or ${keys[resource]} array`,
		);
	return result.map((entry: unknown) => {
		if (typeof entry === 'number' || typeof entry === 'string') return { id: entry };
		if (!entry || typeof entry !== 'object' || Array.isArray(entry))
			throw new UnexpectedError('Unexpected record in API response');
		return entry as IDataObject;
	});
}
export async function api(
	this: Context,
	method: IHttpRequestMethods,
	path: string,
	qs: IDataObject = {},
	body?: IDataObject,
): Promise<unknown> {
	for (let attempt = 0; attempt < 4; attempt++) {
		try {
			return await this.helpers.httpRequestWithAuthentication.call(this, 'adversusApi', {
				method,
				url: `https://api.adversus.io/v1${path}`,
				qs,
				...(body === undefined ? {} : { body }),
				json: true,
				timeout: 30000,
			});
		} catch (error) {
			const status = Number(
				error.statusCode ?? error.response?.status ?? error.response?.statusCode ?? error.httpCode,
			);
			// Only repeat requests explicitly rejected with 429. Writes are never retried after ambiguous network/5xx errors.
			if (status === 429 && attempt < 3) {
				const retry = error.response?.headers?.['retry-after'];
				const seconds = Number(retry);
				const dateDelay = typeof retry === 'string' ? Date.parse(retry) - Date.now() : NaN;
				const delay =
					retry !== undefined && Number.isFinite(seconds)
						? seconds * 1000
						: Number.isFinite(dateDelay)
							? dateDelay
							: 60000 * (attempt + 1);
				// Do not retry earlier than requested; surface very long waits to the workflow.
				if (delay > 180000) throw new NodeApiError(this.getNode(), error);
				await sleep(Math.max(1000, delay));
				continue;
			}
			throw new NodeApiError(this.getNode(), error);
		}
	}
	throw new NodeOperationError(this.getNode(), 'Request retry limit reached');
}
export async function many(
	this: Context,
	resource: string,
	query: IDataObject,
	limit: number,
	pageSize: number,
	delay: number,
): Promise<IDataObject[]> {
	const output: IDataObject[] = [];
	let previousSignature = '';
	for (let page = 1; page <= 10000; page++) {
		const value = await api.call(this, 'GET', paths[resource], {
			...query,
			includeMeta: true,
			page,
			pageSize,
		});
		const batch = rows(value, resource);
		if (!batch.length) return output;
		const signature = JSON.stringify(batch);
		if (signature === previousSignature)
			throw new NodeOperationError(
				this.getNode(),
				'Pagination returned the same page twice; narrow your filters',
			);
		previousSignature = signature;
		output.push(...batch.slice(0, Math.max(0, limit - output.length)));
		if (output.length >= limit) return output;
		const pagination = (value as IDataObject)?.meta as IDataObject | undefined;
		const meta = pagination?.pagination as IDataObject | undefined;
		if (meta?.pageCount !== undefined) {
			const pageCount = Number(meta.pageCount);
			if (!Number.isFinite(pageCount) || pageCount < page)
				throw new NodeOperationError(this.getNode(), 'Invalid pagination metadata');
			if (page >= pageCount) return output;
		} else if (batch.length < pageSize) return output;
		await sleep(delay);
	}
	throw new NodeOperationError(
		this.getNode(),
		'Pagination safety limit reached; narrow your filters',
	);
}
