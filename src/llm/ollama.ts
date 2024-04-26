import { SQUAD_PROMPTS } from '../core/prompts'
import { LLM, LLMParams } from '../llm/base'

export class ChatOllama implements LLM {
  params: LLMParams

  constructor(params: LLMParams) {
    this.params = params
  }

  async invoke(prompt: string): Promise<string> {
    const response = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        model: this.params.model,
        temperature: 0,
        stop: [SQUAD_PROMPTS.observation],
        prompt: prompt,
        stream: false,
      }),
    })
    const completion = await response.text()
    const json = JSON.parse(completion) as { response: string }
    return json.response
  }
}
