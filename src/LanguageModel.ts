import TransformersJsModel from "./languageModel/TransformersJsModel";
import { ModelUsage } from "./languageModel/worker/types";
import { ModelIds } from "./constants";

class LanguageModel extends EventTarget implements DestroyableModel {
  private static defaultParams: LanguageModelParams = {
    defaultTopK: 3,
    maxTopK: 8,
    defaultTemperature: 1,
    maxTemperature: 2,
  };
  public static model_id: ModelIds = "SmolLM3-3B";
  public static worker: Worker;
  private _inputUsage = 0;
  private _inputQuota = 0;
  private _topK = LanguageModel.defaultParams.defaultTopK;
  private _temperature = LanguageModel.defaultParams.defaultTemperature;
  private _destroyed = false;
  private model: TransformersJsModel;
  private _conversationHistory: Array<
    LanguageModelMessage | LanguageModelSystemMessage
  > = [];
  private _latestUsage: ModelUsage = null;

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

  get latestUsage(): ModelUsage {
    return this._latestUsage;
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
    const instance = new LanguageModel();
    instance.model = new TransformersJsModel(this.worker, this.model_id);
    instance._inputQuota = instance.model.maxToken;

    // @ts-expect-error
    if (options?.tools || options?.expectedInputs || options?.expectedOutputs) {
      throw new Error(
        "tools, expectedInputs and expectedOutputs are not yet implemented",
      );
    }

    if (options?.topK !== undefined) {
      instance._topK = options.topK;
    }
    if (options?.temperature !== undefined) {
      instance._temperature = options.temperature;
    }
    if (options?.initialPrompts) {
      instance._conversationHistory = options.initialPrompts;
    }

    if (options?.monitor) {
      const monitor = instance.createProgressMonitor();
      options.monitor(monitor);
      await instance.model.loadModel(monitor, options?.signal);
    } else {
      await instance.model.loadModel(undefined, options?.signal);
    }

    // build the KVCache
    const response = await instance.model.prompt(
      instance._conversationHistory,
      instance._temperature,
      instance._topK,
      true,
      () => {},
      {
        signal: options?.signal,
      },
    );
    instance.updateUsage(response.usage);
    instance._conversationHistory = response.messages as LanguageModelMessage[];

    return instance;
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

    const messages = this.processPromptInput(input);
    this._conversationHistory.push(...messages);

    const response = await this.model.prompt(
      this._conversationHistory,
      this._temperature,
      this._topK,
      false,
      () => {},
      options,
    );

    this.updateUsage(response.usage);
    this._conversationHistory = response.messages as LanguageModelMessage[];

    return response.response;
  }

  promptStreaming(
    input: LanguageModelPrompt,
    options?: LanguageModelPromptOptions,
  ): ReadableStream<string> & AsyncIterable<string> {
    this.ensureNotDestroyed();

    const messages = this.processPromptInput(input);
    this._conversationHistory.push(...messages);

    const stream = new ReadableStream<string>({
      start: async (controller) => {
        try {
          const response = await this.model.prompt(
            this._conversationHistory,
            this._temperature,
            this._topK,
            false,
            (token_generated) => {
              controller.enqueue(token_generated);
            },
            options,
          );

          this.updateUsage(response.usage);
          this._conversationHistory =
            response.messages as LanguageModelMessage[];

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

    // Your append implementation
    return undefined;
  }

  async clone(options?: LanguageModelCloneOptions): Promise<LanguageModel> {
    return LanguageModel.create({
      topK: this._topK,
      temperature: this._temperature,
      ...options,
    });
  }

  static async availability(
    options?: LanguageModelCreateCoreOptions,
  ): Promise<Availability> {
    const instance = new TransformersJsModel(this.worker, this.model_id);
    return instance.availability();
  }

  static async params(): Promise<LanguageModelParams> {
    return new Promise((resolve) => resolve(this.defaultParams));
  }

  private updateUsage(usage: ModelUsage): void {
    this._inputUsage = usage.total_tokens;
    this._latestUsage = usage;
    if (this._inputUsage > this._inputQuota && this.onquotaoverflow) {
      const event = new Event("quotaoverflow");
      this.onquotaoverflow.call(this, event);
      this.dispatchEvent(event);
    }
  }

  private ensureNotDestroyed(): void {
    if (this._destroyed) {
      throw new Error("LanguageModel has been destroyed");
    }
  }

  destroy(): undefined {
    this._destroyed = true;
    // Cleanup resources
    this.model = null;
    return undefined;
  }

  private processPromptInput(
    input: LanguageModelPrompt,
  ): LanguageModelMessage[] {
    if (typeof input === "string") {
      // Convert string to message format
      return [
        {
          role: "user",
          content: input,
        },
      ];
    }
    return input;
  }
}

export default LanguageModel;
