# n8n-nodes-requesty

An n8n community node for using [Requesty](https://requesty.ai) hosted chat models in your n8n workflows.

Requesty is a unified AI gateway providing access to 300+ models from OpenAI, Anthropic, Google, Meta, Mistral, and more, all through a single OpenAI compatible API with intelligent routing, automatic fallbacks, and cost optimization.

[Installation](#installation) · [Credentials](#credentials) · [Usage](#usage) · [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

In your n8n instance, go to **Settings > Community Nodes** and install:

```
@requesty/n8n-nodes-requesty
```

## Credentials

1. Sign up at [app.requesty.ai](https://app.requesty.ai/sign-up)
2. Go to **Getting Started** and generate an API key at [app.requesty.ai/getting-started](https://app.requesty.ai/getting-started)
3. In n8n, create a new **Requesty API** credential and paste your key

## Usage

The **Requesty Chat Model** node connects to any of the 300+ models available through Requesty's unified gateway. Use it anywhere n8n accepts a chat model, such as the AI Agent node, Basic LLM Chain, or any AI workflow.

Once your API key is saved, the **Model** dropdown auto populates with all available models. You can also set it to a model ID directly using an expression (for example `anthropic/claude-sonnet-4-20250514` or `openai/gpt-4o`).

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| Response Format | Text | Text, JSON Object, or JSON Schema (strict structured output) |
| JSON Schema | (example) | The schema the response must match when Response Format is JSON Schema |
| Reasoning Effort | Default | Reasoning level (low, medium, high) for reasoning capable models |
| Base URL | (gateway) | Override the gateway URL for self hosted Requesty deployments |
| Enable Web Search | off | Give the model a native web search tool for up to date information |
| Web Search Context Size | medium | How much context the web search retrieves per query |
| Sampling Temperature | 0.7 | Controls randomness (0 is deterministic, 2 is very random) |
| Maximum Tokens | unlimited | Maximum number of tokens to generate |
| Top P | 1 | Nucleus sampling probability mass |
| Frequency Penalty | 0 | Penalizes token repetition |
| Presence Penalty | 0 | Penalizes already seen tokens |

### Key Features

- **300+ Models**: Access models from OpenAI, Anthropic, Google, Meta, Mistral, Cohere, and more
- **Responses API**: Built on the Responses API, unlocking richer capabilities than plain chat completions
- **Structured Output**: Enforce a strict JSON Schema server side (real structured output, not prompt engineered)
- **Native Web Search**: Let the model search the web for current information
- **Reasoning Control**: Tune reasoning effort for reasoning capable models
- **Intelligent Routing**: Automatic fallbacks and load balancing across providers
- **Self Hosted Friendly**: Point the node at your own Requesty deployment via the Base URL option

## Resources

- [Requesty Documentation](https://docs.requesty.ai)
- [Requesty Model Library](https://requesty.ai/models)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Development

```bash
npm install          # install dependencies
npm run build        # build the node
npm run dev          # run n8n locally with the node and hot reload
npm run lint         # lint
npm test             # run unit tests
```

## Publishing

Releases are published to npm automatically by GitHub Actions with npm provenance, using OIDC trusted publishing (no token required).

To release a new version:

1. Bump the version in `package.json`
2. Create a GitHub Release for the new version

The publish workflow then lints, builds, tests, and publishes the package.

## License

[MIT](LICENSE)
