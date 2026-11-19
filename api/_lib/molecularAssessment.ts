import { createHash, randomInt } from 'node:crypto'
import type { AssessmentPolicy } from '../../src/lib/assessmentPolicy.js'
import type { AssessmentLanguage, StudentIdentity } from './mechanicsAssessment.js'

const R = 8.31
const gases = [
  { ru: 'водорода H₂', kk: 'сутек H₂', M: 2 }, { ru: 'гелия He', kk: 'гелий He', M: 4 },
  { ru: 'азота N₂', kk: 'азот N₂', M: 28 }, { ru: 'кислорода O₂', kk: 'оттек O₂', M: 32 },
  { ru: 'углекислого газа CO₂', kk: 'көмірқышқыл газы CO₂', M: 44 }, { ru: 'аргона Ar', kk: 'аргон Ar', M: 40 },
] as const
export type MolecularVariant = {
  kind: 'molecular-v1'; student?: StudentIdentity; penaltyPolicy?: AssessmentPolicy
  easy: Array<{ kind: number; gas: number; amount: number }>
  concentration: { coefficient: number; litres: number }
  gasMass: { kpa: number; litres: number; molarMass: number; temperature: number }
  heating: { temperature: number; delta: number }
  speed: { molarMass: number; temperature: number }
  mixture: { fraction: number; kpa: number; temperature: number }
  dissociation: { initialK: number; finalK: number; initialKpa: number; finalKpa: number }
}
export function createMolecularVariant(): MolecularVariant {
  const first=randomInt(6), second=(first+randomInt(1,6))%6
  const initialK=100*randomInt(2,5), finalK=1000*randomInt(6,11), initialKpa=10*randomInt(5,16), alpha=randomInt(10,71)/100
  return { kind:'molecular-v1', easy:[first,second].map(kind=>({kind,gas:randomInt(gases.length),amount:randomInt(2,31)/10})),
    concentration:{coefficient:randomInt(10,91)/10,litres:randomInt(2,16)},
    gasMass:{kpa:10*randomInt(8,31),litres:randomInt(3,26),molarMass:gases[randomInt(gases.length)].M,temperature:10*randomInt(28,46)},
    heating:{temperature:10*randomInt(25,40),delta:randomInt(2,11)},
    speed:{molarMass:gases[randomInt(gases.length)].M,temperature:10*randomInt(20,71)},
    mixture:{fraction:randomInt(2,9)/10,kpa:10*randomInt(8,31),temperature:10*randomInt(28,41)},
    dissociation:{initialK,finalK,initialKpa,finalKpa:Number((initialKpa*finalK/initialK*(1+alpha)).toFixed(6))},
  }
}
export const molecularFingerprint=(v:MolecularVariant)=>'molecular-v1:'+createHash('sha256').update(JSON.stringify([v.easy,v.concentration,v.gasMass,v.heating,v.speed,v.mixture,v.dissociation])).digest('hex')
type Task={id:string;order:number;kind:'numeric';title:string;text:string;points:number;fields:Array<{id:string;label:string;unit:string;step:string}>}
type PrivateTask=Task&{value:number;solution:string}
type Answers=Record<string,Record<string,string|number>>
const n=(value:number)=>Number(value.toPrecision(10)).toLocaleString('ru-RU',{maximumSignificantDigits:10,useGrouping:false})
function definitions(v:MolecularVariant,lang:AssessmentLanguage):PrivateTask[] {
  const kk=lang==='kk', tasks:PrivateTask[]=[]
  const add=(id:string,points:number,title:string,text:string,unit:string,value:number,solution:string)=>tasks.push({id,points,title,text,kind:'numeric',order:tasks.length+1,fields:[{id:'value',label:kk?'Жауап':'Ответ',unit,step:'any'}],value,solution})
  v.easy.forEach((e,i)=>{
    const g=gases[e.gas], name=kk?g.kk:g.ru, amount=e.amount, mass=amount*g.M
    const id=`easy${i+1}`, points=.3
    switch(e.kind){
      case 0:add(id,points,kk?'Салыстырмалы молекулалық масса':'Относительная молекулярная масса',kk?`${name} газының салыстырмалы молекулалық массасын табыңыз. Aᵣ(H)=1; Aᵣ(He)=4; Aᵣ(C)=12; Aᵣ(N)=14; Aᵣ(O)=16; Aᵣ(Ar)=40.`:`Определите относительную молекулярную массу ${name}. Aᵣ(H)=1; Aᵣ(He)=4; Aᵣ(C)=12; Aᵣ(N)=14; Aᵣ(O)=16; Aᵣ(Ar)=40.`,'',g.M,`Mᵣ = Σ Aᵣ = ${g.M}.`);break
      case 1:add(id,points,kk?'Зат мөлшері':'Количество вещества',kk?`${name} газының массасы ${n(mass)} г. M = ${g.M} г/моль. Зат мөлшерін табыңыз.`:`Масса ${name} равна ${n(mass)} г. M = ${g.M} г/моль. Найдите количество вещества.`,'моль',amount,`ν = m/M = ${n(mass)}/${g.M} = ${n(amount)} моль.`);break
      case 2:add(id,points,kk?'Газ массасы':'Масса газа',kk?`${name} газының зат мөлшері ${n(amount)} моль, M = ${g.M} г/моль. Массасын граммен табыңыз.`:`Количество вещества ${name} равно ${n(amount)} моль, M = ${g.M} г/моль. Найдите массу в граммах.`,'г',mass,`m = νM = ${n(amount)} · ${g.M} = ${n(mass)} г.`);break
      case 3:add(id,points,kk?'Бөлшектер саны':'Число частиц',kk?`${name} газының зат мөлшері ${n(amount)} моль. Бөлшектер санын 10²³ бірлігімен табыңыз. Nₐ = 6,02·10²³ моль⁻¹; тек коэффициентті енгізіңіз.`:`Количество вещества ${name} равно ${n(amount)} моль. Найдите число частиц в единицах 10²³. Nₐ = 6,02·10²³ моль⁻¹; введите только коэффициент.`,'10²³',amount*6.02,`N = νNₐ = ${n(amount)} · 6,02·10²³ = ${n(amount*6.02)}·10²³.`);break
      case 4:add(id,points,kk?'Бір бөлшектің массасы':'Масса одной частицы',kk?`${name} газы үшін M = ${g.M} г/моль. Бір бөлшектің массасын 10⁻²⁶ кг бірлігімен табыңыз. Nₐ = 6,02·10²³ моль⁻¹; тек коэффициентті енгізіңіз.`:`Для ${name} M = ${g.M} г/моль. Найдите массу одной частицы в единицах 10⁻²⁶ кг. Nₐ = 6,02·10²³ моль⁻¹; введите только коэффициент.`,'10⁻²⁶ кг',g.M/6.02,`m₀ = M/Nₐ = (${g.M}·10⁻³)/(6,02·10²³) = ${n(g.M/6.02)}·10⁻²⁶ кг.`);break
      default:add(id,points,kk?'Қалыпты жағдайдағы көлем':'Объём при нормальных условиях',kk?`${name} газының зат мөлшері ${n(amount)} моль. Қалыпты жағдайдағы көлемін табыңыз. Vₘ = 22,4 л/моль.`:`Количество вещества ${name} равно ${n(amount)} моль. Найдите объём при нормальных условиях. Vₘ = 22,4 л/моль.`,'л',amount*22.4,`V = νVₘ = ${n(amount)} · 22,4 = ${n(amount*22.4)} л.`)
    }
  })
  const c=v.concentration, cValue=c.coefficient/c.litres*10
  add('concentration',.5,kk?'Молекулалар концентрациясы':'Концентрация молекул',kk?`Көлемі ${c.litres} л ыдыста ${n(c.coefficient)}·10²³ молекула бар. Концентрацияны 10²⁵ м⁻³ бірлігімен табыңыз; тек коэффициентті енгізіңіз.`:`В сосуде объёмом ${c.litres} л находится ${n(c.coefficient)}·10²³ молекул. Определите концентрацию в единицах 10²⁵ м⁻³; введите только коэффициент.`, '10²⁵ м⁻³',cValue,`V = ${c.litres}·10⁻³ м³. n = N/V = ${n(c.coefficient)}·10²³/(${c.litres}·10⁻³) = ${n(cValue)}·10²⁵ м⁻³.`)
  const a=v.gasMass, mValue=a.kpa*a.litres*a.molarMass/(R*a.temperature)
  add('gasMass',.5,kk?'Идеал газ массасы':'Масса идеального газа',kk?`Көлемі ${a.litres} л баллонда T = ${a.temperature} К температурада, p = ${a.kpa} кПа қысымда идеал газ бар. M = ${a.molarMass} г/моль, R = 8,31 Дж/(моль·К). Газ массасын граммен табыңыз.`:`В баллоне объёмом ${a.litres} л находится идеальный газ при T = ${a.temperature} К и p = ${a.kpa} кПа. M = ${a.molarMass} г/моль, R = 8,31 Дж/(моль·К). Найдите массу газа в граммах.`,'г',mValue,`pV = (m/M)RT; m = pVM/(RT) = (${a.kpa}·10³ · ${a.litres}·10⁻³ · ${a.molarMass})/(8,31 · ${a.temperature}) = ${n(mValue)} г.`)
  const h=v.heating
  add('heating',.5,kk?'Тұрақты қысымдағы қыздыру':'Нагревание при постоянном давлении',kk?`Газдың бастапқы температурасы ${h.temperature} К. Тұрақты қысымда көлемін ${h.delta}% арттыру үшін температураны қанша кельвинге көтеру керек? Газ мөлшері өзгермейді.`:`Начальная температура газа ${h.temperature} К. На сколько кельвинов нужно повысить температуру, чтобы при постоянном давлении объём увеличился на ${h.delta}%? Количество газа неизменно.`,'К',h.temperature*h.delta/100,`V/T = const; ΔT/T₁ = ΔV/V₁ = ${h.delta}/100. ΔT = ${h.temperature} · ${h.delta}/100 = ${n(h.temperature*h.delta/100)} К.`)
  const s=v.speed, speed=Math.sqrt(3*R*s.temperature/(s.molarMass/1000))
  add('speed',.5,kk?'Орташа квадраттық жылдамдық':'Средняя квадратичная скорость',kk?`T = ${s.temperature} К температурадағы идеал газ бөлшектерінің орташа квадраттық жылдамдығын табыңыз. M = ${s.molarMass} г/моль, R = 8,31 Дж/(моль·К).`:`Найдите среднюю квадратичную скорость частиц идеального газа при T = ${s.temperature} К. M = ${s.molarMass} г/моль, R = 8,31 Дж/(моль·К).`,'м/с',speed,`vкв = √(3RT/M) = √(3 · 8,31 · ${s.temperature}/(${s.molarMass}·10⁻³)) = ${n(speed)} м/с.`)
  const x=v.mixture, M=1/(x.fraction/28+(1-x.fraction)/4), density=x.kpa*M/(R*x.temperature)
  add('mixture',.7,kk?'Газдар қоспасының тығыздығы':'Плотность смеси газов',kk?`Азот пен гелий қоспасында азоттың массалық үлесі ${n(x.fraction)}. T = ${x.temperature} К, p = ${x.kpa} кПа. Қоспаның тығыздығын кг/м³ бірлігімен табыңыз. M(N₂)=28 г/моль; M(He)=4 г/моль; R=8,31 Дж/(моль·К).`:`Смесь азота и гелия имеет массовую долю азота ${n(x.fraction)}. T = ${x.temperature} К, p = ${x.kpa} кПа. Найдите плотность смеси в кг/м³. M(N₂)=28 г/моль; M(He)=4 г/моль; R=8,31 Дж/(моль·К).`,'кг/м³',density,`1/Mсм = w/M(N₂) + (1−w)/M(He); Mсм = 1/(${n(x.fraction)}/28 + ${n(1-x.fraction)}/4) = ${n(M)} г/моль. ρ = pMсм/(RT) = ${n(density)} кг/м³.`)
  const d=v.dissociation, alpha=(d.finalKpa*d.initialK/(d.initialKpa*d.finalK)-1)*100
  add('dissociation',.7,kk?'Молекулалардың диссоциациясы':'Диссоциация молекул',kk?`Герметикалық қатты ыдыста бастапқыда тек екіатомды азот молекулалары бар. T₁=${d.initialK} К, p₁=${d.initialKpa} кПа. T₂=${d.finalK} К дейін қыздырғанда қысым p₂=${n(d.finalKpa)} кПа болды. Кейбір N₂ молекулалары екі атомға ыдырады. Бастапқы молекулалардың қандай пайызы ыдырады? Барлық бөлшектерді идеал газ деп есептеңіз.`:`В герметичном жёстком сосуде первоначально находятся только двухатомные молекулы азота при T₁=${d.initialK} К и p₁=${d.initialKpa} кПа. После нагревания до T₂=${d.finalK} К давление стало p₂=${n(d.finalKpa)} кПа. Часть молекул N₂ распалась на два атома. Какой процент первоначальных молекул распался? Все частицы считайте идеальным газом.`,'%',alpha,`N₂ → 2N. Nпосле = N₀(1−α)+2N₀α = N₀(1+α). При V = const: p₂/p₁ = (1+α)T₂/T₁; α = p₂T₁/(p₁T₂)−1 = ${n(alpha/100)}. Ответ: ${n(alpha)}%.`)
  return tasks
}
export function molecularTasks(v:MolecularVariant,lang:AssessmentLanguage='ru'):Task[] {
  return definitions(v,lang).map(({id,order,kind,title,text,points,fields})=>({id,order,kind,title,text,points,fields}))
}
export function molecularExpected(v:MolecularVariant) { return Object.fromEntries(definitions(v,'ru').map(t=>[t.id,{value:t.value,points:t.points}])) }
export function reviewMolecular(v:MolecularVariant,answers:Answers,lang:AssessmentLanguage='ru') {
  const definitionsList=definitions(v,lang)
  const tasks=definitionsList.map(({id,order,kind,title,text,points,fields,solution})=>({id,order,kind,title,text,points,fields,solution}))
  const fields=definitionsList.map(t=>{
    const submitted=answers[t.id]?.value??null
    const actual=(typeof submitted==='string'||typeof submitted==='number')&&String(submitted).trim()!==''?Number(String(submitted).trim().replace(',','.')):NaN
    const tolerance=Math.max(.005,Math.abs(t.value)*.01)
    return {taskId:t.id,taskTitle:t.title,fieldId:'value',label:t.fields[0].label,unit:t.fields[0].unit,submitted,expected:Number(t.value.toPrecision(10)),tolerance:'± max(0,005; 1%)',correct:Number.isFinite(actual)&&Math.abs(actual-t.value)<=tolerance,points:t.points}
  })
  return {tasks,fields}
}
export function gradeMolecular(v:MolecularVariant,answers:Answers) {
  const {fields}=reviewMolecular(v,answers)
  return {score:Math.round(fields.reduce((sum,f)=>sum+(f.correct?f.points:0),0)*100)/100,correctness:fields.map(f=>f.correct)}
}
