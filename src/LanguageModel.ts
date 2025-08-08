class LanguageModel {
  public static availability = async (): Promise<Availability> => {
    return "available";
  };

  public static create = async (
    options?: LanguageModelCreateOptions,
  ): Promise<LanguageModel> => {
    return null;
  };
}

export default LanguageModel;
