import type { INodeType, INodeTypeDescription, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { supplyModel } from '@n8n/ai-node-sdk';

type ModelOptions = {
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
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
			baseURL: 'https://router.requesty.ai/v1',
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
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number) {
		const credentials = await this.getCredentials('requestyApi');
		const model = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as ModelOptions;

		return supplyModel(this, {
			type: 'openai',
			baseUrl: 'https://router.requesty.ai/v1',
			apiKey: credentials.apiKey as string,
			model,
			temperature: options.temperature,
			maxTokens: options.maxTokens,
			topP: options.topP,
			frequencyPenalty: options.frequencyPenalty,
			presencePenalty: options.presencePenalty,
		});
	}
}
