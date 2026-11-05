import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';
import { api, many, objectValue, paths, rows } from './helpers';

// Programmatic style centralizes mixed ID/object responses, sequential pagination,
// per-execution pacing and bounded 429 recovery across multiple resources.
const properties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		default: 'contact',
		options: [
			{
				name: 'Campaign',
				value: 'campaign',
			},
			{
				name: 'Contact',
				value: 'contact',
			},
			{
				name: 'Field',
				value: 'field',
			},
			{
				name: 'Lead',
				value: 'lead',
			},
			{
				name: 'Organization',
				value: 'organization',
			},
			{
				name: 'Pool',
				value: 'pool',
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		default: 'create',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create contact',
				description: 'Create a contact',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get contact',
				description: 'Get a contact',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many contacts',
				description: 'Get many contacts',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update contact',
				description: 'Update a contact',
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['lead'],
			},
		},
		default: 'create',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create lead',
				description: 'Create a lead',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get lead',
				description: 'Get a lead',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many leads',
				description: 'Get many leads',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update lead',
				description: 'Update a lead',
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['campaign'],
			},
		},
		default: 'get',
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get campaign',
				description: 'Get a campaign',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many campaigns',
				description: 'Get many campaigns',
			},
			{
				name: 'Add Contact',
				value: 'addContact',
				action: 'Add contact to campaign',
				description: 'Add a contact to a campaign',
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['pool'],
			},
		},
		default: 'get',
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get pool',
				description: 'Get a pool',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many pools',
				description: 'Get many pools',
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['field'],
			},
		},
		default: 'getAll',
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many fields',
				description: 'Get many fields',
			},
		],
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['organization'],
			},
		},
		default: 'get',
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get organization',
				description: 'Get the connected organization',
			},
		],
	},
	{
		displayName: 'ID',
		name: 'recordId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['contact', 'lead', 'campaign', 'pool'],
				operation: ['get', 'update'],
			},
		},
		required: true,
		description: 'The unique record ID',
	},
	{
		displayName: 'Campaign Name or ID',
		name: 'campaignId',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: ['lead', 'campaign'],
				operation: ['create', 'addContact'],
			},
		},
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		description: 'Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Pool Name or ID',
		name: 'poolId',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create'],
			},
		},
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getPools',
		},
		description: 'Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['addContact'],
			},
		},
		required: true,
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: 'new',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['addContact'],
			},
		},
		options: [
			{ name: 'Automatic Redial', value: 'automaticRedial' },
			{ name: 'Invalid', value: 'invalid' },
			{ name: 'New', value: 'new' },
			{ name: 'Not Interested', value: 'notInterested' },
			{ name: 'Private Redial', value: 'privateRedial' },
			{ name: 'Success', value: 'success' },
			{ name: 'Unqualified', value: 'unqualified' },

		],
	},
	{
		displayName: 'Additional Fields',
		name: 'campaignOptions',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['addContact'],
			},
		},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Next Contact Time',
				name: 'nextContactTime',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Segment ID',
				name: 'segmentId',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		default: 'fields',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				name: 'Fields',
				value: 'fields',
			},
			{
				name: 'JSON',
				value: 'json',
			},
		],
	},
	{
		displayName: 'Contact Fields',
		name: 'contactFields',
		type: 'fixedCollection',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create', 'update'],
				dataMode: ['fields'],
			},
		},
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Field',
		options: [
			{
				name: 'values',
				displayName: 'Field',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getFields',
						},
						default: '',
						description: 'Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Use JSON mode to send numbers, booleans or null values',
					},
				],
			},
		],
	},
	{
		displayName: 'Data (JSON)',
		name: 'dataJson',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['create', 'update'],
				dataMode: ['json'],
			},
		},
		description: 'Field ID to value map, for example {"42":"Alice"}. Do not wrap in data.',
	},
	{
		displayName: 'Lead Fields (JSON)',
		name: 'leadJson',
		type: 'json',
		default: '{}',
		displayOptions: {
			show: {
				resource: ['lead'],
				operation: ['create', 'update'],
			},
		},
		description:
			'Lead properties such as status, active, masterData and resultData. Campaign ID is set separately when creating.',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		displayOptions: {
			show: {
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
			},
		},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Filters (JSON)',
				name: 'filters',
				type: 'json',
				default: '{}',
				description:
					'API filters. Contact searches use field IDs; allowed properties vary by resource.',
			},
			{
				displayName: 'Page Size',
				name: 'pageSize',
				type: 'number',
				default: 100,
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				description: 'Conservative maximum until API page size limits are confirmed',
			},
			{
				displayName: 'Projection',
				name: 'projection',
				type: 'string',
				default: '',
				description:
					'Comma-separated contact field IDs; contacts return IDs only without projection',
			},
			{
				displayName: 'Request Interval (Ms)',
				name: 'requestInterval',
				type: 'number',
				default: 3700,
				typeOptions: {
					minValue: 1100,
				},
				description:
					'Delay between requests in this execution. Other workflows share the API quota.',
			},
		],
	},
];

