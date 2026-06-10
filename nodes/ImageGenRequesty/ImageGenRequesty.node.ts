import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { buildHeaders, type CustomHeader } from '../shared/headers';

type ImageOptions = {
	background?: 'auto' | 'transparent' | 'opaque';
	baseUrl?: string;
	customHeaders?: { header?: CustomHeader[] };
	n?: number;
	output_format?: 'png' | 'jpeg' | 'webp';
	quality?: 'auto' | 'high' | 'medium' | 'low';
	returnImageUrls?: boolean;
	size?: string;
};

type ImageGenerationResponse = {
	data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
};

const MIME_TYPES: Record<string, string> = {
	png: 'image/png',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
};

export class ImageGenRequesty implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Requesty Image Generation',
		name: 'imageGenRequesty',
		icon: 'file:../../icons/requesty.svg',
		group: ['transform'],
		version: [1],
		description:
			'Generate images from text prompts using AI models through the Requesty unified gateway',
		subtitle: '={{$parameter["model"]}}',
		usableAsTool: true,
		defaults: {
			name: 'Requesty Image Generation',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Miscellaneous'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.requesty.ai/api-reference/endpoint/images-generations-create',
					},
				],
			},
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'requestyApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'string',
				default: 'azure/openai/gpt-image-1',
				placeholder: 'e.g. azure/openai/gpt-image-1',
				description:
					'The model to use for image generation, e.g. azure/openai/gpt-image-1 or azure/openai/gpt-image-1.5',
				required: true,
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				default: '',
				placeholder: 'e.g. A watercolor painting of a Japanese garden in autumn',
				description: 'A text description of the desired image to generate',
				required: true,
				typeOptions: {
					rows: 3,
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options for image generation',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Background',
						name: 'background',
						type: 'options',
						default: 'auto',
						description:
							'The background type for the generated image. Use transparent for logos, icons, and design assets.',
						options: [
							{ name: 'Auto', value: 'auto' },
							{
								name: 'Transparent',
								value: 'transparent',
								description: 'Generate with a transparent background (useful for logos and icons)',
							},
							{ name: 'Opaque', value: 'opaque' },
						],
					},
					{
						displayName: 'Base URL',
						name: 'baseUrl',
						type: 'string',
						default: '',
						placeholder: 'https://router.requesty.ai/v1',
						description:
							'Override the gateway URL for this node. Leave empty to use the URL from the credential (which defaults to the public Requesty gateway).',
					},
					{
						displayName: 'Custom Headers',
						name: 'customHeaders',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true },
						default: {},
						placeholder: 'Add Header',
						description:
							'Extra HTTP headers sent with every request to Requesty. Use Requesty attribution headers such as X-Requesty-Agent, X-Requesty-Environment or X-Requesty-Team to tag and track this workflow. Setting HTTP-Referer or X-Title here overrides the node defaults.',
						options: [
							{
								name: 'header',
								displayName: 'Header',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										placeholder: 'X-Requesty-Agent',
										description: 'The header name, e.g. X-Requesty-Agent',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										placeholder: 'my-image-bot',
										description: 'The header value',
									},
								],
							},
						],
					},
					{
						displayName: 'Number of Images',
						name: 'n',
						type: 'number',
						default: 1,
						typeOptions: { minValue: 1, maxValue: 10 },
						description: 'The number of images to generate',
					},
					{
						displayName: 'Output Format',
						name: 'output_format',
						type: 'options',
						default: 'png',
						description: 'The file format of the generated image',
						options: [
							{ name: 'PNG', value: 'png' },
							{ name: 'JPEG', value: 'jpeg' },
							{ name: 'WebP', value: 'webp' },
						],
					},
					{
						displayName: 'Quality',
						name: 'quality',
						type: 'options',
						default: 'auto',
						description: 'The quality of the generated image',
						options: [
							{ name: 'Auto', value: 'auto' },
							{ name: 'High', value: 'high' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'Low', value: 'low' },
						],
					},
					{
						displayName: 'Return Image URLs',
						name: 'returnImageUrls',
						type: 'boolean',
						default: false,
						description:
							'Whether to return image URLs instead of binary data. When used as an AI Agent tool, URLs are more useful since the LLM receives the JSON output.',
					},
					{
						displayName: 'Size',
						name: 'size',
						type: 'options',
						default: '1024x1024',
						description: 'The size of the generated images',
						options: [
							{ name: '1024×1024', value: '1024x1024' },
							{ name: '1536×1024 (Landscape)', value: '1536x1024' },
							{ name: '1024×1536 (Portrait)', value: '1024x1536' },
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const credentials = await this.getCredentials('requestyApi');
				const model = this.getNodeParameter('model', i) as string;
				const prompt = this.getNodeParameter('prompt', i) as string;
				const options = this.getNodeParameter('options', i, {}) as ImageOptions;

				if (!prompt) {
					throw new NodeOperationError(this.getNode(), 'The Prompt parameter is required.', {
						itemIndex: i,
					});
				}

				const baseUrl =
					options.baseUrl || (credentials.baseUrl as string) || 'https://router.requesty.ai/v1';

				const returnUrls = options.returnImageUrls === true;

				const body: IDataObject = {
					model,
					prompt,
					response_format: returnUrls ? 'url' : 'b64_json',
				};

				if (options.size) body.size = options.size;
				if (options.quality && options.quality !== 'auto') body.quality = options.quality;
				if (options.n && options.n > 1) body.n = options.n;
				if (options.background && options.background !== 'auto')
					body.background = options.background;
				if (options.output_format && options.output_format !== 'png')
					body.output_format = options.output_format;

				const headers = buildHeaders(options.customHeaders);

				const requestOptions: IHttpRequestOptions = {
					method: 'POST',
					url: `${baseUrl}/images/generations`,
					body,
					headers,
					json: true,
				};

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'requestyApi',
					requestOptions,
				)) as ImageGenerationResponse;

				if (!response.data || !Array.isArray(response.data)) {
					throw new NodeOperationError(
						this.getNode(),
						'Unexpected response format from image generation API.',
						{ itemIndex: i },
					);
				}

				if (returnUrls) {
					for (const entry of response.data) {
						returnData.push({
							json: {
								url: entry.url,
								revised_prompt: entry.revised_prompt,
								model,
							},
							pairedItem: { item: i },
						});
					}
				} else {
					const outputFormat = options.output_format ?? 'png';
					const mimeType = MIME_TYPES[outputFormat] ?? 'image/png';

					for (let j = 0; j < response.data.length; j++) {
						const entry = response.data[j];
						if (!entry?.b64_json) {
							throw new NodeOperationError(
								this.getNode(),
								'Expected base64 image data in the response but got none.',
								{ itemIndex: i },
							);
						}

						const buffer = Buffer.from(entry.b64_json, 'base64');
						const binaryData = await this.helpers.prepareBinaryData(
							buffer,
							`image_${j}.${outputFormat}`,
							mimeType,
						);

						returnData.push({
							json: {
								revised_prompt: entry.revised_prompt,
								model,
							},
							binary: {
								data: binaryData,
							},
							pairedItem: { item: i },
						});
					}
				}
			} catch (error) {
				const nodeError =
					error instanceof NodeOperationError || error instanceof NodeApiError
						? error
						: new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });

				if (this.continueOnFail()) {
					returnData.push({
						json: { error: nodeError.message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw nodeError;
			}
		}

		return [returnData];
	}
}
