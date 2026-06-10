import { ImageGenRequesty } from '../nodes/ImageGenRequesty/ImageGenRequesty.node';

type MockContext = {
	getInputData: () => Array<{ json: Record<string, unknown> }>;
	getCredentials: () => Promise<Record<string, unknown>>;
	getNode: () => { name: string };
	getNodeParameter: (name: string, i?: number, fallback?: unknown) => unknown;
	helpers: {
		httpRequestWithAuthentication: jest.Mock;
		prepareBinaryData: jest.Mock;
	};
	continueOnFail: () => boolean;
};

/**
 * Builds a minimal IExecuteFunctions-like context with a single input item.
 * `params` holds the node parameters (model, prompt, options).
 */
function makeContext(params: Record<string, unknown>, httpResponse: unknown): MockContext {
	return {
		getInputData: () => [{ json: {} }],
		getCredentials: async () => ({ apiKey: 'test-key', baseUrl: '' }),
		getNode: () => ({ name: 'Requesty Image Generation' }),
		getNodeParameter: (name: string, _i?: number, fallback?: unknown) => params[name] ?? fallback,
		helpers: {
			httpRequestWithAuthentication: jest.fn().mockResolvedValue(httpResponse),
			prepareBinaryData: jest.fn().mockResolvedValue({
				data: 'base64data',
				mimeType: 'image/png',
				fileName: 'image_0.png',
			}),
		},
		continueOnFail: () => false,
	};
}

async function run(ctx: MockContext) {
	const node = new ImageGenRequesty();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return await node.execute.call(ctx as any);
}

const B64_RESPONSE = {
	data: [{ b64_json: Buffer.from('fake-image').toString('base64') }],
};

