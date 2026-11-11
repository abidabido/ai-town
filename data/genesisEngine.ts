import { GenesisCitizens } from './genesis';
export type Citizen={id:number;name:string;faction:string;conviction:number;openness:number;x:number;y:number;memories:string[]};
export type GenesisState={tick:number;seed:number;supplies:number;project:number;governance:string;citizens:Citizen[];trust:Record<string,number>};
export type GenesisEvent={tick:number;kind:string;actors:number[];text:string};
export const pairKey=(a:number,b:number)=>[a,b].sort((x,y)=>x-y).join(':');
const bound=(n:number)=>Math.max(0,Math.min(100,n));
export function initialState():GenesisState{return {tick:0,seed:271828,supplies:60,project:0,governance:'Informal gathering',trust:{},citizens:GenesisCitizens.map((c,id)=>({id,name:c.name,faction:c.faction,conviction:65,openness:45+(id%4)*8,x:18+(id%4)*21,y:22+Math.floor(id/4)*25,memories:[]}))};}
export function advanceState(previous:GenesisState):{state:GenesisState;event:GenesisEvent}{
 const state:GenesisState=JSON.parse(JSON.stringify(previous));state.tick++;
 const random=()=>{state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;return state.seed/4294967296;};
 const a=state.citizens[Math.floor(random()*12)];let b=state.citizens[Math.floor(random()*11)];if(b.id>=a.id)b=state.citizens[b.id+1];
 const key=pairKey(a.id,b.id);const before=state.trust[key]||0;const shared=a.faction===b.faction;
 const draw=random();let kind:string,text:string,change:number;
 state.supplies=bound(state.supplies-2);
 if(state.supplies<35||draw<0.25){kind='Cooperation';change=9;state.supplies=bound(state.supplies+10);state.project=bound(state.project+6);text=a.name+' and '+b.name+' share work at the gardens. Supplies rise, and cooperation strengthens their trust.';}
 else if(draw<0.55){kind='Observation';change=5;const who=a.openness>=b.openness?a:b;who.conviction=bound(who.conviction-2);who.openness=bound(who.openness+2);text=a.name+' and '+b.name+' compare an observation at the observatory. '+who.name+' becomes less certain of their starting view and more open to alternatives.';}
 else if(draw<0.82){kind='Debate';const civil=random()<(a.openness+b.openness)/200;change=civil?5:-8;a.openness=bound(a.openness+(civil?1:-1));b.openness=bound(b.openness+(civil?1:-1));text=a.name+' and '+b.name+' debate '+(shared?'different interpretations within '+a.faction:'their competing views')+'. '+(civil?'They leave with more mutual trust.':'The exchange ends in tension.');}
 else {kind='Disagreement';change=shared?-3:-9;a.conviction=bound(a.conviction+1);b.conviction=bound(b.conviction+1);text=a.name+' and '+b.name+' disagree over how the community should allocate supplies. Both become more committed to their positions.';}
 state.trust[key]=Math.max(-100,Math.min(100,before+change));
 if(before<30&&state.trust[key]>=30){kind='Alliance';text+=' Their accumulated trust forms an alliance.';}
 if(before>-20&&state.trust[key]<=-20){kind='Conflict';text+=' A continuing conflict is now recorded.';}
 if(state.project===100&&previous.project<100){kind='Milestone';text+=' The shared archive is complete: a permanent community milestone.';}
 const allies=Object.values(state.trust).filter(t=>t>=30).length;
 if(allies>=4&&state.governance==='Informal gathering'){state.governance='Voluntary council';text+=' Four alliances support the formation of a voluntary council.';}
 for(const c of [a,b]){c.x=12+random()*76;c.y=15+random()*65;c.memories=[...c.memories,text].slice(-60);}
 return {state,event:{tick:state.tick,kind,actors:[a.id,b.id],text}};
}
