import Anthropic from '@anthropic-ai/sdk'
import { SQUAD_PROMPTS } from '../core/prompts'
import { LLM, LLMParams } from '../llm/base'

export class ChatAnthropic implements LLM {
  api: Anthropic
  private params: LLMParams

  constructor(params: ChatAhntropicParams) {
    this.api = new Anthropic({
      apiKey: params.apiKey || process.env.ANTHROPIC_API_KEY,
    })
    this.params = params
  }

  async invoke(prompt: string): Promise<string> {
    const completion = await this.api.messages.create({
      model: this.params.model,
      max_tokens: this.params.maxTokens || 4000,
      stop_sequences: [SQUAD_PROMPTS.observation],
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    })
    return completion.content[0]?.text || ''
  }
}

export interface ChatAhntropicParams extends LLMParams {
  model:
    | 'claude-3-haiku-20240307'
    | 'claude-3-sonnet-20240229'
    | 'claude-3-opus-20240229'
  apiKey?: string
}
