import {
  PreTrainedTokenizer,
  PreTrainedModel,
  AutoTokenizer,
  AutoModelForCausalLM,
  Tensor,
  Message,
  TextStreamer,
  InterruptableStoppingCriteria,
} from "@huggingface/transformers";
import { MODEL } from "../constants";
import calculateDownloadProgress from "./utils/calculateDownloadProgress";
import isFileInCache from "./utils/isFileInCache";
import { LanguageModelPolyfillMessage } from "../types";

interface Pipeline {
  tokenizer: PreTrainedTokenizer;
  model: PreTrainedModel;
}

export default class TextGeneration {
  private pipeline: Pipeline = null;
  private cache: { pastKeyValues: any | null; key: string } = {
    pastKeyValues: null,
    key: "",
  };
  private stoppingCriteria: any | null = null;

  public constructor() {
    this.cache = { pastKeyValues: null, key: "" };
    this.stoppingCriteria = new InterruptableStoppingCriteria();
  }

  public loadModel = async (
    onDownloadProgress: (data: {
      percentage: number;
      total: number;
      loaded: number;
    }) => void,
  ): Promise<Pipeline> => {
    if (this.pipeline) {
      return this.pipeline;
    }

    const expectedFilesMap = new Map<
      string,
      { loaded: number; total: number }
    >();
    for (const [fileName, total] of Object.entries(MODEL.expectedFiles)) {
      expectedFilesMap.set(fileName, { loaded: 0, total });
    }

    const [tokenizer, model] = await Promise.all([
      AutoTokenizer.from_pretrained(MODEL.id),
      AutoModelForCausalLM.from_pretrained(MODEL.id, {
        dtype: MODEL.dtype,
        device: "webgpu",
        progress_callback: calculateDownloadProgress(
          ({ percentage, total, loaded }) =>
            onDownloadProgress({ percentage, total, loaded }),
          expectedFilesMap,
        ),
      }),
    ]);
    this.pipeline = { tokenizer, model };
    return this.pipeline;
  };

  public prompt = async (
    messages: Array<LanguageModelPolyfillMessage>,
    temperature: number,
    topK: number,
    signal: AbortSignal,
    onTokenGenerated: (token: string) => void = () => {},
  ): Promise<{
    response: string;
    generationMetadata: {
      inputDurationMs: number;
      outputTokens: number;
      outputDurationMs: number;
      outputTps: number;
      doneMs: number;
      useKvCache: boolean;
      temperature: number;
      topK: number;
      totalTokens: number;
    };
  }> => {
    if (!this.pipeline) throw new Error("Pipeline not loaded");
    if (signal.aborted) throw new Error("Signal aborted");
    const { tokenizer, model } = this.pipeline;
    if (!this.stoppingCriteria) {
      this.stoppingCriteria = new InterruptableStoppingCriteria();
    }

    signal.addEventListener("abort", () => {
      this.stoppingCriteria.interrupt();
      new Error("Signal aborted");
    });

    const input = tokenizer.apply_chat_template(messages, {
      //tools,
      add_generation_prompt: true,
      return_dict: true,
      // @ts-expect-error
      enable_thinking: false,
    }) as {
      input_ids: Tensor;
      attention_mask: number[] | number[][] | Tensor;
    };

    const started = performance.now();
    let firstTokenTime: DOMHighResTimeStamp | null = null;
    let numTokens = 0;
    let tps: number = 0;
    let response: string = "";

    const removeEosToken = (content: string): string =>
      content.replace(tokenizer.eos_token, "");

    const tokenCallbackFunction = () => {
      firstTokenTime ??= performance.now();
      if (numTokens++ > 0) {
        tps = (numTokens / (performance.now() - firstTokenTime)) * 1000;
      }
    };

    const callbackFunction = (chunk: string) => {
      response += chunk;
      onTokenGenerated(removeEosToken(chunk));
    };

    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: false,
      token_callback_function: tokenCallbackFunction,
      callback_function: callbackFunction,
    });

    const cacheKey = JSON.stringify(messages.slice(0, -1));
    const useCache = cacheKey === this.cache.key;

    const { sequences, past_key_values } = (await model.generate({
      ...input,
      // @ts-ignore
      max_new_tokens: 1024,
      past_key_values: useCache ? this.cache.pastKeyValues : null,
      return_dict_in_generate: true,
      temperature,
      topK,
      stopping_criteria: this.stoppingCriteria,
      streamer,
    })) as { sequences: Tensor; past_key_values: any };
    const ended = performance.now();

    const lengthOfInput = input.input_ids.dims[1];
    response = removeEosToken(
      tokenizer.batch_decode(
        /**
         * First argument (null): Don't slice dimension 0 (the batch dimension) - keep all batches
         * Second argument ([lengthOfInput, Number.MAX_SAFE_INTEGER]): For dimension 1 (the sequence/token dimension), slice from index lengthOfInput to the end
         */
        sequences.slice(null, [lengthOfInput, Number.MAX_SAFE_INTEGER]),
        {
          skip_special_tokens: false,
        },
      )[0],
    );

    this.cache = {
      pastKeyValues: past_key_values,
      key: JSON.stringify([
        ...messages,
        {
          role: "assistant",
          content: response,
        },
      ]),
    };

    return {
      response,
      generationMetadata: {
        inputDurationMs: firstTokenTime - started,
        outputTokens: numTokens,
        outputDurationMs: ended - firstTokenTime,
        outputTps: tps,
        doneMs: ended - started,
        useKvCache: useCache,
        temperature,
        topK,
        totalTokens: lengthOfInput + numTokens,
      },
    };
  };

  public destroy = async () => {
    if (this.pipeline) await this.pipeline.model.dispose();
  };

  public availability = async () => {
    // @ts-ignore
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter || !MODEL) {
      return "unavailable";
    }

    const filesInCache = await Promise.all(
      Object.keys(MODEL.expectedFiles).map((file) =>
        isFileInCache(
          "transformers-cache",
          `https://huggingface.co/${MODEL.id}/resolve/main/${file}`,
        ),
      ),
    );

    if (filesInCache.every((c) => c)) {
      return "available";
    }

    return "downloadable";
  };

  public countTokens = async (
    messages: Array<LanguageModelPolyfillMessage>,
  ): Promise<number> => {
    if (!this.pipeline) throw new Error("Pipeline not loaded");
    const { tokenizer } = this.pipeline;
    const input = tokenizer.apply_chat_template(messages, {
      add_generation_prompt: true,
      return_dict: true,
      // @ts-expect-error
      enable_thinking: false,
    }) as {
      input_ids: Tensor;
      attention_mask: number[] | number[][] | Tensor;
    };

    return input.input_ids.dims[1];
  };
}
