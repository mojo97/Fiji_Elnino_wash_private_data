// Pure, allowlisted transformation. Never includes respondent or assessor details.
import {createHash} from 'node:crypto';
export const forms=[{id:'kii',uid:'aZvqz7R9zVibkcfbztSBV5',type:'community',name:'Drought WASH key informant interviews'},{id:'schools',uid:'a2Ek6rZt53SBubxeKudgE9',type:'school',name:'Water supply in schools'},{id:'households',uid:'aQ6xpET4Q9r2i6W4WPi7oa',type:'household',name:'Household drought WASH'},{id:'community',uid:'aAQy4uuxidWA8YE4DGFbhz',type:'community',name:'Community water sources'},{id:'health',uid:'arH2TJ9dqQ3skWjiJKkSeM',type:'health',name:'Health care facilities'}];
export const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function values(row,field){const out=[];for(const [k,v]of Object.entries(row)){if(k===field||k.endsWith('/'+field)){if(typeof v!=='object')out.push(v);}if(Array.isArray(v))for(const a of v)if(a&&typeof a==='object')out.push(...values(a,field));}return out;}
const one=(r,n)=>values(r,n)[0];
const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,24);
function choiceLabel(schema,field,value){const q=schema.survey.find(x=>x.name===field),c=schema.choices.find(c=>c.list_name===q?.select_from_list_name&&c.name===value);const label=c?.label;return Array.isArray(label)?label[0]:label||value;}
export function normalizeResponses(form,raw,schema,tikinas){const out=[],issues={unmatchedTikina:0,invalidDate:0,noStableHousehold:0,invalidPopulation:0,testExcluded:0,noConsent:0};
 for(const r of raw){if(form.id==='households'&&one(r,'consent')!=='yes'){issues.noConsent++;continue;}
 const prov=choiceLabel(schema,'Province',one(r,'Province')),tik=choiceLabel(schema,'tikina',one(r,'tikina'));const match=tikinas.find(t=>norm(t.province)===norm(prov)&&norm(t.tikina)===norm(tik));
 if(!match){issues.unmatchedTikina++;continue;}
 const community=String(one(r,'community')||'').trim(),name=community||String(one(r,form.id==='health'?'hcf_name':'school_name')||'');if(/^(test|testing|training|dummy|demo)(\b|[_ -])/i.test(name)){issues.testExcluded++;continue;}
 const date=new Date(r.start||r._submission_time);if(!Number.isFinite(date.getTime())||date.getTime()>Date.now()+86400000){issues.invalidDate++;continue;}
 const communityKey=match.id+'|'+norm(community);let entity=communityKey;
 if(form.id==='households'){const code=one(r,'household_code');if(!code||!community){issues.noStableHousehold++;continue;}entity=communityKey+'|'+norm(code);}
 else if(form.type==='school'||form.type==='health'){if(!name){issues.unmatchedTikina++;continue;}entity=match.id+'|'+norm(one(r,'school_id')||name);}
 else if(!community){issues.unmatchedTikina++;continue;}
 const sourceField=form.id==='kii'?'q15':form.id==='households'?'source_now':form.id==='community'?'source_type':'primary_sources';const codes=values(r,sourceField).flatMap(v=>String(v||'').split(/\s+/));
 const rainCode=form.id==='schools'?'v5':form.id==='health'?'v4':'rainwater',boreCode=form.id==='schools'?'v4':form.id==='health'?'v2':'borehole';const rain=codes.includes(rainCode),bore=codes.includes(boreCode);
 let noWater=null,reduced=null;
 if(form.id==='community'||form.id==='households'){const supply=one(r,form.id==='community'?'supply_status':'source_supply');if(['none','normal','reduced'].includes(supply)){noWater=supply==='none';reduced=supply==='reduced';}}
 else if(form.id==='kii'){const v=one(r,'q17');if(['zero','d1_2','d3_4','d5_6','daily'].includes(v)){noWater=v==='zero';reduced=!['zero','daily'].includes(v);}}
 else {const v=one(r,'reliability');if(['always','sometimes','unavailable'].includes(v)){noWater=v==='unavailable';reduced=v==='sometimes';}}
 const shortage=noWater===true||reduced===true||(form.id==='households'&&one(r,'enough_all')==='no');let population=null,affected=null;
 if(form.id==='community'){population=num(one(r,'community_population'));affected=num(one(r,'people_affected'));if(affected!==null&&population!==null&&affected>population){issues.invalidPopulation++;affected=null;}}
 if(form.id==='households'){const ns=['f_5','f_17','f_59','f_60','m_5','m_17','m_59','m_60'].map(n=>num(one(r,n)));if(ns.every(n=>n!==null))population=ns.reduce((a,b)=>a+b,0);if(population!==null&&population>100){population=null;issues.invalidPopulation++;}affected=shortage?population:0;}
 out.push({sourceId:form.id,type:form.type,tikinaId:match.id,communityKey,locationName:name,reportedTikina:tik,reportedProvince:prov,entityKey:hash(entity),observedAt:date.toISOString(),dateBasis:r.start?'interview_start':'submission_fallback',rain,bore,noWater,reduced,shortage,population,affected});
 }const latest=new Map();for(const r of out){const old=latest.get(r.entityKey);if(!old||r.observedAt>old.observedAt)latest.set(r.entityKey,r);}return {records:[...latest.values()],issues,duplicatesRemoved:out.length-latest.size};
}
export function aggregateForPublication(records,sources,now=new Date()){
 const groups=new Map();for(const r of records){const date=r.observedAt.slice(0,10),key=[r.tikinaId,r.sourceId,date].join('::');if(!groups.has(key))groups.set(key,{tikinaId:r.tikinaId,sourceId:r.sourceId,type:r.type,observedDate:date,reports:0,rain:0,bore:0,dependent:0,noWater:0,reduced:0,shortage:0,dependentShortage:0,unknownSupply:0,affectedReported:0,affectedReportedCoverage:0,householdMembersAffected:0,householdPopulationCoverage:0});const a=groups.get(key);a.reports++;a.rain+=+r.rain;a.bore+=+r.bore;a.dependent+=+(r.rain||r.bore);a.noWater+=+(r.noWater===true);a.reduced+=+(r.reduced===true);a.shortage+=+r.shortage;a.dependentShortage+=+((r.rain||r.bore)&&r.shortage);a.unknownSupply+=+(r.noWater===null);if(r.sourceId==='community'&&r.affected!==null){a.affectedReported+=r.affected;a.affectedReportedCoverage++;}if(r.type==='household'&&r.affected!==null){a.householdMembersAffected+=r.affected;a.householdPopulationCoverage++;}}
 // Only Tikina/source/day aggregates leave private processing; no names, GPS, keys or free text.
 const published=[...groups.values()].map(g=>g.type==='household'&&g.reports<5?{...g,householdMembersAffected:null,householdPopulationCoverage:0,householdSuppressed:true}:g);
 return {schemaVersion:2,generatedAt:now.toISOString(),sources,groups:published,privacy:'Tikina aggregates only; no household identity, names, GPS, facility names or free text. Household-member counts suppressed in Tikina/source/day groups with fewer than five reports. Population measures are separate and must not be added.',interpretation:'Non-probability assessment coverage. Do not extrapolate observed dependency or shortage rates to all Tikina residents. Community affected reports deduplicated by exact canonical community within the community-water form; unreviewed aliases may remain. Household members are a separate surveyed-household measure.'};
}
