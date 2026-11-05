import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class AdversusApi implements ICredentialType {
	name = 'adversusApi';
	icon: Icon = {
		light: 'file:../nodes/Adversus/adversus.svg',
		dark: 'file:../nodes/Adversus/adversus.svg',
	};
	displayName = 'Adversus API';
	documentationUrl = 'https://solutions.adversus.io/api';
	properties: INodeProperties[] = [
		{ displayName: 'Username', name: 'username', type: 'string', required: true, default: '' },
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			required: true,
			default: '',
			typeOptions: { password: true },
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: { username: '={{$credentials.username}}', password: '={{$credentials.password}}' },
		},
	};
	test: ICredentialTestRequest = {
		request: { baseURL: 'https://api.adversus.io/v1', url: '/organization', method: 'GET' },
	};
}
