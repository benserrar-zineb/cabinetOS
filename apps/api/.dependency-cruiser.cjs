module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Aucune dependance circulaire autorisee, a aucun niveau.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-cannot-import-business-or-integrations',
      severity: 'error',
      comment: 'Le Core Platform ne depend jamais de Business ni d Integrations.',
      from: { path: '^src/modules' },
      to: { path: '^src/(business|integrations)' },
    },
    {
      name: 'business-cannot-import-integrations',
      severity: 'error',
      comment: 'Business ne depend jamais d Integrations.',
      from: { path: '^src/business' },
      to: { path: '^src/integrations' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: ['.ts', '.js'],
    },
  },
};
