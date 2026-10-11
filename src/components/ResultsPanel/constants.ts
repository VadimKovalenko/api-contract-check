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
    tone: 'optional',
  },
  {
    title: 'Unlisted fields',
    key: 'unlistedFields',
    emptyText: 'No response fields are outside the documented schema properties.',
    tone: 'unlisted',
  },
  {
    title: 'Present fields',
    key: 'presentFields',
    emptyText: 'No documented fields were found.',
    tone: 'present',
  },
];
