export function interpolateVariablesIntoPrompt(
  prompt: string,
  variables: object,
) {
  const keys = Object.keys(variables)
  const values = Object.values(variables)

  return keys.reduce((acc, key, index) => {
    const value = values[index]
    return acc.replaceAll(`{${key}}`, value)
  }, prompt)
}

export function convertToXmlTag(label: string, content: string): string {
  const specialCharsRegex = /[^a-zA-Z0-9_]/g
  const sanitizedLabel = label.replace(specialCharsRegex, '_').toLowerCase()
  return `<${sanitizedLabel}>${content}</${sanitizedLabel}>`
}

export function logWithColor(message: string, color: LogColor) {
  const reset = '\x1b[0m'
  let bgColor = reset
  switch (color) {
    case 'green':
      bgColor = '\x1b[32m'
      break
    case 'yellow':
      bgColor = '\x1b[33m'
      break
    case 'red':
      bgColor = '\x1b[31m'
      break
  }
  console.log(`${bgColor}%s${reset}`, message)
}
type LogColor = 'green' | 'yellow' | 'red'

export function dedent(
  strings: TemplateStringsArray,
  ...values: any[]
): string {
  const combined = strings.reduce((result, str, i) => {
    return result + (values[i - 1] || '') + str
  }, '')

  const lines = combined.split('\n')

  const minIndent = lines
    .filter(line => line.trim().length > 0) // Ignore empty lines
    .reduce((minIndent, line) => {
      const indent = (line.match(/^\s*/) as any)[0].length // Get the leading whitespace
      return indent < minIndent ? indent : minIndent
    }, Infinity)

  const dedented = lines.map(line => line.slice(minIndent))
  return dedented.join('\n')
}
