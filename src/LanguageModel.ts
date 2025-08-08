type LanguageModelAvailability =
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available";

class LanguageModel {
  public static availability = async (): Promise<LanguageModelAvailability> => {
    return "available";
  };

  public static create = async () => {};
}

export default LanguageModel;
