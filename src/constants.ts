interface ModelDefinition {
  id: string;
  dtype:
    | "auto"
    | "fp32"
    | "fp16"
    | "q8"
    | "int8"
    | "uint8"
    | "q4"
    | "bnb4"
    | "q4f16";
  expectedFiles: Record<string, number>;
}

const MODELS: Record<string, ModelDefinition> = {
  "Qwen3-4B": {
    id: "onnx-community/Qwen3-4B-ONNX",
    dtype: "q4f16",
    expectedFiles: {
      "tokenizer.json": 9117040,
      "tokenizer_config.json": 9761,
      "config.json": 1780,
      "onnx/model_q4f16.onnx": 59762833,
      "generation_config.json": 219,
      "onnx/model_q4f16.onnx_data_1": 677150720,
      "onnx/model_q4f16.onnx_data": 2096005120,
    },
  },
};

export const MODEL = Object.values(MODELS)[0];
/*export const MODEL =
  window?.LanguageModelModel in MODELS
    ? MODELS[window.LanguageModelModel]
    : Object.values(MODELS)[0];*/

export const MODEL_SIZE = Object.values(MODEL.expectedFiles).reduce(
  (acc, total) => acc + total,
  0,
);
