import type {
    IDataObject,
    IExecuteFunctions,
    IHttpRequestMethods,
    ILoadOptionsFunctions,
    INodeExecutionData,
    INodePropertyOptions,
    INodeType,
    INodeTypeDescription,
    IRequestOptions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

interface IRequestyModel {
    id: string;
    name: string;
    description?: string;
    context_length: number;
    pricing: {
        prompt: string;
        completion: string;
    };
}

interface IRequestyResponse extends IDataObject {
    id: string;
    model: string;
    created: number;
    object: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    choices: Array<{
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
        index: number;
    }>;
}

export class Requesty implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Requesty',
        name: 'requesty',
        icon: 'file:requesty.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Interact with Requesty API',
        defaults: {
            name: 'Requesty',
        },
        inputs: '={{["main"]}}',
        outputs: '={{["main"]}}',
        credentials: [
            {
                name: 'requestyApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Chat',
                        value: 'chat',
                        description: 'Send a chat message',
                        action: 'Send a chat message',
                    },
                ],
                default: 'chat',
            },
            {
                displayName: 'Model Name or ID',
                name: 'model',
                type: 'options',
                noDataExpression: true,
                typeOptions: {
                    loadOptionsMethod: 'getModels',
                },
                required: true,
                default: '',
                description:
                    'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
            },
            {
                displayName: 'System Prompt',
                name: 'system_prompt',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                description: 'System message to set the behavior of the assistant',
                placeholder: 'You are a helpful assistant...',
            },
            {
                displayName: 'Message',
                name: 'message',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                description: 'The message to send to the chat model',
                required: true,
            },
            {
                displayName: 'Temperature',
                name: 'temperature',
                type: 'number',
                default: 0.9,
                description: 'What sampling temperature to use',
            },
            {
                displayName: 'Additional Fields',
                name: 'additionalFields',
                type: 'collection',
                placeholder: 'Add Field',
                default: {},
                options: [
                    {
                        displayName: 'Frequency Penalty',
                        name: 'frequency_penalty',
                        type: 'number',
                        default: 0,
                        description:
                            'Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency.',
                    },
                    {
                        displayName: 'Max Tokens',
                        name: 'max_tokens',
                        type: 'number',
                        default: 1000,
                        description: 'The maximum number of tokens to generate',
                    },
                    {
                        displayName: 'Presence Penalty',
                        name: 'presence_penalty',
                        type: 'number',
                        default: 0,
                        description:
                            'Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far.',
                    },
                    {
                        displayName: 'Top P',
                        name: 'top_p',
                        type: 'number',
                        default: 1,
                        description: 'An alternative to sampling with temperature, called nucleus sampling',
                    },
                ],
            },
        ],
    };

    methods = {
        loadOptions: {
            async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                const credentials = await this.getCredentials('requestyApi');
                const options: IRequestOptions = {
                    url: 'https://router.requesty.ai/v1/models',
                    headers: {
                        Authorization: `Bearer ${credentials.apiKey}`,
                        'HTTP-Referer': 'https://github.com/requestyai/n8n-requesty',
                        'X-Title': 'n8n Requesty Node',
                        'Content-Type': 'application/json',
                    },
                    method: 'GET' as IHttpRequestMethods,
                    json: true,
                };

                try {
                    const response = await this.helpers.request(options);

                    // Debug log to help investigate issues
                    console.log('Requesty API Response:', JSON.stringify(response, null, 2));

                    if (!response?.data || !Array.isArray(response.data)) {
                        throw new NodeOperationError(this.getNode(), 'Invalid response format from Requesty API');
                    }

                    // Create a safer description function
                    const formatDescription = (model: IRequestyModel): string => {
                        try {
                            const desc = model.description || 'No description available';
                            let pricingInfo = '';

                            if (model.pricing && typeof model.pricing === 'object') {
                                try {
                                    const promptPrice = parseFloat(String(model.pricing.prompt)) * 1000000;
                                    const completionPrice = parseFloat(String(model.pricing.completion)) * 1000000;

                                    if (!isNaN(promptPrice) && !isNaN(completionPrice)) {
                                        pricingInfo = ` - Price: $${promptPrice.toFixed(
                                            2
                                        )}/1M tokens (prompt), $${completionPrice.toFixed(2)}/1M tokens (completion)`;
                                    }
                                } catch (e) {
                                    console.log('Error parsing pricing for model:', model.id, e);
                                }
                            }

                            return (desc + pricingInfo).trim();
                        } catch (e) {
                            console.error('Error formatting description for model:', model.id, e);
                            return 'Error formatting description';
                        }
                    };

                    // Filter and map the models with less strict validation
                    const models = response.data
                        .filter((model: IRequestyModel) => {
                            // Only require ID to be present
                            const valid = Boolean(model.id);
                            if (!valid) {
                                console.log('Filtering out invalid model (missing ID):', model);
                            }
                            return valid;
                        })
                        .map((model: IRequestyModel) => ({
                            // Use ID as name if name is missing
                            name: model.name || model.id,
                            value: model.id,
                            description: formatDescription(model),
                        }))
                        .sort((a: INodePropertyOptions, b: INodePropertyOptions) => a.name.localeCompare(b.name));

                    if (models.length === 0) {
                        throw new NodeOperationError(this.getNode(), 'No models found in Requesty API response');
                    }

                    console.log('Processed models:', models);
                    return models;
                } catch (error) {
                    console.error('Error loading models from Requesty API:', error);
                    throw new NodeOperationError(this.getNode(), `Failed to load models: ${(error as Error).message}`);
                }
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        const credentials = await this.getCredentials('requestyApi');
        if (!credentials?.apiKey) {
            throw new NodeOperationError(this.getNode(), 'No valid API key provided');
        }

        for (let i = 0; i < items.length; i++) {
            try {
                const operation = this.getNodeParameter('operation', i) as string;
                const model = this.getNodeParameter('model', i) as string;
                const systemPrompt = this.getNodeParameter('system_prompt', i, '') as string;
                const message = this.getNodeParameter('message', i) as string;
                const temperature = this.getNodeParameter('temperature', i) as number;
                const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

                if (operation === 'chat') {
                    const messages = [];

                    // Add system message if provided
                    if (systemPrompt) {
                        messages.push({
                            role: 'system',
                            content: systemPrompt,
                        });
                    }

                    // Add user message
                    messages.push({
                        role: 'user',
                        content: message,
                    });

                    const requestBody = {
                        model,
                        messages,
                        temperature,
                        ...additionalFields,
                    };

                    const options: IRequestOptions = {
                        url: 'https://router.requesty.ai/v1/chat/completions',
                        headers: {
                            Authorization: `Bearer ${credentials.apiKey}`,
                            'HTTP-Referer': 'https://github.com/requestyai/n8n-requesty',
                            'X-Title': 'n8n Requesty Node',
                            'Content-Type': 'application/json',
                        },
                        method: 'POST' as IHttpRequestMethods,
                        body: requestBody,
                        json: true,
                    };

                    const response = await this.helpers.request(options);

                    if (!response?.choices?.[0]?.message?.content) {
                        throw new NodeOperationError(this.getNode(), 'Invalid response format from Requesty API');
                    }

                    const typedResponse = response as IRequestyResponse;
                    const messageContent = typedResponse.choices[0].message.content.trim();

                    returnData.push({
                        json: {
                            response: messageContent,
                        },
                        pairedItem: { item: i },
                    });
                }
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: (error as Error).message,
                        },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw error;
            }
        }

        return [returnData];
    }
}
