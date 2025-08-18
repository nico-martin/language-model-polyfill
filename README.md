# LanguageModel polyfill
A Polyfill for the Prompt API (window.LanguageModel) based on Transformers.js  
https://developer.chrome.com/docs/extensions/ai/prompt-api

!!! This is a very early preview. Only a few features are already implemented.

## Worker Setup Guide
It is recommended to use your own webworker together with the `webWorkerHandler`:

In your app you can use `LanguageModel.worker` to set your own worker, after that you can just use the `webWorkerHandler().onmessage` to handle the messages.
```jsx
// index.js
import { LanguageModel } from "language-model-polyfill";

LanguageModel.worker = new Worker(new URL("./worker.js", import.meta.url), {
    type: "module",
});
```

```jsx
//worker.js
import { webWorkerHandler } from "language-model-polyfill";
self.onmessage = webWorkerHandler().onmessage;
```