import TextGeneration from "./textGeneration/TextGeneration";

class LanguageModelPolyfill extends EventTarget implements LanguageModel {
  private static defaultParams: LanguageModelParams = {
    defaultTopK: 3,
    maxTopK: 8,
    defaultTemperature: 1,
    maxTemperature: 2,
  };
  private _inputUsage = 0;
  private _inputQuota = 0;
  private _topK = LanguageModelPolyfill.defaultParams.defaultTopK;
  private _temperature = LanguageModelPolyfill.defaultParams.defaultTemperature;
  private _destroyed = false;
  private model: TextGeneration = null;
  public _conversationHistory: Array<
    LanguageModelMessage | LanguageModelSystemMessage
  > = [];

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
      instance._topK = options.topK;
    }
    if (options?.temperature !== undefined) {
      instance._temperature = options.temperature;
    }
    if (options?.initialPrompts) {
      instance._conversationHistory = options.initialPrompts;
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
    // TODO
    console.error("measureInputUsage not yet implemented", input, options);
    return 0;
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
      options.signal,
      () => {},
    );

    this._conversationHistory.push({
      role: "assistant",
      content: response.response,
    });

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
            options.signal,
            (token) => {
              controller.enqueue(token);
            },
          );

          this._conversationHistory.push({
            role: "assistant",
            content: response.response,
          });

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
    const instance = new TextGeneration();
    return instance.availability();
  }

  static async params(): Promise<LanguageModelParams> {
    return new Promise((resolve) => resolve(this.defaultParams));
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

export default LanguageModelPolyfill;
