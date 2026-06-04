import type { INodeType, INodeTypeDescription, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { supplyModel, type ProviderTool } from '@n8n/ai-node-sdk';

type CustomHeader = { name?: string; value?: string };

type ModelOptions = {
	baseUrl?: string;
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	reasoningEffort?: '' | 'low' | 'medium' | 'high';
	enableWebSearch?: boolean;
	webSearchContextSize?: 'low' | 'medium' | 'high';
	customHeaders?: { header?: CustomHeader[] };
};

// Attribution headers identifying traffic as coming from the n8n Requesty
// community node. Always sent; can be overridden by user-supplied custom headers.
const ATTRIBUTION_HEADERS: Record<string, string> = {
	'HTTP-Referer': 'https://github.com/requestyai/n8n-requesty',
	'X-Title': 'n8n Requesty Community Node',
};

/**
 * Merges the default attribution headers with any user-supplied custom headers.
 * User headers take precedence on name collision (case-insensitively), so a user
 * can override the defaults. Empty names/values are skipped.
 */
function buildHeaders(customHeaders?: { header?: CustomHeader[] }): Record<string, string> {
	const headers: Record<string, string> = { ...ATTRIBUTION_HEADERS };

	for (const entry of customHeaders?.header ?? []) {
		const name = entry.name?.trim();
		if (!name || entry.value === undefined || entry.value === '') continue;

		// Drop any default whose name matches case-insensitively, then set the
		// user's header with their exact casing.
		const lower = name.toLowerCase();
		for (const key of Object.keys(headers)) {
			if (key.toLowerCase() === lower) delete headers[key];
		}
		headers[name] = entry.value;
	}

	return headers;
}

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
			baseURL:
				'={{ $parameter.options?.baseUrl || $credentials?.baseUrl || "https://router.requesty.ai/v1" }}',
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
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				default: 'text',
				description:
					'Force the model to return a specific format. JSON Schema enforces a strict schema (real structured output).',
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
				displayName: 'JSON Schema',
				name: 'jsonSchema',
				type: 'json',
				default:
					'{\n  "name": "response",\n  "strict": true,\n  "schema": {\n    "type": "object",\n    "properties": {\n      "answer": { "type": "string" }\n    },\n    "required": ["answer"],\n    "additionalProperties": false\n  }\n}',
				description:
					'The JSON Schema the response must match. Accepts a bare JSON Schema or a { name, strict, schema } wrapper.',
				typeOptions: { rows: 10 },
				displayOptions: { show: { responseFormat: ['json_schema'] } },
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
										placeholder: 'my-support-bot',
										description: 'The header value',
									},
								],
							},
						],
					},
					{
						displayName: 'Enable Web Search',
						name: 'enableWebSearch',
						type: 'boolean',
						default: false,
						description:
							'Whether to give the model a native web search tool so it can look up current information',
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
						default: '',
						description:
							'Controls how much reasoning a reasoning-capable model does before answering. Leave as Default to omit it; has no effect on models that do not support reasoning.',
						options: [
							{
								name: 'Default',
								value: '',
								description: 'Do not send a reasoning effort (let the model decide)',
							},
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
						description:
							'How much context the web search tool retrieves per query. Only used when Enable Web Search is on.',
						options: [
							{ name: 'Low', value: 'low' },
							{ name: 'Medium', value: 'medium' },
							{ name: 'High', value: 'high' },
						],
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
		const credentials = await this.getCredentials('requestyApi');
		const model = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as ModelOptions;

		// Response Format and JSON Schema are top-level parameters (not inside the
		// Options collection) so their conditional display and editor render correctly.
		const responseFormat = this.getNodeParameter('responseFormat', itemIndex, 'text') as
			| 'text'
			| 'json_object'
			| 'json_schema';
		const jsonSchemaRaw = this.getNodeParameter('jsonSchema', itemIndex, '') as string;

		const baseUrl =
			options.baseUrl || (credentials.baseUrl as string) || 'https://router.requesty.ai/v1';

		// Build the Responses API `text.format` for structured output.
		// On the Responses API, structured output is expressed via `text.format`
		// (not `response_format` like the Chat Completions API).
		let additionalParams: Record<string, unknown> | undefined;
		if (responseFormat === 'json_object') {
			additionalParams = { text: { format: { type: 'json_object' } } };
		} else if (responseFormat === 'json_schema') {
			const rawSchema = jsonSchemaRaw;
			if (rawSchema === undefined || rawSchema === null || rawSchema === '') {
				throw new NodeOperationError(
					this.getNode(),
					'Response Format is set to "JSON Schema" but no JSON Schema was provided. Add a schema in the JSON Schema field.',
				);
			}

			let parsedSchema: Record<string, unknown>;
			try {
				parsedSchema =
					typeof rawSchema === 'string'
						? (JSON.parse(rawSchema) as Record<string, unknown>)
						: (rawSchema as unknown as Record<string, unknown>);
			} catch {
				throw new NodeOperationError(
					this.getNode(),
					'The JSON Schema provided in the Response Format options is not valid JSON',
				);
			}

			if (typeof parsedSchema !== 'object' || parsedSchema === null) {
				throw new NodeOperationError(
					this.getNode(),
					'The JSON Schema provided in the Response Format options must be a JSON object',
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
			defaultHeaders: buildHeaders(options.customHeaders),
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