async function choices(
	this: ILoadOptionsFunctions,
	resource: string,
): Promise<INodePropertyOptions[]> {
	const records = await many.call(this, resource, {}, 10000, 100, 3700);
	return records
		.map((record) => ({
			name: String(record.name ?? (record.settings as IDataObject)?.name ?? record.id),
			value: String(record.id),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
function id(node: INode, value: unknown, label: string): string {
	const text = String(value ?? '').trim();
	if (!/^\d+$/.test(text)) throw new NodeOperationError(node, `${label} must contain a numeric ID`);
	return text;
}
function interval(node: INode, value: unknown): number {
	const number = Number(value ?? 3700);
	if (!Number.isFinite(number) || number < 1100)
		throw new NodeOperationError(node, 'Request interval must be at least 1100 ms');
	return number;
}
export class Adversus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Adversus',
		name: 'adversus',
		icon: {
			light: 'file:adversus.svg',
			dark: 'file:adversus.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with contacts, leads, campaigns, pools and fields in Adversus',
		defaults: { name: 'Adversus' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'adversusApi', required: true }],
		usableAsTool: true,
		properties,
	};
	methods = {
		loadOptions: {
			async getCampaigns(this: ILoadOptionsFunctions) {
				return await choices.call(this, 'campaign');
			},
			async getPools(this: ILoadOptionsFunctions) {
				return await choices.call(this, 'pool');
			},
			async getFields(this: ILoadOptionsFunctions) {
				return await choices.call(this, 'field');
			},
		},
	};
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const output: INodeExecutionData[] = [];
		const items = this.getInputData();
		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const supported: Record<string, string[]> = {
					contact: ['create', 'get', 'getAll', 'update'],
					lead: ['create', 'get', 'getAll', 'update'],
					campaign: ['get', 'getAll', 'addContact'],
					pool: ['get', 'getAll'],
					field: ['getAll'],
					organization: ['get'],
				};
				if (!supported[resource]?.includes(operation))
					throw new NodeOperationError(this.getNode(), 'Unsupported resource or operation');
				let records: IDataObject[];
				if (i > 0) await sleep(3700);
				if (operation === 'getAll') {
					const options = this.getNodeParameter('options', i, {}) as IDataObject;
					const all = this.getNodeParameter('returnAll', i) as boolean;
					const limit = all ? Infinity : Number(this.getNodeParameter('limit', i));
					const size = Number(options.pageSize ?? 100);
					if (
						(!all && (!Number.isInteger(limit) || limit < 1)) ||
						!Number.isInteger(size) ||
						size < 1 ||
						size > 100
					)
						throw new NodeOperationError(this.getNode(), 'Invalid limit or page size');
					const query: IDataObject = {};
					if (options.filters)
						query.filters = JSON.stringify(objectValue(options.filters, 'Filters'));
					if (resource === 'contact' && options.projection)
						query.projection = String(options.projection);
					records = await many.call(
						this,
						resource,
						query,
						limit,
						size,
						interval(this.getNode(), options.requestInterval),
					);
				} else if (operation === 'get') {
					const path =
						resource === 'organization'
							? paths[resource]
							: `${paths[resource]}/${id(this.getNode(), this.getNodeParameter('recordId', i), 'ID')}`;
					records = rows(await api.call(this, 'GET', path), resource);
				} else if (operation === 'addContact') {
					const campaignId = id(
						this.getNode(),
						this.getNodeParameter('campaignId', i),
						'Campaign ID',
					);
					const contactId = id(this.getNode(), this.getNodeParameter('contactId', i), 'Contact ID');
					const options = this.getNodeParameter('campaignOptions', i, {}) as IDataObject;
					const body: IDataObject = {
						contactId: Number(contactId),
						status: this.getNodeParameter('status', i) as string,
					};
					if (options.nextContactTime) body.nextContactTime = String(options.nextContactTime);
					if (options.segmentId) body.segmentId = String(options.segmentId);
					await api.call(this, 'POST', `/campaigns/${campaignId}/addContact`, {}, body);
					records = [{ campaignId, contactId, added: true }];
				} else {
					let body: IDataObject;
					if (resource === 'contact') {
						let data: IDataObject;
						if (this.getNodeParameter('dataMode', i) === 'json')
							data = objectValue(this.getNodeParameter('dataJson', i), 'Contact data');
						else {
							data = {};
							const fields = this.getNodeParameter('contactFields', i, {}) as {
								values?: Array<{ fieldId: string; value: string }>;
							};
							for (const field of fields.values ?? []) {
								const key = id(this.getNode(), field.fieldId, 'Field ID');
								if (Object.prototype.hasOwnProperty.call(data, key))
									throw new NodeOperationError(this.getNode(), `Field ${key} is included twice`);
								data[key] = field.value;
							}
						}
						if (!Object.keys(data).length)
							throw new NodeOperationError(this.getNode(), 'Provide at least one contact field');
						if (Object.keys(data).some((key) => !/^\d+$/.test(key)))
							throw new NodeOperationError(
								this.getNode(),
								'Contact data keys must be numeric field IDs',
							);
						body = { data };
						if (operation === 'create')
							body.poolId = Number(
								id(this.getNode(), this.getNodeParameter('poolId', i), 'Pool ID'),
							);
					} else {
						body = objectValue(this.getNodeParameter('leadJson', i), 'Lead fields');
						if (operation === 'create')
							body.campaignId = Number(
								id(this.getNode(), this.getNodeParameter('campaignId', i), 'Campaign ID'),
							);
						if (!Object.keys(body).length)
							throw new NodeOperationError(this.getNode(), 'Provide at least one lead field');
					}
					const path =
						operation === 'create'
							? paths[resource]
							: `${paths[resource]}/${id(this.getNode(), this.getNodeParameter('recordId', i), 'ID')}`;
					const method = operation === 'create' ? 'POST' : resource === 'contact' ? 'PATCH' : 'PUT';
					const result = await api.call(this, method, path, {}, body);
					records = [objectValue(result, 'API response')];
				}
				output.push(...records.map((json) => ({ json, pairedItem: { item: i } })));
			} catch (error) {
				if (this.continueOnFail()) {
					output.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				// API errors must stay NodeApiError (HTTP status, description): wrapping them in
				// NodeOperationError drops the status. Both constructors return an instance of their
				// own type unchanged (ignoring options), so the item index is set on it directly.
				if (error instanceof NodeApiError || error instanceof NodeOperationError)
					error.context.itemIndex = i;
				if (error instanceof NodeApiError)
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i });
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}
		return [output];
	}
}
