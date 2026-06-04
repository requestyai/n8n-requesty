// Mock the SDK so we can assert exactly what supplyData passes to supplyModel.
// `jest` is available as an ambient global (via @types/jest); importing
// '@jest/globals' is disallowed by the n8n community-node lint rules.
jest.mock('@n8n/ai-node-sdk', () => ({
	supplyModel: jest.fn((_ctx: unknown, model: unknown) => ({ response: model })),
}));

import { supplyModel as supplyModelImport } from '@n8n/ai-node-sdk';

import { LmChatRequesty } from '../nodes/LmChatRequesty/LmChatRequesty.node';

const supplyModel = supplyModelImport as jest.Mock;

type SuppliedModel = {
	type: string;
	baseUrl: string;
	apiKey: string;
	model: string;
	useResponsesApi: boolean;
	defaultHeaders?: Record<string, string>;
	reasoning?: { effort: string };
	additionalParams?: Record<string, unknown>;
	providerTools?: Array<Record<string, unknown>>;
};

/**
 * Builds a minimal ISupplyDataFunctions-like context. `params` may contain the
 * Options-collection keys plus the top-level params responseFormat / jsonSchema.
 */
function makeContext(modelId: string, params: Record<string, unknown>) {
	const { responseFormat, jsonSchema, ...options } = params;
	return {
		getCredentials: async () => ({ apiKey: 'test-key' }),
		getNode: () => ({ name: 'Requesty Chat Model' }),
		getExecutionId: () => 'exec-test-123',
		getNodeParameter: (name: string, _i?: number, fallback?: unknown) => {
			if (name === 'model') return modelId;
			if (name === 'options') return options;
			if (name === 'responseFormat') return responseFormat ?? fallback;
			if (name === 'jsonSchema') return jsonSchema ?? fallback;
			return fallback;
		},
	};
}

async function supply(modelId: string, params: Record<string, unknown>): Promise<SuppliedModel> {
	const node = new LmChatRequesty();
	const ctx = makeContext(modelId, params);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await node.supplyData.call(ctx as any, 0);
	const calls = supplyModel.mock.calls;
	return calls[calls.length - 1]![1] as SuppliedModel;
}

