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
	reasoning?: { effort: string };
	additionalParams?: Record<string, unknown>;
	providerTools?: Array<Record<string, unknown>>;
};

/**
 * Builds a minimal ISupplyDataFunctions-like context whose getNodeParameter
 * returns the given model id and options object.
 */
function makeContext(modelId: string, options: Record<string, unknown>) {
	return {
		getCredentials: async () => ({ apiKey: 'test-key' }),
		getNode: () => ({ name: 'Requesty Chat Model' }),
		getNodeParameter: (name: string) => {
			if (name === 'model') return modelId;
			if (name === 'options') return options;
			return undefined;
		},
	};
}

async function supply(modelId: string, options: Record<string, unknown>): Promise<SuppliedModel> {
	const node = new LmChatRequesty();
	const ctx = makeContext(modelId, options);
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

		it('sends no structured output for plain text', async () => {
			const model = await supply('openai-responses/gpt-5.4', { responseFormat: 'text' });
			expect(model.additionalParams).toBeUndefined();
		});

		it('builds text.format for JSON object mode', async () => {
			const model = await supply('openai-responses/gpt-5.4', { responseFormat: 'json_object' });
			expect(model.additionalParams).toEqual({ text: { format: { type: 'json_object' } } });
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
