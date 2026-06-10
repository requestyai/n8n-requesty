# n8n-nodes-requesty

An n8n community node for using [Requesty](https://requesty.ai) hosted chat models and image generation in your n8n workflows.

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
| Custom Headers | (none) | Extra HTTP headers sent with every request, e.g. `X-Requesty-Agent` to tag and track a workflow |
| Enable Web Search | off | Give the model a native web search tool for up to date information |
| Web Search Context Size | medium | How much context the web search retrieves per query |
| Sampling Temperature | 0.7 | Controls randomness (0 is deterministic, 2 is very random) |
| Maximum Tokens | unlimited | Maximum number of tokens to generate |
| Top P | 1 | Nucleus sampling probability mass |
| Frequency Penalty | 0 | Penalizes token repetition |
| Presence Penalty | 0 | Penalizes already seen tokens |

### Custom Headers

Every request to Requesty is tagged with `HTTP-Referer` and `X-Title` headers so traffic is attributed to this n8n community node. You can add your own headers under **Options → Custom Headers** to tag and track individual workflows — for example:

| Header | Example value |
|--------|---------------|
| `X-Requesty-Agent` | `my-support-bot` |
| `X-Requesty-Environment` | `production` |
| `X-Requesty-Team` | `platform` |

These show up in your Requesty dashboard so you can break down usage by agent, environment, or team. Setting `HTTP-Referer` or `X-Title` as a custom header overrides the node defaults.

### Image Generation

The **Requesty Image Generation** node generates images from text prompts using models available through Requesty's gateway (such as `azure/openai/gpt-image-1`). Use it in any workflow, or attach it as a tool to an AI Agent.

By default the node outputs binary image data (previewable in the n8n output panel and usable by downstream nodes like Write Binary File or HTTP Request). Enable **Return Image URLs** to get URLs in the JSON output instead.

#### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| Model | `azure/openai/gpt-image-1` | The model to use for image generation |
| Prompt | (required) | A text description of the desired image |
| Size | `1024x1024` | Image dimensions: `1024x1024`, `1536x1024`, or `1024x1536` |
| Quality | `auto` | Image quality: `auto`, `high`, `medium`, or `low` |
| Number of Images | 1 | How many images to generate (1–10) |
| Background | `auto` | Background type: `auto`, `transparent`, or `opaque` |
| Output Format | `png` | File format: `png`, `jpeg`, or `webp` |
| Return Image URLs | off | Return URLs instead of binary image data |
| Base URL | (gateway) | Override the gateway URL for self hosted deployments |
| Custom Headers | (none) | Extra HTTP headers for tagging and tracking |

#### Using as an AI Agent Tool

The node can be used as an AI Agent tool:

1. Ensure your n8n instance has the environment variable `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`
2. Add the **Requesty Image Generation** node to your workflow
3. Connect it to the AI Agent's **Tools** input
4. The agent decides when and how to generate images based on user requests

When used as a tool, consider enabling **Return Image URLs** so the agent receives URLs it can reference in its response.


### Key Features

- **300+ Models**: Access models from OpenAI, Anthropic, Google, Meta, Mistral, Cohere, and more
- **Responses API**: Built on the Responses API, unlocking richer capabilities than plain chat completions
- **Structured Output**: Enforce a strict JSON Schema server side (real structured output, not prompt engineered)
- **Native Web Search**: Let the model search the web for current information
- **Image Generation**: Generate images from text prompts, usable as a regular node or as an AI Agent tool
- **Reasoning Control**: Tune reasoning effort for reasoning capable models
- **Custom Headers**: Tag and track workflows with `X-Requesty-Agent`, `X-Requesty-Environment`, `X-Requesty-Team`, and more
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
