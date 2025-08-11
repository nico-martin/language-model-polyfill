import TransformersJsModel from "./languageModel/TransformersJsModel";

class LanguageModel extends EventTarget implements DestroyableModel {
  private static defaultParams: LanguageModelParams = {
    defaultTopK: 3,
    maxTopK: 8,
    defaultTemperature: 1,
    maxTemperature: 2,
  };
  private _inputUsage = 0;
  private _inputQuota = 1000;
  private _topK = 40;
  private _temperature = 0.7;
  private _destroyed = false;
  private model: TransformersJsModel;
  private _conversationHistory: Array<
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
    const instance = new LanguageModel();
    instance.model = new TransformersJsModel();
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

    //const usage = await this.measureInputUsage(input, options);
    //this.updateInputUsage(usage);

    const messages = this.processPromptInput(input);
    this._conversationHistory.push(...messages);

    const response = await this.model.prompt(
      this._conversationHistory,
      options,
    );

    this._conversationHistory.push({
      role: "assistant",
      content: response,
    });

    return response;
  }

  promptStreaming(
    input: LanguageModelPrompt,
    options?: LanguageModelPromptOptions,
  ): ReadableStream<string> {
    this.ensureNotDestroyed();

    return new ReadableStream({
      start: (controller) => {
        // Your streaming implementation
        const chunks = ["Hello", " ", "world", "!"];
        chunks.forEach((chunk) => {
          controller.enqueue(chunk);
        });
        controller.close();
      },
    });
  }

  async append(
    input: LanguageModelPrompt,
    options?: LanguageModelAppendOptions,
  ): Promise<undefined> {
    this.ensureNotDestroyed();

    // Your append implementation
    return undefined;
  }

  async measureInputUsage(
    input: LanguageModelPrompt,
    options?: LanguageModelPromptOptions,
  ): Promise<number> {
    // Calculate token usage - simplified example
    if (typeof input === "string") {
      return input.split(" ").length; // Rough word count
    }
    return 0;
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
    return TransformersJsModel.availability();
  }

  static async params(): Promise<LanguageModelParams> {
    return new Promise((resolve) => resolve(this.defaultParams));
  }

  private updateInputUsage(tokens: number): void {
    this._inputUsage += tokens;
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

  /*private combineWithInitialPrompts(
    messages: LanguageModelMessage[],
  ): LanguageModelMessage[] {
    if (!this._initialPrompts) {
      return messages;
    }

    // Convert initial prompts to regular messages for the model
    const convertedInitialPrompts = this._initialPrompts.map((msg) => {
      if ("role" in msg && msg.role === "system") {
        return {
          role: "user" as const,
          content: `System: ${typeof msg.content === "string" ? msg.content : "[complex content]"}`,
        };
      }
      return msg as LanguageModelMessage;
    });

    return [...convertedInitialPrompts, ...messages];
  }*/

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
