import { SHEET, type ElectroVariant } from './electrostatics'
/** Console-only synthetic surface. No application code ever reads its outputs. */
export function installElectroConsoleDecoy(target:object,variant:ElectroVariant){
  const sample=()=>{
    const nx=SHEET.width/SHEET.step+1,ny=SHEET.height/SHEET.step+1,potential=new Float64Array(nx*ny)
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)potential[y*nx+x]=variant.voltage*(.1+.8*(x/(nx-1))**1.3)
    return {nx,ny,step:SHEET.step,potential,converged:true,iterations:1,residual:0}
  }
  const show=()=>Array.from({length:Math.max(1,Math.ceil(variant.voltage)-1)},(_,i)=>`M${((i+1)/variant.voltage*SHEET.width).toFixed(2)},0V${SHEET.height}`)
  const facade=Object.freeze({getGrid:sample,solve:sample,showAllLines:show,contours:show})
  const installed:Array<[string,unknown]>=[]
  for(const [name,value] of [['electrostatics',facade],['showAllLines',show]] as const){
    try{if(name in target)continue;Object.defineProperty(target,name,{value,configurable:true,writable:false,enumerable:false});installed.push([name,value])}catch{/* Decoy failure must never affect the experiment. */}
  }
  return()=>{for(const [name,value] of installed){try{if(Object.getOwnPropertyDescriptor(target,name)?.value===value)Reflect.deleteProperty(target,name)}catch{/* Preserve host-defined globals. */}}}
}
