# Language Model Polyfill

A polyfill for Chrome's [Prompt API](https://developer.chrome.com/docs/ai/prompt-api) that provides `window.LanguageModel` support in browsers using [Transformers.js](https://huggingface.co/docs/transformers.js) and WebGPU.

> **⚠️ Early Preview**: This is an early preview release. Only core features are currently implemented.

## Features

- **Standards-compliant**: Implements the Chrome Prompt API interface
- **On-device inference**: Runs entirely in the browser using WebGPU
- **Streaming support**: Real-time token generation with `promptStreaming()`
- **Conversation history**: Maintains context across multiple prompts
- **Download progress**: Monitor model download progress
- **Abort support**: Cancel generation using `AbortController`
- **KV cache**: Optimized token generation with key-value caching

## Requirements

- **WebGPU support**: Your browser must support WebGPU
  - Chrome/Edge 113+
  - Check support at [caniuse.com/webgpu](https://caniuse.com/webgpu)
- **Storage**: ~2.6 GB for the default model (Qwen3-4B-ONNX)
- **Memory**: Sufficient RAM/VRAM for model inference

## Installation

```bash
npm install language-model-polyfill
```

## Usage

Load the polyfill only when `window.LanguageModel` is not available:

```javascript
import { LanguageModelPolyfill } from 'language-model-polyfill';

// Apply polyfill if native API is not available
if (!window.LanguageModel) {
  window.LanguageModel = LanguageModelPolyfill;
}

// Now use the standard Prompt API
const session = await window.LanguageModel.create();
const response = await session.prompt("Write a haiku about coding");
console.log(response);
```

### Using a CDN

```html
<script type="module">
  import { LanguageModelPolyfill } from 'https://cdn.jsdelivr.net/npm/language-model-polyfill/+esm';

  if (!('LanguageModel' in window)) {
    window.LanguageModel = LanguageModelPolyfill;
  }

  // Use the Prompt API as normal
  const session = await window.LanguageModel.create();
  // ...
</script>
```

### Using a CDN conditionally

For better performance, load the polyfill only when needed using dynamic imports:

```html
<script type="module">
  // Load polyfill only if native LanguageModel API is not available
  if (!('LanguageModel' in window)) {
    const { LanguageModelPolyfill } = await import('https://cdn.jsdelivr.net/npm/language-model-polyfill/+esm');
    window.LanguageModel = LanguageModelPolyfill;
  }

  // Now use the API (native or polyfilled)
  const session = await window.LanguageModel.create();
</script>
```

This approach ensures the polyfill is only downloaded and executed in browsers that don't have native support.

### Automatic Polyfill

For convenience, you can automatically apply the polyfill:

```javascript
import { LanguageModelPolyfill } from 'language-model-polyfill';

window.LanguageModel ??= LanguageModelPolyfill;

// Now just use window.LanguageModel
const availability = await window.LanguageModel.availability();
if (availability !== "unavailable") {
  const session = await window.LanguageModel.create();
  const result = await session.prompt("Hello!");
}
```

## API Documentation

This polyfill implements the standard Chrome Prompt API. For complete API documentation, see:

**[Chrome Prompt API Documentation](https://developer.chrome.com/docs/ai/prompt-api)**

## Supported Features

- ✅ `LanguageModel.create()`
- ✅ `LanguageModel.availability()`
- ✅ `session.prompt()`
- ✅ `session.promptStreaming()`
- ✅ Streaming with async iterators
- ✅ Conversation history (`initialPrompts`)
- ✅ Download progress monitoring
- ✅ `AbortSignal` support
- ✅ `temperature` and `topK` configuration
- ✅ `LanguageModel.append()`
- ✅ `LanguageModel.measureInputUsage()`

## Not Yet Supported

- ❌ [`LanguageModelCreateOptions.tools`](https://github.com/webmachinelearning/prompt-api?tab=readme-ov-file#tool-use)
- ❌ [`LanguageModelCreateOptions.expectedInputs` / `LanguageModelCreateOptions.expectedOutputs`](https://github.com/webmachinelearning/prompt-api?tab=readme-ov-file#multilingual-content-and-expected-input-languages)
- ❌ [`LanguageModelPromptOptions.responseConstraint`](https://github.com/webmachinelearning/prompt-api?tab=readme-ov-file#structured-output-with-json-schema-or-regexp-constraints)
- ❌ [Multimodal Inputs](https://developer.chrome.com/docs/ai/prompt-api#multimodal_capabilities) 

## Example

See [examples/simple-app](./examples/simple-app) for a complete working example.

## Model Information

- **Model**: `onnx-community/Qwen3-4B-ONNX`
- **Size**: ~2.6 GB
- **Quantization**: 4-bit floating point (q4f16)
- **Context Window**: 40,000 tokens

Model information:  
[https://huggingface.co/Qwen/Qwen3-4B](https://huggingface.co/Qwen/Qwen3-4B)

ONNX conversation:  
[https://huggingface.co/onnx-community/Qwen3-4B-ONNX](https://huggingface.co/onnx-community/Qwen3-4B-ONNX)

> In my opinion, the Qwen3 is currently the best model for general tasks. However, there are a few limitations. It does not support tool calls, structured output and multimodal input. For this reason, it has not yet been implemented. However, I can well imagine relying on newer models in the future to implement these functionalities.

## License

MIT © [Nico Martin](https://nico.dev)

## Links

- [Chrome Prompt API Documentation](https://developer.chrome.com/docs/ai/prompt-api)
- [GitHub Repository](https://github.com/nico-martin/language-model-polyfill)
- [NPM Package](https://www.npmjs.com/package/language-model-polyfill)