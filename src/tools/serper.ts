import { z } from 'zod'
import { Tool, ToolResponse } from '../core/tool'

export interface SerperToolParams {
  query: string
}

export class SerperTool implements Tool {
  code: string = 'serper'
  name: string = 'Serper Search'
  description: string =
    'Use when you need to look up something on the internet.'
  schema = z.object({
    query: z.string(),
  })

  constructor() {
    if (!process.env.SERPER_API_KEY) {
      throw new Error('SERPER_API_KEY environment variable is required')
    }
  }

  async execute(input: SerperToolParams): Promise<ToolResponse> {
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.SERPER_API_KEY!,
      },
      redirect: 'follow',
      body: JSON.stringify({
        q: `${input.query}`,
        gl: 'br',
        hl: 'pt-br',
      }),
    }

    const url = `https://google.serper.dev/search`
    const response = await fetch(url, options)

    if (response.status !== 200) {
      throw new Error(`Error calling Serper API: ${response.statusText}`)
    }

    const json = (await response.json()) as any

    if (json.answerBox?.answer) {
      return { text: json.answerBox.answer }
    }

    if (json.answerBox?.snippet) {
      return { text: json.answerBox.snippet }
    }

    if (json.answerBox?.snippet_highlighted_words) {
      return { text: json.answerBox.snippet_highlighted_words[0] }
    }

    if (json.sportsResults?.game_spotlight) {
      return { text: json.sportsResults.game_spotlight }
    }

    if (json.knowledgeGraph?.description) {
      return { text: json.knowledgeGraph.description }
    }

    if (json.organic?.[0]?.snippet) {
      return { text: json.organic[0].snippet }
    }

    return { text: 'No good search result found' }
  }
}
