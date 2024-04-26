import OpenAI from 'openai'
import { Tool } from '../core/tool'

interface PerplexityToolParams {
  query: string
}

export class PerplexityTool implements Tool {
  api: OpenAI
  name = 'Perplexity Search'
  description =
    'Use this tool when you have questions about any subject that could be searched on the internet. The only param is a JSON object with the key "query".'

  constructor(apiKey?: string) {
    this.api = new OpenAI({
      apiKey: apiKey || process.env.PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai',
    })
  }

  async execute(input: PerplexityToolParams) {
    const response = await this.api.chat.completions.create({
      model: 'llama-3-8b-instruct',
      messages: [
        {
          role: 'system',
          content:
            'You are an artificial intelligence assistant and you need to responde to the user query in a helpful, detailed way, using a language that is easy to understand to another AI. DO NOT add any preamble. DO NOT add greetings. DO NOT add redundant explantions. You just respond to the user query.',
        },
        {
          role: 'user',
          content: input.query,
        },
      ],
    })

    return response.choices[0]?.message.content || 'No response from the model.'
  }
}
