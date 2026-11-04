import { clementExpected, type ClementVariant } from '../lib/clementDesormes'
const f = (n: number, digits = 3) => n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })
export default function ClementExpectedTables({ variant }: { variant: ClementVariant }) {
  const expected = clementExpected(variant)
  return <>
    <h3>Таблица 3 · Изопроцессы</h3>
    <p>h′ в таблице процессов приведено для открытия крана на 5 с. Для других времён используйте таблицу 4.</p>
    <div className="cd-table-scroll"><table className="cd-table cd-reference-table"><thead><tr><th rowSpan={2}>Процесс</th><th rowSpan={2}>H, мм</th><th rowSpan={2}>h′, мм</th><th rowSpan={2}>Название процесса</th><th rowSpan={2}>Направление процесса</th><th colSpan={2}>Начальные параметры</th><th colSpan={2}>Конечные параметры</th></tr><tr><th>Давление</th><th>Температура</th><th>Давление</th><th>Температура</th></tr></thead><tbody>
      <tr><th>1–2</th><td rowSpan={2}>{f(variant.targetHead)}</td><td rowSpan={2}>{f(expected.trials[0].head)}</td><td>Приближённо адиабатический</td><td>Расширение, охлаждение</td><td>p₁ &gt; p₀</td><td>T₁ = T₀</td><td>p₂ = p₀</td><td>T₂ &lt; T₀</td></tr>
      <tr><th>2–3</th><td>Изохорный</td><td>Нагревание</td><td>p₂ = p₀</td><td>T₂ &lt; T₀</td><td>p₃ &gt; p₀</td><td>T₃ = T₀</td></tr>
    </tbody></table></div>
    <h3>Таблица 4 · Измерения и обработка</h3>
    <div className="cd-table-scroll"><table className="cd-table cd-reference-table"><thead><tr>{['H, мм', 't, с', 'h′, мм', 'ln h′', 'ln h', 'h, мм', 'γэ', 'γт', 'ε, %'].map(s => <th key={s}>{s}</th>)}</tr></thead><tbody>{expected.trials.map((r,i) => <tr key={r.time}>{i === 0 && <td rowSpan={5}>{f(variant.targetHead)}</td>}<td>{r.time}</td><td>{f(r.head)}</td><td>{f(r.log, 5)}</td>{i === 0 && <><td rowSpan={5}>{f(expected.intercept, 5)}</td><td rowSpan={5}>{f(expected.idealHead)}</td><td rowSpan={5}>{f(expected.gamma)}</td><td rowSpan={5}>1,400</td><td rowSpan={5}>0,000</td></>}</tr>)}</tbody></table></div>
    <p>Эталон без приборной погрешности: ln h′ = ln h − at. Логарифмы рассчитаны для числовых значений высот в миллиметрах. В реальном опыте γэ и ε вычисляются по измеренным данным.</p>
  </>
}
