import { solveElectrostatic, type ElectroVariant } from '../lib/electrostatics'
self.onmessage = (event: MessageEvent<ElectroVariant>) => {
  try { const grid = solveElectrostatic(event.data); self.postMessage({ grid }, { transfer: [grid.potential.buffer as ArrayBuffer] }) }
  catch { self.postMessage({ error: 'Не удалось рассчитать поле. Перезагрузите установку.' }) }
}
