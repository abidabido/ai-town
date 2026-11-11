const fs=require('fs'),os=require('os'),ts=require('typescript'),assert=require('assert/strict');
const dir=fs.mkdtempSync(os.tmpdir()+'/genesis-commands-');
for(const name of ['genesis','genesisEngine','genesisCommands'])fs.writeFileSync(dir+'/'+name+'.js',ts.transpileModule(fs.readFileSync('data/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText);
const {initialState}=require(dir+'/genesisEngine.js'),{applyCommand}=require(dir+'/genesisCommands.js');
const start=initialState(),snapshot=JSON.stringify(start);
for(const input of ['', 'Mara meet Mara','Unknown go to gardens','everyone gather at nowhere','advance 100 days','erase the world','x'.repeat(241),'process.exit()']){const r=applyCommand(start,input);assert.equal(r.ok,false,input);assert.equal(JSON.stringify(start),snapshot);}
const move=applyCommand(start,'  mArA, GO to THE gardens! ');assert.equal(move.ok,true);assert.equal(move.state.tick,0);assert.equal(move.state.citizens[0].x,17);assert.equal(move.events.length,1);assert.deepEqual(move.events[0].actors,[0]);assert.equal(move.state.citizens[0].memories.length,1);
const meet=applyCommand(start,'Mara meet Nyra at the observatory');assert.equal(meet.ok,true);assert.equal(meet.state.citizens[0].y,meet.state.citizens[8].y);assert.notEqual(meet.state.citizens[0].x,meet.state.citizens[8].x);assert.deepEqual(meet.state.trust,start.trust);assert.deepEqual(meet.events[0].actors,[0,8]);
const gather=applyCommand(start,'everyone gather at council');assert.equal(gather.ok,true);assert.equal(gather.events[0].actors.length,12);assert.equal(new Set(gather.state.citizens.map(c=>c.x+':'+c.y)).size,12);
const day=applyCommand(start,'advance 1 day');assert.equal(day.ok,true);assert.equal(day.state.tick,4);assert.equal(day.events.length,5);assert.equal(day.events[4].kind,'Command');assert.equal(applyCommand(start,'advance time by 6 hours').state.tick,1);
const capped=initialState();capped.citizens[0].memories=Array(60).fill('Prior experience');assert.equal(applyCommand(capped,'Mara go to gardens').state.citizens[0].memories.length,60);
assert.equal(JSON.stringify(start),snapshot);console.log('PASS: command validation, case handling, movement, meeting without fabricated trust, gathering, time advancement, bounded memories and unchanged input.');
