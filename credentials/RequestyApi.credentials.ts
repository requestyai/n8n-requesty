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
			description:
				'Your Requesty API key. Find it at app.requesty.ai/getting-started',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://router.requesty.ai/v1',
			url: '/models',
		},
	};

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers ??= {};
		requestOptions.headers['Authorization'] = `Bearer ${credentials.apiKey}`;
		return requestOptions;
	}
}