describe('ImageGenRequesty', () => {
	describe('node description', () => {
		it('declares the expected identity and main input/output', () => {
			const node = new ImageGenRequesty();
			expect(node.description).toMatchObject({
				displayName: 'Requesty Image Generation',
				name: 'imageGenRequesty',
				group: ['transform'],
				version: [1],
				usableAsTool: true,
			});
			expect(node.description.inputs).toEqual(['main']);
			expect(node.description.outputs).toEqual(['main']);
		});

		it('requires the requestyApi credential', () => {
			const node = new ImageGenRequesty();
			expect(node.description.credentials).toEqual([{ name: 'requestyApi', required: true }]);
		});

		it('has model, prompt, and options properties', () => {
			const node = new ImageGenRequesty();
			const propNames = node.description.properties.map((p) => p.name);
			expect(propNames).toEqual(['model', 'prompt', 'options']);
		});
	});

	describe('execute', () => {
		it('calls the image generation endpoint with the authenticated helper', async () => {
			const ctx = makeContext(
				{ model: 'azure/openai/gpt-image-1', prompt: 'A cute cat', options: {} },
				B64_RESPONSE,
			);

			await run(ctx);

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'requestyApi',
				expect.objectContaining({
					method: 'POST',
					url: 'https://router.requesty.ai/v1/images/generations',
					body: expect.objectContaining({
						model: 'azure/openai/gpt-image-1',
						prompt: 'A cute cat',
						response_format: 'b64_json',
					}),
				}),
			);
		});

		it('returns binary data by default', async () => {
			const ctx = makeContext(
				{ model: 'azure/openai/gpt-image-1', prompt: 'A cute cat', options: {} },
				B64_RESPONSE,
			);

			const result = await run(ctx);

			expect(result[0]![0]!.binary?.data).toBeDefined();
			expect(ctx.helpers.prepareBinaryData).toHaveBeenCalledWith(
				expect.any(Buffer),
				'image_0.png',
				'image/png',
			);
		});

		it('returns URLs when returnImageUrls is true', async () => {
			const ctx = makeContext(
				{
					model: 'azure/openai/gpt-image-1',
					prompt: 'A cute cat',
					options: { returnImageUrls: true },
				},
				{
					data: [{ url: 'https://example.com/image.png', revised_prompt: 'A cute cat sitting' }],
				},
			);

			const result = await run(ctx);

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'requestyApi',
				expect.objectContaining({
					body: expect.objectContaining({ response_format: 'url' }),
				}),
			);
			expect(result[0]![0]!.json).toEqual({
				url: 'https://example.com/image.png',
				revised_prompt: 'A cute cat sitting',
				model: 'azure/openai/gpt-image-1',
			});
			expect(result[0]![0]!.binary).toBeUndefined();
		});

		it('passes optional parameters when set', async () => {
			const ctx = makeContext(
				{
					model: 'azure/openai/gpt-image-1',
					prompt: 'A logo',
					options: {
						size: '1536x1024',
						quality: 'high',
						background: 'transparent',
						output_format: 'webp',
						n: 2,
					},
				},
				{
					data: [
						{ b64_json: Buffer.from('img1').toString('base64') },
						{ b64_json: Buffer.from('img2').toString('base64') },
					],
				},
			);

			const result = await run(ctx);

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'requestyApi',
				expect.objectContaining({
					body: expect.objectContaining({
						size: '1536x1024',
						quality: 'high',
						background: 'transparent',
						output_format: 'webp',
						n: 2,
					}),
				}),
			);
			expect(result[0]).toHaveLength(2);
			expect(ctx.helpers.prepareBinaryData).toHaveBeenCalledWith(
				expect.any(Buffer),
				'image_1.webp',
				'image/webp',
			);
		});

		it('omits default-valued optional parameters from the request body', async () => {
			const ctx = makeContext(
				{
					model: 'azure/openai/gpt-image-1',
					prompt: 'A cat',
					options: { quality: 'auto', background: 'auto', output_format: 'png', n: 1 },
				},
				B64_RESPONSE,
			);

			await run(ctx);

			const body = ctx.helpers.httpRequestWithAuthentication.mock.calls[0]![1].body as Record<
				string,
				unknown
			>;
			expect(body.quality).toBeUndefined();
			expect(body.background).toBeUndefined();
			expect(body.output_format).toBeUndefined();
			expect(body.n).toBeUndefined();
		});

		it('sends user custom headers', async () => {
			const ctx = makeContext(
				{
					model: 'azure/openai/gpt-image-1',
					prompt: 'A cute cat',
					options: {
						customHeaders: { header: [{ name: 'X-Requesty-Agent', value: 'my-image-bot' }] },
					},
				},
				B64_RESPONSE,
			);

			await run(ctx);

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'requestyApi',
				expect.objectContaining({
					headers: expect.objectContaining({ 'X-Requesty-Agent': 'my-image-bot' }),
				}),
			);
		});

		it('uses the base URL from options over the credential', async () => {
			const ctx = makeContext(
				{
					model: 'azure/openai/gpt-image-1',
					prompt: 'A cute cat',
					options: { baseUrl: 'https://my-gateway.example.com/v1' },
				},
				B64_RESPONSE,
			);

			await run(ctx);

			expect(ctx.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'requestyApi',
				expect.objectContaining({
					url: 'https://my-gateway.example.com/v1/images/generations',
				}),
			);
		});

		it('throws when the prompt is empty', async () => {
			const ctx = makeContext(
				{ model: 'azure/openai/gpt-image-1', prompt: '', options: {} },
				B64_RESPONSE,
			);

			await expect(run(ctx)).rejects.toThrow('The Prompt parameter is required.');
		});

		it('throws on an unexpected response shape', async () => {
			const ctx = makeContext(
				{ model: 'azure/openai/gpt-image-1', prompt: 'A cat', options: {} },
				{ unexpected: true },
			);

			await expect(run(ctx)).rejects.toThrow('Unexpected response format');
		});

		it('returns the error per item when continueOnFail is enabled', async () => {
			const ctx = makeContext(
				{ model: 'azure/openai/gpt-image-1', prompt: '', options: {} },
				B64_RESPONSE,
			);
			ctx.continueOnFail = () => true;

			const result = await run(ctx);

			expect(result[0]![0]!.json).toEqual({ error: 'The Prompt parameter is required.' });
		});
	});
});
