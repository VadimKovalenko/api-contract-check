import type { ResultListConfig } from '../../types';

export const resultLists: ResultListConfig[] = [
  {
    title: 'Missing required fields',
    key: 'missingRequiredFields',
    emptyText: 'No required documented fields are missing.',
    tone: 'missing',
  },
  {
    title: 'Missing optional fields',
    key: 'missingOptionalFields',
    emptyText: 'No optional documented fields are missing.',
    infoText: 'These are fields that we have in the YAML schema but do not receive in the response.',
    tone: 'optional',
  },
  {
    title: 'Unlisted fields',
    key: 'unlistedFields',
    emptyText: 'No response fields are outside the documented schema properties.',
    infoText: 'We got these fields in the response, but they are not listed in the YAML schema.',
    tone: 'unlisted',
  },
  {
    title: 'Present fields',
    key: 'presentFields',
    emptyText: 'No documented fields were found.',
    tone: 'present',
  },
];
