import KVCache from "./KVCache";
import {
  InterruptableStoppingCriteria,
  Message,
  PreTrainedModel,
  PreTrainedTokenizer,
  Tensor,
  TextStreamer,
} from "@huggingface/transformers";
import { ModelUsage } from "../types";
import { ModelIds, MODELS } from "../../../constants";
import { WorkerError, WorkerErrorCode } from "./WorkerError";

const stopping_criteria = new InterruptableStoppingCriteria();

const prompt = async ({
  tokenizer,
  model,
  messages,
  cache,
  on_response_update,
  temperature,
  top_k,
  is_init_cache,
  model_id,
}: {
  tokenizer: PreTrainedTokenizer;
  model: PreTrainedModel;
  messages: Array<Message>;
  cache: KVCache;
  on_response_update: (partial_response: string) => void;
  temperature: number;
  top_k: number;
  is_init_cache: boolean;
  model_id: ModelIds;
}) => {
  const input_start_time: DOMHighResTimeStamp = performance.now();
  const inputs = tokenizer.apply_chat_template(messages, {
    add_generation_prompt: true,
    return_dict: true,
    // @ts-ignore
    enable_thinking: false,
  });

  const input_size = (
    tokenizer.apply_chat_template(messages, {
      tokenize: true,
      return_tensor: false,
    }) as Array<number>
  ).length;

  const { value: kv_cache, new_messages } = cache.get(messages);

  if (input_size >= MODELS[model_id].maxToken) {
    throw new WorkerError(
      WorkerErrorCode.MAX_TOTAL_TOKENS_EXCEEDED,
      `Input size ${input_size} exceeds maximum allowed tokens ${MODELS[model_id].maxToken}`,
      { input_size, max_tokens: MODELS[model_id].maxToken },
    );
  }

  const new_messages_size = (
    tokenizer.apply_chat_template(new_messages, {
      tokenize: true,
      return_tensor: false,
    }) as Array<number>
  ).length;

  if (new_messages_size >= MODELS[model_id].maxNewTokens) {
    throw new WorkerError(
      WorkerErrorCode.MAX_NEW_TOKENS_EXCEEDED,
      `Input size of new tokens ${new_messages_size} exceeds maximum allowed tokens per prompt ${MODELS[model_id].maxNewTokens}`,
      { new_messages_size, max_new_tokens: MODELS[model_id].maxNewTokens },
    );
  }

  let first_token_time: DOMHighResTimeStamp = null;
  let num_tokens = 0;
  let tps: number = 0;
  let answer = "";

  const token_callback_function = (tokens: number[] | bigint[] | Tensor) => {
    first_token_time ??= performance.now();
    if (num_tokens++ > 0) {
      tps = (num_tokens / (performance.now() - first_token_time)) * 1000;
    }
  };

  const callback_function = (output: string) => {
    answer = answer + output;
    on_response_update(output);
  };

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function,
    token_callback_function,
  });

  // @ts-ignore
  const { past_key_values, ...s } = await model.generate({
    // @ts-ignore
    ...inputs,
    past_key_values: kv_cache,

    // Sampling
    do_sample: true,
    // repetition_penalty: 1.1,
    top_k,
    temperature,

    max_new_tokens: is_init_cache ? 1 : 16384,
    streamer,
    stopping_criteria,
    return_dict_in_generate: true,
  });

  const newMessages: Array<Message> = [
    ...messages,
    {
      role: "assistant",
      content: answer,
    },
  ];

  const done_time: DOMHighResTimeStamp = performance.now();

  cache.set(newMessages, past_key_values);

  const usage: ModelUsage = {
    input_tokens: input_size,
    input_duration_ms: first_token_time - input_start_time,
    input_cache_used: Boolean(kv_cache),
    output_tokens: num_tokens,
    output_duration_ms: done_time - first_token_time,
    output_tps: tps,
  };

  console.log("USAGE", usage);

  return {
    answer,
    usage,
    newMessages,
  };
};

export default prompt;
