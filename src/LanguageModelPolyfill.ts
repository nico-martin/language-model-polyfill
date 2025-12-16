import TextGeneration from "./textGeneration/TextGeneration";
import { MODEL } from "./constants";
import { LanguageModelPolyfillMessage } from "./types";

class LanguageModelPolyfill extends EventTarget implements LanguageModel {
  private _inputUsage = 0;
  private _inputQuota = MODEL.maxTokens;
  private _topK = MODEL.params.defaultTopK;
  private _temperature = MODEL.params.defaultTemperature;
  private _destroyed = false;
  private model: TextGeneration = null;
  private inputs:
    | [LanguageModelSystemMessage, ...LanguageModelMessage[]]
    | LanguageModelMessage[] = [];
  public messages: Array<LanguageModelPolyfillMessage> = [];

  public onquotaoverflow: ((this: LanguageModel, ev: Event) => any) | null =
    null;

  get inputUsage(): number {
    return this._inputUsage;
  }
  get inputQuota(): number {
    return this._inputQuota;
  }
  get topK(): number {
    return this._topK;
  }
  get temperature(): number {
    return this._temperature;
  }

  private constructor() {
    super();
  }

  static async create(
    options?: Omit<
      LanguageModelCreateOptions,
      "tools" | "expectedInputs" | "expectedOutputs"
    >,
  ): Promise<LanguageModel> {
    const instance = new LanguageModelPolyfill();
    instance.model = new TextGeneration();

    // @ts-expect-error
    if (options?.tools || options?.expectedInputs || options?.expectedOutputs) {
      throw new Error(
        "tools, expectedInputs and expectedOutputs are not yet implemented",
      );
    }

    if (options?.topK !== undefined) {
      if (options.topK > MODEL.params.maxTopK) {
        throw new Error(`topK must be <= ${MODEL.params.maxTopK}`);
      }
      instance._topK = options.topK;
    }
    if (options?.temperature !== undefined) {
      if (options.temperature > MODEL.params.maxTemperature) {
        throw new Error(
          `temperature must be <= ${MODEL.params.maxTemperature}`,
        );
      }
      instance._temperature = options.temperature;
    }
    if (options?.initialPrompts) {
      instance.inputs = options.initialPrompts;
      instance.messages = options.initialPrompts.map((initialPrompt) => {
        return instance.convertLanguageModelMessage(initialPrompt);
      });
    }

    if (options?.signal) {
      options.signal.addEventListener("abort", () => {
        // todo: Implement abort signal handling when supported by Transformers.js (https://github.com/huggingface/transformers.js/issues/1182)
        throw new Error(
          "Unfortunately, LanguageModel initialization cannot be aborted in this polyfill. We're working on a solution.",
        );
      });
    }

    const isDownloaded =
      (await LanguageModelPolyfill.availability()) === "available";
    const monitor = instance.createProgressMonitor();
    options?.monitor?.(monitor);
    await instance.model.loadModel(({ percentage, total }) => {
      if (options?.monitor && !isDownloaded) {
        const event = new ProgressEvent("downloadprogress", {
          lengthComputable: true,
          loaded: percentage,
          total: total,
        });

        if (monitor.ondownloadprogress) {
          monitor.ondownloadprogress.call(monitor, event);
        }
        monitor.dispatchEvent(event);
      }
    });

    return instance;
  }

  async measureInputUsage(
    input: LanguageModelPrompt,
    options?: LanguageModelPromptOptions,
  ): Promise<number> {
    return await this.model.countTokens(
      this.convertLanguageModelMessages(input),
    );
  }

  private createProgressMonitor(): CreateMonitor {
    const monitor = new EventTarget() as CreateMonitor;
    monitor.ondownloadprogress = null;
    return monitor;
  }

  async prompt(
    input: LanguageModelPrompt,
    options?: LanguageModelPromptOptions,
  ): Promise<string> {
    this.ensureNotDestroyed();

    await this.append(input);

    const response = await this.model.prompt(
      this.messages,
      this._temperature,
      this._topK,
      options?.signal || new AbortController().signal,
      () => {},
    );

    await this.append([
      {
        role: "assistant",
        content: response.response,
      },
    ]);

    console.log(this.inputs);

    this._inputUsage += response.generationMetadata.totalTokens;

    return response.response;
  }

  promptStreaming(
    input: LanguageModelPrompt,
    options?: LanguageModelPromptOptions,
  ): ReadableStream<string> & AsyncIterable<string> {
    this.ensureNotDestroyed();

    const stream = new ReadableStream<string>({
      start: async (controller) => {
        try {
          await this.append(input);
          const response = await this.model.prompt(
            this.messages,
            this._temperature,
            this._topK,
            options?.signal || new AbortController().signal,
            (token) => {
              controller.enqueue(token);
            },
          );

          await this.append([
            {
              role: "assistant",
              content: response.response,
            },
          ]);

          this._inputUsage += response.generationMetadata.totalTokens;

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    const asyncIterable = {
      [Symbol.asyncIterator]: async function* () {
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            yield value;
          }
        } finally {
          reader.releaseLock();
        }
      },
    };

    return Object.assign(stream, asyncIterable);
  }

  async append(
    input: LanguageModelPrompt,
    options?: LanguageModelAppendOptions,
  ): Promise<undefined> {
    this.ensureNotDestroyed();
    this.messages.push(...this.convertLanguageModelMessages(input));
    this.inputs.push(...this.languageModelPromptToLanguageModelMessages(input));

    return undefined;
  }

  async clone(options?: LanguageModelCloneOptions): Promise<LanguageModel> {
    return LanguageModel.create({
      topK: this._topK,
      temperature: this._temperature,
      initialPrompts: this.inputs,
      ...options,
    });
  }

  static async availability(
    options?: LanguageModelCreateCoreOptions,
  ): Promise<Availability> {
    const instance = new TextGeneration();
    return instance.availability();
  }

  static async params(): Promise<LanguageModelParams> {
    return new Promise((resolve) => resolve(MODEL.params));
  }

  private ensureNotDestroyed(): void {
    if (this._destroyed) {
      throw new Error("LanguageModel has been destroyed");
    }
  }

  destroy(): undefined {
    this._destroyed = true;
    // Cleanup resources
    this.model.destroy();
    this.model = null;
    return undefined;
  }

  private convertLanguageModelMessage = (
    message: LanguageModelMessage | LanguageModelSystemMessage,
  ): LanguageModelPolyfillMessage => {
    let content = "";
    if (Array.isArray(message.content)) {
      const hasImageOrAudio = message.content.find(
        (c) => c.type === "image" || c.type === "audio",
      );
      if (hasImageOrAudio) {
        throw new Error(
          "Multimodal inputs are not yet supported by this polyfill",
        );
      }
      content = message.content
        .filter((c) => c.type === "text")
        .map((c) => c.value)
        .join("\n");
    } else {
      content = message.content;
    }
    return {
      role: message.role,
      content,
    };
  };

  private convertLanguageModelMessages = (
    messages: LanguageModelPrompt,
  ): Array<LanguageModelPolyfillMessage> =>
    this.languageModelPromptToLanguageModelMessages(messages).map((message) =>
      this.convertLanguageModelMessage(message),
    );

  private languageModelPromptToLanguageModelMessages = (
    prompt: LanguageModelPrompt,
  ): Array<LanguageModelMessage> =>
    typeof prompt === "string"
      ? [
          {
            role: "user",
            content: prompt,
          },
        ]
      : prompt;
}

export default LanguageModelPolyfill;
