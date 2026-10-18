import { randomInt } from 'node:crypto'
import type { AssessmentPolicy } from '../../src/lib/assessmentPolicy.js'
import type { AssessmentLanguage, StudentIdentity } from './mechanicsAssessment.js'
import { EXTRA_THEORY, type LocalText, type Theory } from './midtermTheory.js'

export type MidtermAnswers = Record<string, Record<string, string | number>>
export type MidtermVariant = {
  kind: 'midterm-v1'; student?: StudentIdentity; penaltyPolicy?: AssessmentPolicy
  revision?: 3
  throw: { v: number; h: number }
  blocks: { m1: number; m2: number; force: number } | { mass: number; m1: number; m2: number }
  circle: { radius: number; A: number; B: number; C: number; time: number }
  collision: { m1: number; m2: number; v1: number; v2: number }
  molecule: { a: number; b: number; length: number; angle: number }
  theory: Array<{ bankId: string; order: string[] }>
}
export type MidtermTask = {
  id: string; order: number; title: string; text: string; points: number
  kind: 'numeric' | 'multiple'; diagram?: 'molecule'
  fields: Array<{ id: string; label: string; unit: string; step: string }>
  options?: Array<{ id: string; text: string }>
}
const T = (ru: string, kk: string): LocalText => ({ ru, kk })
const option = (id: string, ru: string, kk: string) => ({ id, text: T(ru, kk) })
// Original questions based on the supplied RU/KK lecture topics, not copied slide text.
const CORE_THEORY: Theory[][] = [
  [
    { id: 'newton', text: T('Выберите все верные утверждения об инерциальной системе отсчёта.', 'Инерциялық санақ жүйесі туралы барлық дұрыс тұжырымдарды таңдаңыз.'), options: [
      option('a', 'Ускорение тела определяется равнодействующей сил.', 'Дененің үдеуі күштердің тең әсерлі күшімен анықталады.'),
      option('b', 'При нулевой равнодействующей скорость тела постоянна.', 'Тең әсерлі күш нөлге тең болса, дененің жылдамдығы тұрақты.'),
      option('c', 'Для поддержания постоянной скорости обязательно нужна ненулевая равнодействующая.', 'Тұрақты жылдамдықты сақтау үшін міндетті түрде нөлден өзгеше тең әсерлі күш қажет.'),
      option('d', 'Силы действия и противодействия приложены к одному телу.', 'Әрекет және қарсы әрекет күштері бір денеге түсіріледі.'),
    ], correct: ['a', 'b'] },
    { id: 'kinematics', text: T('Выберите все верные утверждения о движении материальной точки.', 'Материялық нүктенің қозғалысы туралы барлық дұрыс тұжырымдарды таңдаңыз.'), options: [
      option('a', 'При равномерном движении по окружности ускорение не равно нулю.', 'Шеңбер бойымен бірқалыпты қозғалыста үдеу нөлге тең емес.'),
      option('b', 'Нормальное ускорение изменяет направление скорости.', 'Нормаль үдеу жылдамдықтың бағытын өзгертеді.'),
      option('c', 'Путь всегда равен модулю перемещения.', 'Жол әрқашан орын ауыстыру модуліне тең.'),
      option('d', 'Нулевая мгновенная скорость всегда означает нулевое ускорение.', 'Лездік жылдамдық нөлге тең болса, үдеу әрқашан нөлге тең.'),
    ], correct: ['a', 'b'] },
  ],
  [
    { id: 'energy', text: T('Выберите все верные утверждения о механической энергии.', 'Механикалық энергия туралы барлық дұрыс тұжырымдарды таңдаңыз.'), options: [
      option('a', 'Работа равнодействующей равна изменению кинетической энергии.', 'Тең әсерлі күштің жұмысы кинетикалық энергияның өзгерісіне тең.'),
      option('b', 'При действии только консервативных сил механическая энергия сохраняется.', 'Тек консервативтік күштер әсер еткенде механикалық энергия сақталады.'),
      option('c', 'При абсолютно неупругом ударе кинетическая энергия всегда сохраняется.', 'Абсолют серпімсіз соқтығысуда кинетикалық энергия әрқашан сақталады.'),
      option('d', 'Работа силы трения скольжения всегда увеличивает механическую энергию.', 'Сырғанау үйкеліс күшінің жұмысы механикалық энергияны әрқашан арттырады.'),
    ], correct: ['a', 'b'] },
    { id: 'momentum', text: T('Выберите все верные утверждения об импульсе и столкновениях.', 'Импульс және соқтығысулар туралы барлық дұрыс тұжырымдарды таңдаңыз.'), options: [
      option('a', 'Импульс системы сохраняется при нулевом суммарном внешнем импульсе силы.', 'Сыртқы күштердің қорытқы импульсі нөлге тең болса, жүйенің импульсі сақталады.'),
      option('b', 'После абсолютно неупругого столкновения слипшиеся тела имеют общую скорость.', 'Абсолют серпімсіз соқтығысудан кейін бірігіп қалған денелердің жылдамдығы ортақ болады.'),
      option('c', 'Импульс — скалярная величина.', 'Импульс — скаляр шама.'),
      option('d', 'Сохранение импульса всегда означает сохранение кинетической энергии.', 'Импульстің сақталуы әрқашан кинетикалық энергияның сақталуын білдіреді.'),
    ], correct: ['a', 'b'] },
  ],
  [
    { id: 'oscillations', text: T('Выберите все верные утверждения о гармонических колебаниях и волнах.', 'Гармониялық тербелістер мен толқындар туралы барлық дұрыс тұжырымдарды таңдаңыз.'), options: [
      option('a', 'При x = A cos(ωt + φ) ускорение равно −ω²x.', 'x = A cos(ωt + φ) болса, үдеу −ω²x-ке тең.'),
      option('b', 'Для бегущей волны v = λν.', 'Жүгірме толқын үшін v = λν.'),
      option('c', 'При удвоении частоты период также удваивается.', 'Жиілік екі есе артса, период та екі есе артады.'),
      option('d', 'При гармонических колебаниях скорость максимальна в точке максимального отклонения.', 'Гармониялық тербелісте жылдамдық ең үлкен ауытқу нүктесінде максимал болады.'),
    ], correct: ['a', 'b'] },
    { id: 'waves', text: T('Выберите все верные утверждения о колебаниях и механических волнах.', 'Тербелістер мен механикалық толқындар туралы барлық дұрыс тұжырымдарды таңдаңыз.'), options: [
      option('a', 'Период связан с циклической частотой: T = 2π/ω.', 'Период циклдік жиілікпен T = 2π/ω қатынасымен байланысқан.'),
      option('b', 'Механическая волна переносит энергию без переноса вещества на длину распространения волны.', 'Механикалық толқын затты толқынның таралу қашықтығына тасымалдамай, энергияны тасымалдайды.'),
      option('c', 'Продольная волна имеет колебания частиц только перпендикулярно распространению.', 'Бойлық толқында бөлшектер тек таралу бағытына перпендикуляр тербеледі.'),
      option('d', 'При неизменной скорости волны рост частоты увеличивает длину волны.', 'Толқын жылдамдығы тұрақты болса, жиіліктің артуы толқын ұзындығын арттырады.'),
    ], correct: ['a', 'b'] },
  ],
]
export const THEORY: Theory[][] = CORE_THEORY.map((bank, i) => [...bank, ...EXTRA_THEORY[i]])
const pick = <V>(items: readonly V[]): V => items[randomInt(items.length)]
function shuffle<V>(items: V[]) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) { const j = randomInt(i + 1); [result[i], result[j]] = [result[j], result[i]] }
  return result
}
function theoryFor(id: string) { const found = THEORY.flat().find(q => q.id === id); if (!found) throw new Error('Unknown theory version'); return found }
export function createMidtermVariant(): MidtermVariant {
  const v = randomInt(20, 36)
  const h = Math.round(v * v / (2 * 9.81) * pick([0.35, 0.45, 0.55, 0.65]))
  return {
    kind: 'midterm-v1', revision: 3, throw: { v, h },
    blocks: { mass: randomInt(3, 9), m1: randomInt(1, 5), m2: randomInt(5, 10) },
    circle: { radius: randomInt(10, 31) / 10, A: randomInt(2, 8), B: randomInt(2, 7), C: randomInt(1, 4), time: randomInt(4, 7) },
    collision: { m1: randomInt(2, 11), m2: randomInt(2, 9), v1: randomInt(5, 13), v2: pick([-1, 1]) * randomInt(1, 5) },
    molecule: { a: randomInt(10, 25), b: randomInt(1, 10), length: randomInt(90, 151) / 1000, angle: pick([90, 100, 104, 110, 120]) },
    theory: THEORY.map(bank => { const q = pick(bank); return { bankId: q.id, order: shuffle(q.options.map(o => o.id)) } }),
  }
}
export function midtermFingerprint(v: MidtermVariant) {
  return `midterm-v1-r${v.revision ?? 1}:${JSON.stringify([v.throw, v.blocks, v.circle, v.collision, v.molecule]).replace(/[{}"a-zA-Z:]/g, '')}:${v.theory.map(q => `${q.bankId}-${q.order.join('')}`).join(':')}`
}
const field = (id: string, label: string, unit: string) => ({ id, label, unit, step: 'any' })
export function midtermTasks(v: MidtermVariant, lang: AssessmentLanguage = 'ru'): MidtermTask[] {
  const kk = lang === 'kk'; const a = v.throw, b = v.blocks, c = v.circle, d = v.collision, m = v.molecule
  const tasks: MidtermTask[] = [
    { id: 'throw', order: 1, kind: 'numeric', points: 0.8, title: kk ? 'Тік жоғары лақтыру' : 'Вертикальный бросок',
      text: kk ? `Дене жер бетінен тік жоғары v₀ = ${a.v} м/с жылдамдықпен лақтырылды. Ол h = ${a.h} м биіктікте қандай екі уақыт мезетінде болады? Алдымен кіші уақытты жазыңыз. Жерден есептелген ең үлкен биіктікті де табыңыз. Ауа кедергісін ескермеңіз; g = 9,81 м/с².` : `Тело брошено с поверхности земли вертикально вверх со скоростью v₀ = ${a.v} м/с. В какие два момента времени оно окажется на высоте h = ${a.h} м? Сначала укажите меньшее время. Найдите также максимальную высоту над землёй. Сопротивлением воздуха пренебречь; g = 9,81 м/с².`,
      fields: [field('t1', kk ? 'Бірінші уақыт' : 'Первый момент', 'с'), field('t2', kk ? 'Екінші уақыт' : 'Второй момент', 'с'), field('height', kk ? 'Ең үлкен биіктік' : 'Максимальная высота', 'м')] },
    ...('mass' in b ? [{ id: 'blocks', order: 2, kind: 'numeric' as const, points: 1, title: kk ? 'Екі жүк және үстелдегі білеуше' : 'Брусок и два подвешенных груза',
      text: kk ? `Массасы m = ${b.mass} кг білеуше тегіс көлденең үстелде жатыр. Оған үстелдің қарама-қарсы шеттеріне бекітілген екі қозғалмайтын блок арқылы өткізілген екі салмақсыз созылмайтын жіп байланған. Сол жақ жіпке массасы m₁ = ${b.m1} кг, оң жақ жіпке массасы m₂ = ${b.m2} кг жүктер ілінген. Білеушенің үдеу модулін және әр жіптің T₁, T₂ керілу күштерін табыңыз. Блоктардың массасын және үйкелісті ескермеңіз. g = 9,81 м/с².` : `На гладком горизонтальном столе лежит брусок массой m = ${b.mass} кг. К нему привязаны два невесомых нерастяжимых шнура, перекинутые через неподвижные блоки на противоположных краях стола. К левому шнуру подвешен груз m₁ = ${b.m1} кг, к правому — m₂ = ${b.m2} кг. Найдите модуль ускорения бруска и силы натяжения T₁ и T₂ каждого шнура. Массами блоков и трением пренебречь. Примите g = 9,81 м/с².`,
      fields: [field('acceleration', kk ? 'Үдеу модулі' : 'Модуль ускорения', 'м/с²'), field('tension1', kk ? 'Сол жақ жіптің керілуі T₁' : 'Натяжение левого шнура T₁', 'Н'), field('tension2', kk ? 'Оң жақ жіптің керілуі T₂' : 'Натяжение правого шнура T₂', 'Н')] }] : [{ id: 'blocks', order: 2, kind: 'numeric' as const, points: 1, title: kk ? 'Ньютонның екінші заңы' : 'Второй закон Ньютона',
      text: kk ? `Массалары m₁ = ${b.m1} кг және m₂ = ${b.m2} кг екі білеуше салмақсыз созылмайтын жіппен жалғанып, тегіс көлденең үстелде жатыр. F = ${b.force} Н көлденең күш бірінші білеушеге (m₁) түсіріліп, оны екіншісінен алыстата тартады. Білеушелердің үдеу модулін және жіптің керілу күшін табыңыз. Үйкелісті ескермеңіз.` : `Два бруска массами m₁ = ${b.m1} кг и m₂ = ${b.m2} кг соединены невесомой нерастяжимой нитью на гладком горизонтальном столе. Горизонтальная сила F = ${b.force} Н приложена к первому бруску (m₁) и тянет его в сторону от второго. Найдите модуль ускорения брусков и силу натяжения нити. Трением пренебречь.`,
      fields: [field('acceleration', kk ? 'Үдеу модулі' : 'Модуль ускорения', 'м/с²'), field('tension', kk ? 'Керілу күші' : 'Натяжение нити', 'Н')] }]),
    { id: 'circle', order: 3, kind: 'numeric', points: 1.2, title: kk ? 'Шеңбер бойымен қозғалыс' : 'Движение по окружности',
      text: kk ? `Нүкте радиусы R = ${c.radius} м шеңбер бойымен φ(t) = ${c.A} − ${c.B}t + ${c.C}t² заңымен қозғалады (φ — радиан, t — секунд). t = 0 кезіндегі нормаль үдеу модулін және t = ${c.time} с кезіндегі толық үдеу модулін табыңыз.` : `Точка движется по окружности радиусом R = ${c.radius} м по закону φ(t) = ${c.A} − ${c.B}t + ${c.C}t² (φ в радианах, t в секундах). Найдите модуль нормального ускорения при t = 0 и модуль полного ускорения при t = ${c.time} с.`,
      fields: [field('normal', kk ? 'Бастапқы нормаль үдеу' : 'Начальное нормальное ускорение', 'м/с²'), field('total', kk ? 'Толық үдеу' : 'Полное ускорение', 'м/с²')] },
    { id: 'collision', order: 4, kind: 'numeric', points: 1.5, title: kk ? 'Серпімсіз соқтығысу' : 'Неупругое столкновение',
      text: kk ? `Бір түзу бойымен қозғалатын екі шардың массалары m₁ = ${d.m1} кг, m₂ = ${d.m2} кг. Олардың жылдамдық проекциялары v₁ₓ = ${d.v1} м/с, v₂ₓ = ${d.v2} м/с. Соқтығысудан кейін шарлар бірігіп қалады. Сыртқы күштердің импульсін ескермеңіз. Ортақ жылдамдықтың x проекциясын (таңбасымен) және кинетикалық энергияның кемуін ΔK = Kдейін − Kкейін табыңыз.` : `Два шара движутся вдоль одной прямой: m₁ = ${d.m1} кг, m₂ = ${d.m2} кг; проекции скоростей v₁ₓ = ${d.v1} м/с, v₂ₓ = ${d.v2} м/с. После столкновения шары слипаются. Внешним импульсом сил пренебречь. Найдите проекцию общей скорости на ось x (со знаком) и потерю кинетической энергии ΔK = Kдо − Kпосле.`,
      fields: [field('velocity', kk ? 'Ортақ жылдамдық проекциясы' : 'Проекция общей скорости', 'м/с'), field('loss', kk ? 'Кинетикалық энергияның кемуі' : 'Потеря кинетической энергии', kk ? 'Дж' : 'Дж')] },
    { id: 'molecule', order: 5, kind: 'numeric', points: 2, diagram: 'molecule', title: kk ? 'АБ₂ молекуласының инерция моменттері' : 'Моменты инерции молекулы АБ₂',
      text: kk ? `Жазық иілген АБ₂ молекуласын үш материялық нүкте деп қарастырыңыз. Орталық А атомының массасы ${m.a}mH, екі шеткі Б атомының әрқайсысының массасы ${m.b}mH. Екі А–Б байланысының ұзындығы бірдей: l = ${m.length} нм, Б–А–Б бұрышы α = ${m.angle}°. mH = 1,67·10⁻²⁷ кг. Атомдардың өздік инерциясын ескермеңіз. Үш өзара перпендикуляр ось молекуланың массалар центрі O арқылы өтеді: y — бұрыш биссектрисасына параллель, x — молекула жазықтығында y-ке перпендикуляр, z — осы жазықтыққа перпендикуляр. Jx, Jy, Jz табыңыз. Жауаптарда 10⁻⁴⁷ кг·м² алдындағы санды енгізіңіз (мысалы, 5·10⁻⁴⁷ үшін 5). Сызба масштабсыз берілген.` : `Плоскую изогнутую молекулу АБ₂ считайте тремя материальными точками. Масса центрального атома А равна ${m.a}mH, каждого из двух крайних атомов Б — ${m.b}mH. Обе связи А–Б имеют длину l = ${m.length} нм, угол Б–А–Б α = ${m.angle}°. Примите mH = 1,67·10⁻²⁷ кг. Собственной инерцией атомов пренебречь. Три взаимно перпендикулярные оси проходят через центр масс O: y параллельна биссектрисе угла, x лежит в плоскости молекулы перпендикулярно y, z перпендикулярна плоскости молекулы. Найдите Jx, Jy, Jz. Введите коэффициенты перед 10⁻⁴⁷ кг·м² (например, для 5·10⁻⁴⁷ введите 5). Схема не в масштабе.`,
      fields: [field('jx', 'Jx', '10⁻⁴⁷ кг·м²'), field('jy', 'Jy', '10⁻⁴⁷ кг·м²'), field('jz', 'Jz', '10⁻⁴⁷ кг·м²')] },
  ]
  const theory: MidtermTask[] = v.theory.map((entry, i) => { const q = theoryFor(entry.bankId); return {
    id: `theory${i + 1}`, order: i + 6, kind: 'multiple' as const, points: 0.5,
    title: kk ? `Теория ${i + 1}` : `Теория ${i + 1}`,
    text: `${q.text[lang]} ${kk ? 'Бірнеше дұрыс жауап бар.' : 'Правильных ответов несколько.'}`,
    fields: [field('selection', kk ? 'Таңдалған жауаптар' : 'Выбранные ответы', '')],
    options: entry.order.map((id, index) => ({ id: `choice${index + 1}`, text: `${index + 1}. ${q.options.find(o => o.id === id)!.text[lang]}` })),
  } })
  if (v.revision === 3) return [...theory.map(t => ({ ...t, points: 1 })), ...tasks.filter(t => t.id !== 'circle').map((t, i) => ({ ...t, order: i + 1, points: t.id === 'molecule' ? 2 : 1 }))]
  return [...theory, ...tasks]
}