describe('LmChatRequesty', () => {
	beforeEach(() => {
		supplyModel.mockClear();
	});

	describe('node description', () => {
		it('declares the expected identity and language-model output', () => {
			const node = new LmChatRequesty();
			expect(node.description).toMatchObject({
				displayName: 'Requesty Chat Model',
				name: 'lmChatRequesty',
				group: ['transform'],
				version: [1],
			});
			expect(node.description.outputs).toEqual(['ai_languageModel']);
		});
	});

	describe('supplyData', () => {
		it('always uses the Responses API', async () => {
			const model = await supply('openai-responses/gpt-5.4', {});
			expect(model.useResponsesApi).toBe(true);
			expect(model.type).toBe('openai');
			expect(model.apiKey).toBe('test-key');
		});

		it('defaults to the public gateway when no base URL is set', async () => {
			const model = await supply('openai-responses/gpt-5.4', {});
			expect(model.baseUrl).toBe('https://router.requesty.ai/v1');
		});

		it('honours a base URL override from options', async () => {
			const model = await supply('openai-responses/gpt-5.4', {
				baseUrl: 'https://self-hosted.example.com/v1',
			});
			expect(model.baseUrl).toBe('https://self-hosted.example.com/v1');
		});

		it('omits reasoning unless explicitly set', async () => {
			const model = await supply('openai-responses/gpt-5.4', {});
			expect(model.reasoning).toBeUndefined();
		});

		it('sends reasoning effort when set', async () => {
			const model = await supply('openai-responses/gpt-5.4', { reasoningEffort: 'high' });
			expect(model.reasoning).toEqual({ effort: 'high' });
		});

		it('does not attach web search by default', async () => {
			const model = await supply('openai-responses/gpt-5.4', {});
			expect(model.providerTools).toBeUndefined();
		});

		it('attaches a web_search provider tool when enabled', async () => {
			const model = await supply('openai-responses/gpt-5.4', {
				enableWebSearch: true,
				webSearchContextSize: 'high',
			});
			expect(model.providerTools).toEqual([
				{ type: 'provider', name: 'web_search', args: { search_context_size: 'high' } },
			]);
		});

		it('sends the default attribution headers', async () => {
			const model = await supply('openai-responses/gpt-5.4', {});
			expect(model.defaultHeaders).toEqual({
				'HTTP-Referer': 'https://github.com/requestyai/n8n-requesty',
				'X-Title': 'n8n Requesty Community Node',
			});
		});

		it('merges custom headers with the attribution defaults', async () => {
			const model = await supply('openai-responses/gpt-5.4', {
				customHeaders: {
					header: [
						{ name: 'X-Requesty-Agent', value: 'my-support-bot' },
						{ name: 'X-Requesty-Environment', value: 'production' },
					],
				},
			});
			expect(model.defaultHeaders).toEqual({
				'HTTP-Referer': 'https://github.com/requestyai/n8n-requesty',
				'X-Title': 'n8n Requesty Community Node',
				'X-Requesty-Agent': 'my-support-bot',
				'X-Requesty-Environment': 'production',
			});
		});

		it('lets a custom header override a default (case-insensitively)', async () => {
			const model = await supply('openai-responses/gpt-5.4', {
				customHeaders: { header: [{ name: 'x-title', value: 'My Custom App' }] },
			});
			expect(model.defaultHeaders).toEqual({
				'HTTP-Referer': 'https://github.com/requestyai/n8n-requesty',
				'x-title': 'My Custom App',
			});
		});

		it('skips custom headers with an empty name or value', async () => {
			const model = await supply('openai-responses/gpt-5.4', {
				customHeaders: {
					header: [
						{ name: '', value: 'ignored' },
						{ name: 'X-Empty', value: '' },
						{ name: '  ', value: 'whitespace-name' },
					],
				},
			});
			expect(model.defaultHeaders).toEqual({
				'HTTP-Referer': 'https://github.com/requestyai/n8n-requesty',
				'X-Title': 'n8n Requesty Community Node',
			});
		});

		it('still sends the requesty trace_id for plain text', async () => {
			const model = await supply('openai-responses/gpt-5.4', { responseFormat: 'text' });
			expect(model.additionalParams).toEqual({ requesty: { trace_id: 'exec-test-123' } });
		});

		it('sends the n8n execution id as requesty.trace_id', async () => {
			const model = await supply('openai-responses/gpt-5.4', {});
			expect(model.additionalParams).toEqual({ requesty: { trace_id: 'exec-test-123' } });
		});

		it('builds text.format for JSON object mode', async () => {
			const model = await supply('openai-responses/gpt-5.4', { responseFormat: 'json_object' });
			expect(model.additionalParams).toEqual({
				text: { format: { type: 'json_object' } },
				requesty: { trace_id: 'exec-test-123' },
			});
		});

		it('builds strict text.format from a wrapped JSON schema', async () => {
			const schema = JSON.stringify({
				name: 'company',
				strict: true,
				schema: { type: 'object', properties: { x: { type: 'string' } } },
			});
			const model = await supply('openai-responses/gpt-5.4', {
				responseFormat: 'json_schema',
				jsonSchema: schema,
			});
			expect(model.additionalParams).toEqual({
				text: {
					format: {
						type: 'json_schema',
						name: 'company',
						strict: true,
						schema: { type: 'object', properties: { x: { type: 'string' } } },
					},
				},
				requesty: { trace_id: 'exec-test-123' },
			});
		});

		it('wraps a bare JSON schema with sensible defaults', async () => {
			const schema = JSON.stringify({ type: 'object', properties: { x: { type: 'string' } } });
			const model = await supply('openai-responses/gpt-5.4', {
				responseFormat: 'json_schema',
				jsonSchema: schema,
			});
			expect(model.additionalParams).toEqual({
				text: {
					format: {
						type: 'json_schema',
						name: 'response',
						strict: true,
						schema: { type: 'object', properties: { x: { type: 'string' } } },
					},
				},
				requesty: { trace_id: 'exec-test-123' },
			});
		});

		it('throws a helpful error on invalid JSON schema', async () => {
			const node = new LmChatRequesty();
			const ctx = makeContext('openai-responses/gpt-5.4', {
				responseFormat: 'json_schema',
				jsonSchema: '{ not valid json',
			});
			await expect(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				node.supplyData.call(ctx as any, 0),
			).rejects.toThrow(/not valid JSON/);
		});

		it('throws a helpful error when JSON Schema is selected but empty', async () => {
			const node = new LmChatRequesty();
			const ctx = makeContext('openai-responses/gpt-5.4', {
				responseFormat: 'json_schema',
				jsonSchema: '',
			});
			await expect(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				node.supplyData.call(ctx as any, 0),
			).rejects.toThrow(/no JSON Schema was provided/);
		});

		it('throws a helpful error when JSON Schema is selected but undefined', async () => {
			const node = new LmChatRequesty();
			// responseFormat set, but jsonSchema key entirely absent from options
			const ctx = makeContext('openai-responses/gpt-5.4', {
				responseFormat: 'json_schema',
			});
			await expect(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				node.supplyData.call(ctx as any, 0),
			).rejects.toThrow(/no JSON Schema was provided/);
		});
	});
});
