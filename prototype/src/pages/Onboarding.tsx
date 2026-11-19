import {useState} from "react";
import {Link} from "react-router-dom";
import {OnboardingBoard} from "../onboarding/board";
import {makeTasks,matchesTemplate,revisePlan,type OnboardingAction,type Viewer} from "../onboarding/model";
import {useDemo} from "../lib/store";
export function OnboardingDemo({admin=false}:{admin?:boolean}){
 const {onboarding,saveOnboarding}=useDemo(),[manager,setManager]=useState(false),[error,setError]=useState("");
 const viewer:Viewer=admin?(manager?{role:"Manager",employeeId:"manager"}:{role:"HR",employeeId:null}):{role:"Employee",employeeId:"designer"};
 const visible={...onboarding,plans:onboarding.plans.filter(p=>viewer.role==="HR"||p.employeeId===viewer.employeeId||(manager&&onboarding.people.find(e=>e.id===p.employeeId)?.managerId===viewer.employeeId))};
 async function send(c:OnboardingAction){
 try{
 let next=onboarding;
 if(c.action==="template"){if(viewer.role!=="HR")throw Error("HR access required");if(onboarding.templates.some(t=>t.name===c.name))throw Error("Template name already exists");next={...next,templates:[...next.templates,{...c,id:crypto.randomUUID()}]};}
 else{
 const p=onboarding.people.find(p=>p.id===c.employeeId)!,existing=visible.plans.find(plan=>plan.employeeId===p.id);
 if(c.action==="start"){if(viewer.role!=="HR")throw Error("HR access required");const t=onboarding.templates.find(t=>t.id===c.templateId)!;if(!matchesTemplate(p,t)||(!p.managerId&&t.definitions.some(d=>d.owner==="Manager")))throw Error("Check template scope and reporting manager");
 if(existing&&existing.templateId!==t.id)throw Error("A different plan already exists");
 if(!existing)next={...next,plans:[...next.plans,{employeeId:p.id,templateId:t.id,startedFor:p.joined,tasks:makeTasks(t,p.joined),revision:1,closedAt:null,buddyId:null}]};}
 else{if(!existing)throw Error("Plan not found");const updated=revisePlan(existing,p,viewer,c,new Date().toISOString(),viewer.employeeId??"hr");next={...next,plans:next.plans.map(plan=>plan.employeeId===p.id?updated:plan),people:next.people.map(e=>e.id===p.id&&c.action==="reschedule"?{...e,joined:c.day}:e)};}
 }
 saveOnboarding(next);setError("");return true;
 }catch(e){setError((e as Error).message);return false;}
 }
 return <div className="space-y-4"><div className="flex flex-wrap gap-4">{admin&&<label>Demo role<select value={manager?"manager":"hr"} onChange={e=>setManager(e.target.value==="manager")}><option value="hr">HR</option><option value="manager">Reporting manager</option></select></label>}<Link className="text-indigo underline" to={admin?"/me/onboarding":"/admin/onboarding"}>{admin?"Open new hire demo":"Open HR demo"}</Link></div>{error&&<p role="alert">{error}</p>}<OnboardingBoard viewer={viewer} data={visible} send={send} initialEmployee="designer"/></div>;
}
