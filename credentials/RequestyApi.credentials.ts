import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class RequestyApi implements ICredentialType {
	name = 'requestyApi';
	displayName = 'Requesty API';
	documentationUrl = 'https://github.com/requestyai/n8n-requesty';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
