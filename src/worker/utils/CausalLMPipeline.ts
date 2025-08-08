import {
  AutoModelForCausalLM,
  AutoTokenizer,
  PreTrainedModel,
  PreTrainedTokenizer,
  ProgressCallback,
} from "@huggingface/transformers";

class TextGenerationPipeline {
  static model_id = "onnx-community/Qwen3-4B-ONNX"; //"HuggingFaceTB/SmolLM3-3B-ONNX";
  static tokenizer: Promise<PreTrainedTokenizer>;
  static model: Promise<PreTrainedModel>;

  static async getInstance(progress_callback: ProgressCallback = null) {
    this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
      progress_callback,
    });

    this.model ??= AutoModelForCausalLM.from_pretrained(this.model_id, {
      dtype: "q4f16",
      device: "webgpu",
      progress_callback,
    });

    return Promise.all([this.tokenizer, this.model]);
  }
}

export default TextGenerationPipeline;
