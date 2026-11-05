const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rows, objectValue, many, api } = require('../dist/nodes/Adversus/helpers');
const { Adversus } = require('../dist/nodes/Adversus/Adversus.node');
const { AdversusApi } = require('../dist/credentials/AdversusApi.credentials');
const { NodeApiError, NodeOperationError } = require('n8n-workflow');
function context(params, responses, count = 1, proceed = false) {
	const calls = [];
	return {
		calls,
		getInputData: () => Array.from({ length: count }, () => ({ json: {} })),
		getNode: () => ({
			name: 'Adversus',
			type: 'n8n-nodes-adversus.adversus',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		getNodeParameter: (name, i, fallback) =>
			(typeof params === 'function' ? params(name, i) : params[name]) ?? fallback,
		continueOnFail: () => proceed,
		helpers: {
			httpRequestWithAuthentication: async function (credential, request) {
				calls.push({ credential, ...request });
				const response = responses.shift();
				if (response instanceof Error) throw response;
				return response;
			},
		},
	};
}
test('normalizes IDs and wrapped object arrays', () => {
	assert.deepEqual(rows([1, 2], 'contact'), [{ id: 1 }, { id: 2 }]);
	assert.deepEqual(rows({ leads: [{ id: 3 }] }, 'lead'), [{ id: 3 }]);
	assert.throws(() => rows({ unexpected: [] }, 'lead'), /Unexpected/);
});
test('JSON object validation preserves null, false and zero', () => {
	assert.deepEqual(objectValue('{"1":0,"2":false,"3":null}', 'data'), { 1: 0, 2: false, 3: null });
	assert.throws(() => objectValue('[]', 'data'), /object/);
});
test('pagination follows pageCount and honors limit', async () => {
	const ctx = context({}, [
		{ contacts: [1, 2], meta: { pagination: { pageCount: 2 } } },
		{ contacts: [3, 4], meta: { pagination: { pageCount: 2 } } },
	]);
	assert.deepEqual(await many.call(ctx, 'contact', {}, 3, 2, 0), [{ id: 1 }, { id: 2 }, { id: 3 }]);
	assert.deepEqual(
		ctx.calls.map((c) => c.qs.page),
		[1, 2],
	);
});
test('pagination stops on empty and short pages without metadata', async () => {
	assert.deepEqual(await many.call(context({}, [[]]), 'pool', {}, Infinity, 100, 0), []);
	assert.deepEqual(await many.call(context({}, [[{ id: 1 }]]), 'pool', {}, Infinity, 100, 0), [
		{ id: 1 },
	]);
});
test('pagination rejects repeated pages', async () => {
	await assert.rejects(
		many.call(context({}, [[{ id: 1 }], [{ id: 1 }]]), 'pool', {}, Infinity, 1, 0),
		/same page/,
	);
});
test('pagination rejects invalid metadata', async () => {
	await assert.rejects(
		many.call(
			context({}, [{ leads: [{ id: 1 }], meta: { pagination: { pageCount: 'bad' } } }]),
			'lead',
			{},
			Infinity,
			1,
			0,
		),
		/metadata/,
	);
});
test('contact creation wraps data and preserves JSON value types', async () => {
	const ctx = context(
		{
			resource: 'contact',
			operation: 'create',
			poolId: '12',
			dataMode: 'json',
			dataJson: { 1: 0, 2: false, 3: null },
		},
		[{ id: 42, data: { 1: 0 } }],
	);
	const result = await new Adversus().execute.call(ctx);
	assert.equal(ctx.calls[0].method, 'POST');
	assert.deepEqual(ctx.calls[0].body, { poolId: 12, data: { 1: 0, 2: false, 3: null } });
	assert.deepEqual(result[0][0].pairedItem, { item: 0 });
});
test('contact update uses PATCH and no pool ID', async () => {
	const ctx = context(
		{
			resource: 'contact',
			operation: 'update',
			recordId: '42',
			dataMode: 'fields',
			contactFields: { values: [{ fieldId: '5', value: 'Alice' }] },
		},
		[{ id: 42 }],
	);
	await new Adversus().execute.call(ctx);
	assert.equal(ctx.calls[0].method, 'PATCH');
	assert.deepEqual(ctx.calls[0].body, { data: { 5: 'Alice' } });
});
test('duplicate fields fail before API call', async () => {
	const ctx = context(
		{
			resource: 'contact',
			operation: 'update',
			recordId: '42',
			dataMode: 'fields',
			contactFields: {
				values: [
					{ fieldId: '5', value: 'A' },
					{ fieldId: '5', value: 'B' },
				],
			},
		},
		[],
	);
	await assert.rejects(new Adversus().execute.call(ctx), /twice/);
	assert.equal(ctx.calls.length, 0);
});
test('lead update uses PUT and keeps false', async () => {
	const ctx = context(
		{ resource: 'lead', operation: 'update', recordId: '42', leadJson: { active: false } },
		[{ code: 200, message: 'OK' }],
	);
	await new Adversus().execute.call(ctx);
	assert.equal(ctx.calls[0].method, 'PUT');
	assert.deepEqual(ctx.calls[0].body, { active: false });
});
test('campaign add contact returns explicit acknowledgement for empty body', async () => {
	const ctx = context(
		{
			resource: 'campaign',
			operation: 'addContact',
			campaignId: '3',
			contactId: '42',
			status: 'new',
		},
		[undefined],
	);
	const [result] = await new Adversus().execute.call(ctx);
	assert.equal(ctx.calls[0].url, 'https://api.adversus.io/v1/campaigns/3/addContact');
	assert.deepEqual(result[0].json, { campaignId: '3', contactId: '42', added: true });
});
test('contact list passes projection and yields individual records', async () => {
	const ctx = context(
		{
			resource: 'contact',
			operation: 'getAll',
			returnAll: false,
			limit: 5,
			options: { projection: '1,2', filters: '{"poolId":{"$eq":12}}' },
		},
		[{ contacts: [{ id: 42, fields: { 1: 'Alice' } }] }],
	);
	const [result] = await new Adversus().execute.call(ctx);
	assert.equal(result.length, 1);
	assert.equal(ctx.calls[0].qs.projection, '1,2');
	assert.equal(ctx.calls[0].qs.includeMeta, true);
});
test('organization gets unwrapped record', async () => {
	const ctx = context({ resource: 'organization', operation: 'get' }, [
		{ id: '1', name: 'Example' },
	]);
	assert.equal((await new Adversus().execute.call(ctx))[0][0].json.name, 'Example');
});
test('continue on fail produces linked error item', async () => {
	const ctx = context({ resource: 'lead', operation: 'get', recordId: 'bad' }, [], 1, true);
	const [result] = await new Adversus().execute.call(ctx);
	assert.match(result[0].json.error, /numeric/);
	assert.deepEqual(result[0].pairedItem, { item: 0 });
});
test('ambiguous write failure is not retried', async () => {
	const error = Object.assign(new Error('Server failure'), { statusCode: 500 });
	const ctx = context({}, [error]);
	await assert.rejects(api.call(ctx, 'POST', '/contacts', {}, {}));
	assert.equal(ctx.calls.length, 1);
});
test('credential test is read-only and targets fixed API domain', () => {
	const cred = new AdversusApi();
	assert.equal(cred.test.request.url, '/organization');
	assert.equal(cred.test.request.method, 'GET');
	assert.equal(cred.properties.find((p) => p.name === 'password').typeOptions.password, true);
});
test('429 retries are bounded and respect the fixed API authentication', async () => {
	const failure = () =>
		Object.assign(new Error('Too many requests'), {
			statusCode: 429,
			response: { headers: { 'retry-after': '0' } },
		});
	const ctx = context({}, [failure(), failure(), failure(), failure()]);
	await assert.rejects(api.call(ctx, 'GET', '/organization'));
	assert.equal(ctx.calls.length, 4);
	assert.ok(ctx.calls.every((c) => c.credential === 'adversusApi'));
});
test('multiple input records preserve item linking', async () => {
	const ctx = context({ resource: 'organization', operation: 'get' }, [{ id: 1 }, { id: 2 }], 2);
	const [result] = await new Adversus().execute.call(ctx);
	assert.deepEqual(
		result.map((x) => x.pairedItem.item),
		[0, 1],
	);
});

const SECRET = 'Basic c2VjcmV0LXVzZXI6c2VjcmV0LXBhc3M=';
function notFound() {
	// Mimics the HTTP client error, including the auth header that must never leak.
	return Object.assign(new Error('Request failed with status code 404'), {
		statusCode: 404,
		config: { headers: { Authorization: SECRET } },
		response: { status: 404, data: { message: 'Contact not found' } },
	});
}
test('API 404 is kept as NodeApiError with status, description and item index', async () => {
	const ctx = context({ resource: 'contact', operation: 'get', recordId: '0' }, [notFound()]);
	const error = await new Adversus().execute.call(ctx).then(
		() => assert.fail('expected error'),
		(e) => e,
	);
	assert.ok(error instanceof NodeApiError, `expected NodeApiError, got ${error.constructor.name}`);
	assert.ok(!(error instanceof NodeOperationError));
	assert.equal(String(error.httpCode), '404');
	assert.match(`${error.message} ${error.description}`, /Contact not found/);
	assert.equal(error.context.itemIndex, 0);
	assert.equal(ctx.calls.length, 1);
	assert.ok(!JSON.stringify(error).includes(SECRET));
	assert.ok(!JSON.stringify(error).includes('Authorization'));
});
test('non-numeric ID is rejected as NodeOperationError before any API call', async () => {
	const ctx = context({ resource: 'contact', operation: 'get', recordId: 'abc' }, []);
	const error = await new Adversus().execute.call(ctx).then(
		() => assert.fail('expected error'),
		(e) => e,
	);
	assert.ok(error instanceof NodeOperationError);
	assert.match(error.message, /numeric ID/);
	assert.equal(error.context.itemIndex, 0);
	assert.equal(ctx.calls.length, 0);
});
test('continue on fail: valid, invalid, valid keeps three linked outputs', async () => {
	const ids = ['1', 'abc', '3'];
	const ctx = context(
		(name, i) => ({ resource: 'contact', operation: 'get', recordId: ids[i] })[name],
		[{ id: 1 }, { id: 3 }],
		3,
		true,
	);
	const [result] = await new Adversus().execute.call(ctx);
	assert.equal(result.length, 3);
	assert.deepEqual(
		result.map((x) => x.pairedItem),
		[{ item: 0 }, { item: 1 }, { item: 2 }],
	);
	assert.deepEqual(result[0].json, { id: 1 });
	assert.match(result[1].json.error, /numeric ID/);
	assert.deepEqual(result[2].json, { id: 3 });
	assert.deepEqual(
		ctx.calls.map((c) => c.url),
		['https://api.adversus.io/v1/contacts/1', 'https://api.adversus.io/v1/contacts/3'],
	);
});
test('continue on fail turns an API 404 into a linked error item without secrets', async () => {
	const ctx = context(
		{ resource: 'contact', operation: 'get', recordId: '0' },
		[notFound()],
		1,
		true,
	);
	const [result] = await new Adversus().execute.call(ctx);
	assert.equal(result.length, 1);
	assert.deepEqual(result[0].pairedItem, { item: 0 });
	assert.equal(typeof result[0].json.error, 'string');
	assert.ok(!JSON.stringify(result).includes(SECRET));
});
