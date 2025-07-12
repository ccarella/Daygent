import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'https://docs.github.com/public/schema.docs.graphql',
  documents: ['src/lib/github/**/*.ts'],
  generates: {
    'src/lib/github/generated/': {
      preset: 'client',
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
      ],
      config: {
        withHooks: true,
        withHOC: false,
        withComponent: false,
        strictScalars: true,
        scalars: {
          DateTime: 'string',
          GitObjectID: 'string',
          HTML: 'string',
          URI: 'string',
          GitTimestamp: 'string',
          PreciseDateTime: 'string',
        },
        enumsAsTypes: false,
        skipTypename: false,
        documentMode: 'documentNode',
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
};

export default config;