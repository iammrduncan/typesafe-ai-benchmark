# typesafe-ai-mimic

A planned TypeScript structured-judgment proxy with an **OpenAI-compatible HTTP
API**, backed by Cerebras. The endpoint is `POST /v1/chat/completions`:

- `messages` supplies context and instructions.
- `response_format.json_schema` supplies the output contract.
- `choices[0].message.content` contains JSON validated against that contract.

Choice, Score, and Noul are supported through schema recipes inspired by TypeSafe.
This independent implementation does not run TypeSafe models or claim equivalent
calibration or performance. Model-written probabilities are self-reported estimates.

**Current status: documentation and project scaffold only.** The HTTP server and
inference path are not implemented yet. The first planned API supports text
messages and strict structured output; streaming and tools are deferred.

## Documentation

- [Implementation plan](docs/plan.md)
- [Examples and OpenAI SDK usage](docs/examples.md)
- [HTTP API specification](docs/context/api_reference.txt)
- [Engineering conventions](CONVENTIONS.md) — the plan records the user-directed
  replacement of its TypeSafe wire target with OpenAI Chat Completions.

## Development setup

Use Node.js 22 (an up-to-date patch release) and npm 10. `.nvmrc` selects Node 22;
the manifest records the supported versions. No API key is needed for setup.

```sh
nvm use
npm ci
npm run check
npm start
```

`nvm use` is optional if Node 22 is already selected. `npm start` requires the build
created by `npm run check` or `npm run build`; it prints a scaffold notice and exits.

| Command | Current behavior |
| --- | --- |
| `npm run dev` | Watch and run the TypeScript placeholder. |
| `npm run typecheck` | Check source and test types without emitting files. |
| `npm run lint` | ESLint, with warnings treated as failures. |
| `npm test` | Run Node's test runner; one explicit TODO, no behavior tests yet. |
| `npm run build` | Compile production source to `dist/`, excluding tests. |
| `npm start` | Run the compiled placeholder; no server is started. |
| `npm run check` | Typecheck, lint, test runner, then build. |

`.env.example` documents future settings and placeholder credentials. The scaffold
does not load it. Local `.env` variants, dependency installs, build output, and
logs are ignored. Production dependencies will be added with their implementation
slices; there is no benchmark command or inference integration yet.
