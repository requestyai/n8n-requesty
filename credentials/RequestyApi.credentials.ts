import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class RequestyApi implements ICredentialType {
	name = 'requestyApi';

	displayName = 'Requesty API';

	icon: Icon = 'file:../icons/requesty.svg';

	documentationUrl = 'https://docs.requesty.ai';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Your Requesty API key. Find it at app.requesty.ai/getting-started',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://router.requesty.ai/v1',
			description:
				'The Requesty gateway URL. Change this only if you use a self-hosted Requesty deployment.',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl || "https://router.requesty.ai/v1" }}',
			url: '/models',
		},
	};

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers ??= {};
		requestOptions.headers['Authorization'] = `Bearer ${credentials.apiKey}`;
		// Attribution headers identifying traffic from the n8n Requesty community node.
		requestOptions.headers['HTTP-Referer'] = 'https://github.com/requestyai/n8n-requesty';
		requestOptions.headers['X-Title'] = 'n8n Requesty Community Node';
		return requestOptions;
	}
}
