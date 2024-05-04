import OpenAI from 'openai'
import { Tool, ToolResponse } from '../core/tool'
import { z } from 'zod'

interface PerplexityToolParams {
  query: string
}

export class PerplexityTool implements Tool {
  code: string = 'perplexity'
  name = 'Perplexity Search'
  description =
    'Use this tool when you have questions about any subject that could be searched on the internet.'
  schema = z.object({
    query: z.string(),
  })

  async execute(input: PerplexityToolParams): Promise<ToolResponse> {
    const api = new OpenAI({
      apiKey: process.env.PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai',
    })
    const response = await api.chat.completions.create({
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

    return {
      text:
        response.choices[0]?.message.content || 'No response from the model.',
    }
  }
}
