export interface LLMParams {
  model: string
  maxTokens?: number
}

export interface LLM {
  invoke(prompt: string): Promise<string>
}

export const llmModels = [
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'claude-3-haiku-20240307',
  'claude-3-sonnet-20240229',
  'claude-3-opus-20240229',
  'lamma3',
  'llama3:70b',
]
export type LLMModel = (typeof llmModels)[number]
