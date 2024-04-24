import OpenAI from 'openai'
import { SQUAD_PROMPTS } from '../prompts'
import { LLM, LLMParams } from '../llm/base'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export class ChatOpenAI implements LLM {
  params: LLMParams
  constructor(params: ChatOpenAIParams) {
    this.params = params
  }

  async invoke(prompt: string): Promise<string> {
    const completion = await openai.chat.completions.create({
      model: this.params.model,
      max_tokens: this.params.maxTokens || 4000,
      stop: [SQUAD_PROMPTS.observation],
      messages: [{ role: 'user', content: prompt }],
    })
    return completion.choices[0]?.message.content || ''
  }
}

export interface ChatOpenAIParams extends LLMParams {
  model: 'gpt-4-turbo' | 'gpt-3.5-turbo'
}
