import { CheckCircle2, Clock3, Server, ShieldCheck } from 'lucide-react';
import type { CheckFormState, MetricCardConfig } from '../../types';

export const sampleSpec = `openapi: 3.0.0
paths:
  /users/{id}:
    get:
      responses:
        '200':
          description: User response
          content:
            application/json:
              schema:
                type: object
                required: [id, name]
                properties:
                  id:
                    type: number
                  name:
                    type: string
                  email:
                    type: string
                  profile:
                    type: object
                    properties:
                      title:
                        type: string
                      timezone:
                        type: string
                  groups:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        label:
                          type: string
`;

export const initialState: CheckFormState = {
  url: 'https://jsonplaceholder.typicode.com/users/1',
  authType: 'none',
  token: '',
  cookie: '',
  headerName: 'X-API-Key',
  headerValue: '',
  yamlSpec: sampleSpec,
};

export const metricCards: MetricCardConfig[] = [
  {
    icon: ShieldCheck,
    label: 'Response validity',
    getValue: (result) => (result ? (result.valid ? 'Valid' : 'Invalid') : 'Idle'),
    getTone: (result) => (result ? (result.valid ? 'good' : 'bad') : 'neutral'),
  },
  {
    icon: CheckCircle2,
    label: 'Response Data Coverage',
    getValue: (result) => (result ? `${result.coveragePercent}%` : '--'),
    getTone: (_result, health) => health,
    getMeter: (result) => result?.coveragePercent ?? 0,
  },
  {
    icon: Server,
    label: 'HTTP status',
    getValue: (result) => result?.status ?? '--',
    getTone: (result) => (result?.ok ? 'good' : result ? 'warn' : 'neutral'),
  },
  {
    icon: Clock3,
    label: 'Response time',
    getValue: (result) => (result ? `${result.responseTimeMs}ms` : '--'),
    getTone: () => 'cool',
  },
];
