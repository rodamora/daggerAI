import { convertToXmlTag, removeDiacritics } from './helpers'
import { Node } from './node'

export class Input extends Node {
  override type: string = 'input'

  name: string
  description: string

  constructor(params: InputParams) {
    super()
    this.id = params.id || ''
    this.name = params.name
    this.description = params.name
  }

  override nodeOutput() {
    return `${convertToXmlTag(
      removeDiacritics(this.name).toLocaleLowerCase(),
      this.output || '',
    )}`
  }
}

export interface InputParams {
  id?: string
  name: string
  description: string
}

export interface InputValue {
  name: string
  value: string
}
