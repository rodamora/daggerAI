export interface LLMParams {
  model: string
  maxTokens?: number
}

export interface LLM {
  invoke(prompt: string): Promise<string>
}