export function midtermExpected(v: MidtermVariant): Record<string, Record<string, { value: number; points: number }>> {
  const a = v.throw, b = v.blocks, c = v.circle, d = v.collision, m = v.molecule
  const root = Math.sqrt(a.v ** 2 - 2 * 9.81 * a.h)
  const velocity = (d.m1 * d.v1 + d.m2 * d.v2) / (d.m1 + d.m2)
  const massA = m.a * 1.67e-27, massB = m.b * 1.67e-27, length = m.length * 1e-9, half = m.angle * Math.PI / 360
  const jx = 2 * massA * massB / (massA + 2 * massB) * length ** 2 * Math.cos(half) ** 2 / 1e-47
  const jy = 2 * massB * length ** 2 * Math.sin(half) ** 2 / 1e-47
  const E = (value: number, points: number) => ({ value, points })
  const acceleration = 'mass' in b ? (b.m2 - b.m1) * 9.81 / (b.mass + b.m1 + b.m2) : 0
  const expected: Record<string, Record<string, { value: number; points: number }>> = {
    throw: { t1: E((a.v - root) / 9.81, v.revision === 3 ? .25 : .2), t2: E((a.v + root) / 9.81, v.revision === 3 ? .25 : .2), height: E(a.v ** 2 / 19.62, v.revision === 3 ? .5 : .4) },
    blocks: 'mass' in b ? {
      acceleration: E(Math.abs(acceleration), .4),
      tension1: E(b.m1 * (9.81 + acceleration), .3),
      tension2: E(b.m2 * (9.81 - acceleration), .3),
    } : { acceleration: E(b.force / (b.m1 + b.m2), .5), tension: E(b.m2 * b.force / (b.m1 + b.m2), .5) },
    circle: { normal: E(c.radius * c.B ** 2, .6), total: E(Math.hypot(c.radius * (2 * c.C * c.time - c.B) ** 2, c.radius * 2 * c.C), .6) },
    collision: { velocity: E(velocity, .5), loss: E((d.m1 * d.v1 ** 2 + d.m2 * d.v2 ** 2 - (d.m1 + d.m2) * velocity ** 2) / 2, v.revision === 3 ? .5 : 1) },
    molecule: { jx: E(jx, .6), jy: E(jy, .6), jz: E(jx + jy, .8) },
  }
  if (v.revision === 3) delete expected.circle
  return expected
}
function numeric(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && !value.trim()) return null
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}
export function reviewMidterm(v: MidtermVariant, answers: MidtermAnswers, lang: AssessmentLanguage = 'ru') {
  const tasks = midtermTasks(v, lang), expected = midtermExpected(v)
  const fields = tasks.flatMap(task => task.fields.map(f => {
    const submitted = answers[task.id]?.[f.id] ?? null
    if (task.kind === 'multiple') {
      const q = theoryFor(v.theory[task.order - 6].bankId)
      const selected = typeof submitted === 'string' ? submitted.split(',').filter(Boolean) : []
      const entry = v.theory[task.order - 6]
      const correctChoices = q.correct.map(id => `choice${entry.order.indexOf(id) + 1}`)
      const correct = selected.length === correctChoices.length && new Set(selected).size === selected.length && selected.every(id => correctChoices.includes(id))
      const labels = (ids: string[]) => ids.map(id => task.options?.find(o => o.id === id)?.text ?? id).join('; ')
      return { taskId: task.id, taskTitle: task.title, fieldId: f.id, label: f.label, unit: '', submitted: selected.length ? labels(selected) : null, expected: labels(correctChoices), tolerance: lang === 'kk' ? 'дәл жиын' : 'точный набор', correct, points: task.points }
    }
    const rule = expected[task.id][f.id], actual = numeric(submitted)
    return { taskId: task.id, taskTitle: task.title, fieldId: f.id, label: f.label, unit: f.unit, submitted, expected: Number(rule.value.toPrecision(8)), tolerance: '± max(0,02; 1%)', correct: actual !== null && Math.abs(actual - rule.value) <= Math.max(.02, Math.abs(rule.value) * .01), points: rule.points }
  }))
  return { tasks, fields }
}
export function gradeMidterm(v: MidtermVariant, answers: MidtermAnswers) {
  const { tasks, fields } = reviewMidterm(v, answers)
  return { score: Math.round(fields.reduce((sum, f) => sum + (f.correct ? f.points : 0), 0) * 100) / 100,
    correctness: tasks.map(t => fields.filter(f => f.taskId === t.id).every(f => f.correct)) }
}
