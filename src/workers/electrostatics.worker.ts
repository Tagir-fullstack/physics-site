import { createInstrumentSession } from './electrostaticsInstrument'
const instrument=createInstrumentSession()
self.onmessage=(event:MessageEvent<unknown>)=>{self.postMessage(instrument.handle(event.data))}
