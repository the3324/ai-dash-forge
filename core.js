export const IDS={block:1,spike:8,platform:1,speedSlow:200,speedNormal:201,speedFast:202,speedFaster:203,gravityUp:10,gravityDown:11,wavePortal:660,cubePortal:12,shipPortal:13,ballPortal:47,ufoPortal:111,robotPortal:745,spiderPortal:1331};
const diffScale={easy:.45,normal:.7,hard:1,harder:1.3,insane:1.65,demon:2.05};
const lengthUnits={short:1800,medium:3600,long:5400};
export function hashSeed(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
export function rng(seed){let a=hashSeed(seed);return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export function parsePrompt(prompt){const p=prompt.toLowerCase();return {fast:/fast|speed|rapid|nine circles/.test(p),wave:/wave|nine circles/.test(p),rhythm:/rhythm|beat|music/.test(p),long:/long|endurance|epic/.test(p),hardEnding:/ending|final|finish|challenging/.test(p),gravity:/gravity|flipped|upside/.test(p)}}
export function generateLevel(options={}){
 const {prompt='',difficulty='hard',length='medium',mode='cube',density=55,seed='849201'}=options;
 let last=null;
 for(let attempt=0;attempt<12;attempt++){
  const candidate=buildCandidate({...options,prompt,difficulty,length,mode,density,seed:attempt?`${seed}:route:${attempt}`:seed});
  candidate.seed=String(seed);
  candidate.variant=attempt;
  const report=validateLevel(candidate);
  candidate.playability=report[0];
  last=candidate;
  if(report[0].severity!=='unreachable')return candidate;
 }
 return last;
}
function buildCandidate({prompt='',difficulty='hard',length='medium',mode='cube',density=55,seed='849201'}={}){
 const random=rng(seed), intent=parsePrompt(prompt), scale=diffScale[difficulty]||1, total=lengthUnits[length]||3600;
 const gap= Math.max(100,Math.round((255-75*scale)*(intent.fast?.82:1))), objectChance=Math.min(.95,(.22+density/120)*scale), sections=[],objects=[];const sectionCount=length==='short'?3:length==='long'?6:4;const sectionSize=total/sectionCount;
 const portalModes=mode==='wave'?[['wave',IDS.wavePortal]]:mode==='mixed'?[['cube',IDS.cubePortal],['ship',IDS.shipPortal],['wave',IDS.wavePortal],['ball',IDS.ballPortal]]:[];
 for(let s=0;s<sectionCount;s++){
  const start=s*sectionSize,end=(s+1)*sectionSize,progress=s/(sectionCount-1);sections.push({start,end,label:['Warmup','Build','Peak','Finale','Afterburn','Outro'][s]||`Section ${s+1}`,difficulty:Math.max(.25,scale*(.65+progress*.55))});
  if(s>0&&portalModes.length){const [m,id]=portalModes[(s-1)%portalModes.length];objects.push({id,x:start+15,y:15,type:'portal',mode:m,section:s})}
  if(intent.fast&&s%2===1)objects.push({id:progress>.6?IDS.speedFast:IDS.speedNormal,x:start+135,y:15,type:'speed',section:s});
  if(intent.gravity&&s===Math.floor(sectionCount/2))objects.push({id:IDS.gravityUp,x:start+195,y:15,type:'gravity',section:s});
  const before=objects.length;
  for(let x=start+150;x<end-130;x+=gap){if(random()>objectChance)continue;const r=random();
   if(r<.19){const h=1+Math.floor(random()*Math.min(3,Math.ceil(scale)));for(let j=0;j<h;j++)objects.push({id:IDS.block,x:x+15,y:15+j*30,type:'block',section:s})}
   else if(r<.29&&scale<1.2){objects.push({id:IDS.platform,x:x+15,y:15,type:'platform',section:s})}
   else {const count=1+(scale>1.2&&random()<.48?1:0)+(scale>1.7&&random()<.3?1:0);for(let j=0;j<count;j++)objects.push({id:IDS.spike,x:x+15+j*30,y:15,type:'spike',section:s})}
   if(random()<.13)objects.push({id:IDS.block,x:x+45,y:45+Math.floor(random()*2)*30,type:'block',section:s});
  }
  if(objects.length===before){const x=Math.round((start+end)/2/30)*30+15;objects.push({id:IDS.spike,x,y:15,type:'spike',section:s})}
 }
 objects.sort((a,b)=>a.x-b.x||a.y-b.y);return {name:makeName(prompt,seed),prompt,difficulty,length,mode,density,seed:String(seed),total,sections,objects,version:1};
}
function makeName(prompt,seed){const words=prompt.match(/[A-Za-z]{4,}/g)||[];const title=words.slice(0,2).map(x=>x[0].toUpperCase()+x.slice(1).toLowerCase()).join(' ');return title?`${title} ${['Forge','Rush','Circuit'][hashSeed(seed)%3]}`:'Neon Afterburn'}
export function objectString(objects){return objects.map(o=>`1,${o.id},2,${fmt(o.x)},3,${fmt(o.y)}`).join(';')+';'}
export function innerLevelString(objects){return 'kA13,0,kA15,0,kA16,0,kA14,,kA6,1,kA7,1,kA17,1,kA18,0,kS39,0,kA2,0,kA3,0,kA8,0,kA4,0,kA9,0,kA10,0,kA11,0;'+objectString(objects)}
const fmt=n=>Number(n).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
// Approximate fixed-step cube reachability checker. It deliberately reports a
// simulated route, never a guarantee: GD collision/physics have edge cases.
function simulateCube(level){
 const unsupported=level.mode!=='cube'||level.objects.some(o=>o.type==='portal'||o.type==='gravity');
 if(unsupported)return {severity:'manual',x:0,message:'This layout uses mode or gravity changes the checker does not simulate. Playtest it in Geometry Dash.'};
 const dt=.225,baseDx=1.298,gravity=.2156,jump=11.18,maxStates=700;
 const speedChanges=level.objects.filter(o=>o.type==='speed').sort((a,b)=>a.x-b.x);const speedAt=pos=>{let id=201;for(const c of speedChanges){if(c.x>pos)break;id=c.id}return ({200:.7,201:1,202:1.2,203:1.4})[id]||1};
 const colliders=level.objects.filter(o=>['spike','block','platform'].includes(o.type));
 let states=[{y:15,v:0,ground:true,support:0}],x=0,steps=0;
 const key=s=>`${Math.round(s.y*2)}:${Math.round(s.v*2)}:${s.ground?1:0}:${Math.round(s.support/30)}`;
 while(x<level.total&&steps++<Math.ceil(level.total/(baseDx*.7))+5){
  const nx=x+baseDx*speedAt(x),next=new Map(),nearby=colliders.filter(o=>Math.abs(nx-o.x)<=21),supportNearby=colliders.filter(o=>o.type!=='spike'&&Math.abs(nx-o.x)<30);
  for(const old of states){
   for(const doJump of (old.ground?[false,true]:[false])){
    let s={...old}; if(doJump)s.v=jump;
    if(s.ground&&!doJump){const support=supportNearby.some(o=>o.y+15===s.support);if(!support){s.ground=false;s.v=0}}
    if(!s.ground){s.v=Math.max(-15,s.v-gravity);s.y+=s.v*dt}
    let dead=false,landed=false;
    for(const o of nearby){
     if(o.type==='spike'){
      // Conservative triangle hit check against a small player box.
      const rel=Math.max(0,Math.abs(nx-o.x)-6),top=o.y+15-rel;
      if(s.y-12<top&&s.y+12>o.y-15+rel){dead=true;break}
     }else{
      const left=o.x-15,right=o.x+15,bottom=o.y-15,top=o.y+15;
      const oldBottom=old.y-12,newBottom=s.y-12;
      if(oldBottom>=top&&newBottom<=top&&s.v<=0){s.y=top+12;s.v=0;s.ground=true;s.support=top;landed=true;}
      else if(nx+6>left&&nx-6<right&&s.y+12>bottom&&s.y-12<top){dead=true;break}
     }
    }
    if(!dead&&s.y<3){s.y=15;s.v=0;s.ground=true;s.support=0}
    if(!dead&&s.y>1000)dead=true;
    if(!dead)next.set(key(s),s);
   }
  }
  if(!next.size)return {severity:'unreachable',x:nx,message:`No collision-free route found by the approximate cube simulator near X ${Math.round(nx)}. Edit or regenerate this layout, then test in game.`};
  states=[...next.values()];if(states.length>maxStates)states=states.filter((_,i)=>i%Math.ceil(states.length/maxStates)===0).slice(0,maxStates);x=nx;
 }
 return {severity:'route',x:level.total,message:'A route was found by the approximate cube simulator (speed changes are simplified). This is not a guarantee; verify the level in Geometry Dash.'};
}
export function validateLevel(level){return [simulateCube(level)]}
export function plistXML(level,options={}){const inner=innerLevelString(level.objects);const d=options.description||'Procedurally generated with AI Dash Forge';const key=(k,v)=>`<k>${k}</k><s>${xmlEscape(v)}</s>`;const integer=(k,v)=>`<k>${k}</k><i>${v}</i>`;const bool=(k,v)=>`<k>${k}</k><${v?'t':'f'} />`;return `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0" gjver="2.0"><dict><k>kCEK</k><i>4</i>${integer('k18',0)}${integer('k36',0)}${key('k2',level.name)}${key('k4',options.innerEncoded||inner)}${key('k3',encodeB64(new TextEncoder().encode(d)))}${key('k5','Player')}${bool('k13',true)}${bool('k14',false)}${bool('k15',false)}${integer('k21',2)}${integer('k16',1)}${integer('k17',22)}${integer('k23',Math.min(4,Math.ceil(level.total/1000)))}${bool('k25',false)}${integer('k26',0)}${bool('k33',false)}${integer('k39',Math.floor(inner.length*.152))}${integer('k40',35)}${bool('k47',true)}${integer('k48',level.objects.length)}${integer('k50',42)}${integer('kA2',0)}${integer('kA4',0)}${integer('kA6',1)}${integer('kA7',1)}${integer('kA9',0)}${integer('kA13',0)}${integer('kA14',0)}${integer('kA15',0)}</dict></plist>`}
const xmlEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function encodeB64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_')}
function decodeB64(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function gzip(bytes){const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));return new Uint8Array(await new Response(stream).arrayBuffer())}
async function gunzip(bytes){const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));return new Uint8Array(await new Response(stream).arrayBuffer())}
export async function makeGdlvl(level){const inner=innerLevelString(level.objects),innerZip=await gzip(new TextEncoder().encode(inner));const xml=plistXML(level,{innerEncoded:encodeB64(innerZip)});const outer=await gzip(new TextEncoder().encode(xml));const base64=encodeB64(outer);return {bytes:new TextEncoder().encode(base64),base64,xml,inner,filename:`${level.name.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'level'}.gdlvl`}}
export async function verifyGdlvl(bytes,expectedObjects){const encoded=new TextDecoder().decode(bytes).trim();const xml=new TextDecoder().decode(await gunzip(decodeB64(encoded)));const match=xml.match(/<k>k4<\/k><s>([\s\S]*?)<\/s>/);if(!match)throw Error('Missing k4 level data');const inner=new TextDecoder().decode(await gunzip(decodeB64(match[1])));const records=inner.split(';').filter(r=>r.startsWith('1,'));if(records.length!==expectedObjects)throw Error(`Object count mismatch (${records.length}/${expectedObjects})`);for(const record of records){const pairs=record.split(',');if(pairs.length%2||pairs[0]!=='1'||pairs[2]!=='2'||pairs[4]!=='3')throw Error('Malformed native object record')}return {xmlBytes:new TextEncoder().encode(xml).length,objectCount:records.length,inner}}
