import {
  AutoModelForCausalLM,
  AutoTokenizer,
  PreTrainedModel,
  PreTrainedTokenizer,
  ProgressCallback,
} from "@huggingface/transformers";
import { MODEL } from "../../../constants";

class CausalLMPipeline {
  static tokenizer: Promise<PreTrainedTokenizer>;
  static model: Promise<PreTrainedModel>;

  static async getInstance(progress_callback: ProgressCallback = null) {
    this.tokenizer ??= AutoTokenizer.from_pretrained(MODEL.id, {
      progress_callback,
    });

    this.model ??= AutoModelForCausalLM.from_pretrained(MODEL.id, {
      dtype: MODEL.dtype,
      device: "webgpu",
      progress_callback,
    });

    return Promise.all([this.tokenizer, this.model]);
  }
}

export default CausalLMPipeline;
