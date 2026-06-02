# n8n-nodes-requesty

An n8n community node for using [Requesty](https://requesty.ai)-hosted chat models in your n8n workflows.

Requesty is a unified AI gateway providing access to 300+ models from OpenAI, Anthropic, Google, Meta, Mistral, and more — all through a single OpenAI-compatible API with intelligent routing, automatic fallbacks, and cost optimization.

[Installation](#installation) | [Credentials](#credentials) | [Usage](#usage) | [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

In your n8n instance, go to **Settings > Community Nodes** and install:

```
@requestyai/n8n-nodes-requesty
```

## Credentials

1. Sign up at [app.requesty.ai](https://app.requesty.ai/sign-up)
2. Go to **Getting Started** and generate an API key at [app.requesty.ai/getting-started](https://app.requesty.ai/getting-started)
3. In n8n, create a new **Requesty API** credential and paste your key

## Usage

The **Requesty Chat Model** node connects to any of the 300+ models available through Requesty's unified gateway. Use it anywhere n8n accepts a chat model — e.g., the AI Agent node, Basic LLM Chain, or any AI workflow.

Once your API key is saved, the **Model** dropdown auto-populates with all available models. You can also set it to a model ID directly using an expression (e.g., `anthropic/claude-sonnet-4-20250514`, `openai/gpt-4o`).

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| Temperature | 0.7 | Controls randomness (0 = deterministic, 2 = very random) |
| Maximum Tokens | -1 | Max tokens to generate (-1 for no limit) |
| Top P | 1 | Nucleus sampling probability mass |
| Frequency Penalty | 0 | Penalizes token repetition (-2 to 2) |
| Presence Penalty | 0 | Penalizes already-seen tokens (-2 to 2) |

### Key Features

- **300+ Models**: Access models from OpenAI, Anthropic, Google, Meta, Mistral, Cohere, and more
- **Intelligent Routing**: Automatic fallbacks and load balancing across providers
- **Cost Optimization**: Track spending and optimize model selection
- **OpenAI-Compatible**: Drop-in replacement for any OpenAI-compatible integration
- **Zero Data Retention**: Optional ZDR-compliant model filtering

## Resources

- [Requesty Documentation](https://docs.requesty.ai)
- [Requesty Model Library](https://requesty.ai/models)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## Development

```bash
# Install dependencies
npm install

# Build the node
npm run build

# Run in development mode (starts n8n with hot reload)
npm run dev

# Lint
npm run lint
```

## Publishing

This package uses GitHub Actions with npm provenance for publishing. To release:

```bash
npm run release
```

This will lint, build, prompt for a version bump, commit, tag, and push — triggering the publish workflow.

## License

[MIT](LICENSE)
