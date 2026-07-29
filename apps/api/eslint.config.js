const shared = require('../../packages/config/eslint.config.js');
const boundaries = require('eslint-plugin-boundaries');

module.exports = [
  ...shared,
  {
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
      'boundaries/elements': [
        { type: 'core', pattern: 'src/modules/*/**' },
        { type: 'business', pattern: 'src/business/*/**' },
        { type: 'integrations', pattern: 'src/integrations/*/**' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        2,
        {
          default: 'disallow',
          policies: [
            { from: { element: { type: 'core' } }, allow: { to: { element: { type: 'core' } } } },
            {
              from: { element: { type: 'business' } },
              allow: { to: { element: { types: { anyOf: ['core', 'business'] } } } },
            },
            {
              from: { element: { type: 'integrations' } },
              allow: {
                to: { element: { types: { anyOf: ['core', 'business', 'integrations'] } } },
              },
            },
          ],
        },
      ],
    },
  },
];
