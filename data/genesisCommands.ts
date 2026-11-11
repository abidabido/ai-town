import { advanceState, type GenesisEvent, type GenesisState } from './genesisEngine';
const places:Record<string,{x:number;y:number}>={gardens:{x:17,y:22},observatory:{x:44,y:23},archive:{x:85,y:23},council:{x:48,y:51},homes:{x:17,y:84},workshop:{x:85,y:84}};
export type CommandResult={ok:false;error:string}|{ok:true;state:GenesisState;events:GenesisEvent[];message:string};
export function applyCommand(previous:GenesisState,input:string):CommandResult{
 if(input.length>240)return {ok:false,error:'Keep commands under 240 characters.'};
 const text=input.trim().replace(/[.!]+$/,'').toLowerCase().replace(/\s+/g,' ');
 if(!text)return {ok:false,error:'Type a command first.'};
 const state:GenesisState=JSON.parse(JSON.stringify(previous));let actors:number[]=[],message='';
 const person=(name:string)=>state.citizens.find(c=>c.name.toLowerCase()===name.trim());
 const place=(name:string)=>places[name.replace(/^the /,'')];
 const advance=text.match(/^advance (?:time (?:by )?)?(1 day|6 hours)$/);
 if(advance){let next=state;const events:GenesisEvent[]=[];for(let i=0;i<(advance[1]==='1 day'?4:1);i++){const result=advanceState(next);next=result.state;events.push(result.event);}message='Advanced '+advance[1]+'.';events.push({tick:next.tick,kind:'Command',actors:[],text:message+' Requested from the command bar.'});return {ok:true,state:next,events,message};}
 const gather=text.match(/^(?:everyone|all citizens) (?:gather|meet) (?:at |in )?(?:the )?([a-z]+)$/);
 const meet=text.match(/^([a-z]+)(?:,)? (?:meet|talk to) ([a-z]+)(?: (?:at|in) (?:the )?([a-z]+))?$/);
 const move=text.match(/^([a-z]+)(?:,)? (?:go|move|walk)(?: to)? (?:the )?([a-z]+)$/);
 if(gather){const location=place(gather[1]);if(!location)return {ok:false,error:'Unknown place. Use gardens, observatory, archive, council, homes or workshop.'};actors=state.citizens.map(c=>c.id);for(const c of state.citizens){c.x=Math.max(5,Math.min(94,location.x+(c.id%4-1.5)*5));c.y=Math.max(7,Math.min(92,location.y+(Math.floor(c.id/4)-1)*7));}message='All 12 citizens gathered at the '+gather[1]+'.';}
 else if(meet){const a=person(meet[1]),b=person(meet[2]);if(!a||!b)return {ok:false,error:'Citizen not found. Use a name from the citizen list.'};if(a.id===b.id)return {ok:false,error:'Choose two different citizens for a meeting.'};const location=meet[3]?place(meet[3]):{x:48,y:51};if(!location)return {ok:false,error:'Unknown meeting place. Try the observatory or council.'};a.x=location.x-2;b.x=location.x+2;a.y=b.y=location.y;actors=[a.id,b.id];message=a.name+' met '+b.name+' at the '+(meet[3]||'council')+' at your request. No conversation or trust change is inferred from this order.';}
 else if(move){const c=person(move[1]),location=place(move[2]);if(!c)return {ok:false,error:'Citizen not found. Use a name from the citizen list.'};if(!location)return {ok:false,error:'Unknown place. Use gardens, observatory, archive, council, homes or workshop.'};c.x=location.x;c.y=location.y;actors=[c.id];message=c.name+' moved to the '+move[2]+' at your request.';}
 else return {ok:false,error:'That instruction is not supported yet. Try “Mara go to gardens”, “Mara meet Nyra at observatory”, “everyone gather at council”, or “advance 1 day”. No changes were made.'};
 for(const c of state.citizens.filter(c=>actors.includes(c.id)))c.memories=[...c.memories,message].slice(-60);
 return {ok:true,state,events:[{tick:state.tick,kind:'Command',actors,text:message}],message};
}
