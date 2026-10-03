export type FormulaVariables = Record<string, number>

class Parser {
  private position = 0
  constructor(private readonly source: string, private readonly variables: FormulaVariables) {}

  parse() {
    const value = this.expression()
    this.space()
    if (this.position !== this.source.length || !Number.isFinite(value)) throw new Error('Некорректная формула ответа.')
    return value
  }

  private space() { while (/\s/.test(this.source[this.position] || '')) this.position += 1 }
  private take(value: string) { this.space(); if (this.source.startsWith(value, this.position)) { this.position += value.length; return true } return false }
  private expression(): number {
    let value = this.term()
    while (true) { if (this.take('+')) value += this.term(); else if (this.take('-')) value -= this.term(); else return value }
  }
  private term(): number {
    let value = this.power()
    while (true) { if (this.take('*')) value *= this.power(); else if (this.take('/')) value /= this.power(); else return value }
  }
  private power(): number {
    let value = this.unary()
    if (this.take('^')) value **= this.power()
    return value
  }
  private unary(): number {
    if (this.take('+')) return this.unary()
    if (this.take('-')) return -this.unary()
    return this.primary()
  }
  private primary(): number {
    this.space()
    if (this.take('(')) { const value = this.expression(); if (!this.take(')')) throw new Error('Не закрыта скобка.'); return value }
    const rest = this.source.slice(this.position)
    const number = rest.match(/^(?:\d+(?:[.,]\d*)?|[.,]\d+)/)
    if (number) { this.position += number[0].length; return Number(number[0].replace(',', '.')) }
    const identifier = rest.match(/^[A-Za-zА-Яа-я_][A-Za-zА-Яа-я0-9_]*/u)?.[0]
    if (!identifier) throw new Error('Неожиданный символ в формуле.')
    this.position += identifier.length
    if (this.take('(')) {
      const argument = this.expression()
      if (!this.take(')')) throw new Error('Не закрыта функция.')
      const radians = argument * Math.PI / 180
      const functions: Record<string, (value: number) => number> = {
        sqrt: Math.sqrt, abs: Math.abs, sin: () => Math.sin(radians), cos: () => Math.cos(radians), tan: () => Math.tan(radians),
      }
      const operation = functions[identifier.toLowerCase()]
      if (!operation) throw new Error(`Функция ${identifier} не разрешена.`)
      return operation(argument)
    }
    if (identifier.toLowerCase() === 'pi') return Math.PI
    if (!(identifier in this.variables)) throw new Error(`Неизвестная переменная ${identifier}.`)
    return this.variables[identifier]
  }
}

export function evaluateFormula(formula: string, variables: FormulaVariables) {
  if (formula.length > 240) throw new Error('Формула слишком длинная.')
  return new Parser(formula, variables).parse()
}

export function generateVariables(definition: string) {
  const variables: FormulaVariables = {}
  for (const item of definition.split(';').map((part) => part.trim()).filter(Boolean)) {
    const match = item.match(/^([A-Za-zА-Яа-я_][A-Za-zА-Яа-я0-9_]*)\s*=\s*(-?\d+(?:[.,]\d+)?)\s*:\s*(-?\d+(?:[.,]\d+)?)\s*:\s*(\d+(?:[.,]\d+)?)$/u)
    if (!match) throw new Error(`Некорректная переменная «${item}». Формат: v=10:20:1`)
    const [, name, rawMin, rawMax, rawStep] = match
    const min = Number(rawMin.replace(',', '.')); const max = Number(rawMax.replace(',', '.')); const step = Number(rawStep.replace(',', '.'))
    if (![min, max, step].every(Number.isFinite) || step <= 0 || max < min) throw new Error(`Некорректный диапазон ${name}.`)
    const count = Math.floor((max - min) / step) + 1
    if (count < 1 || count > 10_000) throw new Error(`Слишком большой диапазон ${name}.`)
    const selected = min + Math.floor(Math.random() * count) * step
    variables[name] = Number(selected.toFixed(8))
  }
  return variables
}

export function substituteVariables(text: string, variables: FormulaVariables) {
  return text.replace(/\{([A-Za-zА-Яа-я_][A-Za-zА-Яа-я0-9_]*)\}/gu, (placeholder, name: string) => name in variables ? String(variables[name]).replace('.', ',') : placeholder)
}
