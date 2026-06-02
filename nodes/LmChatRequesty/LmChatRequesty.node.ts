import type { INodeType, INodeTypeDescription, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { supplyModel, type ProviderTool } from '@n8n/ai-node-sdk';

type ModelOptions = {
	baseUrl?: string;
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	responseFormat?: 'text' | 'json_object' | 'json_schema';
	jsonSchema?: string;
	reasoningEffort?: 'low' | 'medium' | 'high';
	enableWebSearch?: boolean;
	webSearchContextSize?: 'low' | 'medium' | 'high';
};

export class LmChatRequesty implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Requesty Chat Model',
		name: 'lmChatRequesty',
		icon: 'file:../../icons/requesty.svg',
		group: ['transform'],
		version: [1],
		description: 'Use 300+ AI models through Requesty unified gateway',
		subtitle: '={{$parameter["model"]}}',
		defaults: {
			name: 'Requesty Chat Model',
		},
		codex: {
			categories: ['assistant'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.requesty.ai',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'requestyApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL: '={{ $parameter.options?.baseUrl || "https://router.requesty.ai/v1" }}',
		},
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				description:
					'The model to use. Choose from the list, or specify a model ID using an expression.',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '/models',
							},
							output: {
								postReceive: [
									{ type: 'rootProperty', properties: { property: 'data' } },
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.id}}',
											value: '={{$responseItem.id}}',
										},
									},
									{ type: 'sort', properties: { key: 'name' } },
								],
							},
						},
					},
				},
				default: '',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Base URL',
						name: 'baseUrl',
						type: 'string',
						default: '',
						placeholder: 'https://router.requesty.ai/v1',
						description:
							'Override the Requesty gateway URL. Use this to point the node at a self-hosted Requesty deployment. Leave empty to use the default gateway.',
					},
					{
						displayName: 'Enable Web Search',
						name: 'enableWebSearch',
						type: 'boolean',
						default: false,
						description:
							'Whether to give the model a native web search tool so it can look up current information. Works best with the Responses API enabled.',
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						description:
							'Penalizes new tokens based on their existing frequency in the text so far, decreasing the likelihood of repetition',
						type: 'number',
					},
					{
						displayName: 'JSON Schema',
						name: 'jsonSchema',
						type: 'json',
						default:
							'{\n  "name": "response",\n  "strict": true,\n  "schema": {\n    "type": "object",\n    "properties": {\n      "answer": { "type": "string" }\n    },\n    "required": ["answer"],\n    "additionalProperties": false\n  }\n}',
						description:
							'The JSON Schema the response must match. Used only when Response Format is "JSON Schema".',
						typeOptions: { rows: 8 },
						displayOptions: { show: { responseFormat: ['json_schema'] } },
					},
					{
						displayName: 'Maximum Tokens',
						name: 'maxTokens',
						default: -1,
						typeOptions: { minValue: -1 },
						description:
							'The maximum number of tokens to generate in the response. Set to -1 for no limit.',
						type: 'number',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						description:
							'Penalizes new tokens based on whether they appear in the text so far, increasing the likelihood of talking about new topics',
						type: 'number',
					},
					{
						displayName: 'Reasoning Effort',
						name: 'reasoningEffort',
						type: 'options',
						default: 'medium',
						description:
							'Controls how much reasoning a reasoning-capable model does before answering. Has no effect on models that do not support reasoning.',
						options: [
							{
								name: 'Low',
								value: 'low',
								description: 'Favor speed and lower token usage',
							},
							{ name: 'Medium', value: 'medium', description: 'Balanced reasoning' },
							{
								name: 'High',
								value: 'high',
								description: 'Favor more complete reasoning at higher cost and latency',
							},
						],
					},
					{
						displayName: 'Response Format',
						name: 'responseFormat',
						type: 'options',
						default: 'text',
						description:
							'Force the model to return a specific format. JSON Schema enforces a strict schema (real structured output) and requires the JSON Schema field below.',
						options: [
							{ name: 'Text', value: 'text', description: 'Plain text response (default)' },
							{
								name: 'JSON Object',
								value: 'json_object',
								description: 'Force a syntactically valid JSON object',
							},
							{
								name: 'JSON Schema',
								value: 'json_schema',
								description:
									'Force the response to strictly match the JSON Schema you provide (structured output)',
							},
						],
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						description:
							'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
						type: 'number',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						default: 1,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						description:
							'An alternative to sampling with temperature, called nucleus sampling. The model considers tokens with top_p probability mass.',
						type: 'number',
					},
					{
						displayName: 'Web Search Context Size',
						name: 'webSearchContextSize',
						type: 'options',
						default: 'medium',
						description: 'How much context the web search tool retrieves per query',
						options: [
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'High', value: 'high' },
						],
						displayOptions: { show: { enableWebSearch: [true] } },
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
		const credentials = await this.getCredentials('requestyApi');
		const model = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as ModelOptions;

		const baseUrl = options.baseUrl || 'https://router.requesty.ai/v1';

		// Build the Responses API `text.format` for structured output.
		// On the Responses API, structured output is expressed via `text.format`
		// (not `response_format` like the Chat Completions API).
		let additionalParams: Record<string, unknown> | undefined;
		if (options.responseFormat === 'json_object') {
			additionalParams = { text: { format: { type: 'json_object' } } };
		} else if (options.responseFormat === 'json_schema') {
			let parsedSchema: Record<string, unknown>;
			try {
				parsedSchema =
					typeof options.jsonSchema === 'string'
						? (JSON.parse(options.jsonSchema) as Record<string, unknown>)
						: (options.jsonSchema as unknown as Record<string, unknown>);
			} catch {
				throw new NodeOperationError(
					this.getNode(),
					'The JSON Schema provided in the Response Format options is not valid JSON',
				);
			}

			// Accept either a bare schema or a full { name, strict, schema } wrapper.
			const hasWrapper = 'schema' in parsedSchema;
			additionalParams = {
				text: {
					format: {
						type: 'json_schema',
						name: hasWrapper ? ((parsedSchema.name as string) ?? 'response') : 'response',
						strict: hasWrapper ? (parsedSchema.strict as boolean) ?? true : true,
						schema: hasWrapper ? parsedSchema.schema : parsedSchema,
					},
				},
			};
		}

		// Build the native web search provider tool. Kept minimal so it works
		// uniformly across the different providers behind the Requesty gateway.
		const providerTools: ProviderTool[] = [];
		if (options.enableWebSearch) {
			providerTools.push({
				type: 'provider',
				name: 'web_search',
				args: { search_context_size: options.webSearchContextSize ?? 'medium' },
			});
		}

		return supplyModel(this, {
			type: 'openai',
			baseUrl,
			apiKey: credentials.apiKey as string,
			model,
			temperature: options.temperature,
			maxTokens: options.maxTokens,
			topP: options.topP,
			frequencyPenalty: options.frequencyPenalty,
			presencePenalty: options.presencePenalty,
			// The Requesty node always uses the Responses API, which unlocks
			// structured output via text.format and native built-in tools.
			useResponsesApi: true,
			reasoning: options.reasoningEffort ? { effort: options.reasoningEffort } : undefined,
			additionalParams,
			providerTools: providerTools.length ? providerTools : undefined,
		});
	}
}
