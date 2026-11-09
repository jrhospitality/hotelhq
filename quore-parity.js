/* HotelHQ · Quore parity pack (guest requests, search & history, log sheets, room notices,
   deep cleans, corporate reports, audit trail, Quore CSV import). EN/ES.
   Signed-in hotels read and write the shared Supabase tables. Demo mode (no session)
   keeps the EXAMPLE rows in localStorage and does not call the database.
   No real guest names: guests are stored by room + last initial only. */
(function(){
"use strict";
const B=(en,es)=>bx(en,es),H=escH,AR=()=>authRole();
const isCorp=()=>AR()==="Above Property",isMgr=()=>["GM","AGM","Above Property"].includes(AR());
const nowIso=()=>new Date().toISOString();
const agoIso=m=>new Date(Date.now()-m*60000).toISOString();
const fmt=iso=>{const d=new Date(iso);return isNaN(d)?"":d.toLocaleString(localeTag(),{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})};
const mins=(a,b)=>Math.round(((b?new Date(b):new Date())-new Date(a))/60000);
const dur=m=>m<60?m+" min":m<1440?(m/60).toFixed(1)+" h":(m/1440).toFixed(1)+" d";
const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const addDays=(s,n)=>{const d=new Date(s+"T12:00:00");d.setDate(d.getDate()+n);return ymd(d)};
const today=()=>ymd(new Date());
const dayDiff=(a,b)=>Math.round((new Date(a+"T12:00:00")-new Date(b+"T12:00:00"))/864e5);
const exPill=x=>x&&x.ex?` <span class="pill OD">${B("EXAMPLE","EJEMPLO")}</span>`:"";
function Q(h){const d=h?S.h[h]:D();d.qp=d.qp||{};const q=d.qp;["au","imp"].forEach(k=>q[k]=q[k]||[]);q.hist=q.hist||{wo:[],pm:[],assets:[]};return q}
function nid(a){return (a||[]).reduce((m,x)=>Math.max(m,+x.id||0),0)+1}
const f4=(a,k)=>a.find(x=>x[0]===k)||a[0];
const QP=window.QP={};

/* ---------- (10) audit trail ---------- */
function audit(ent,id,act,from,to,note,h){const q=Q(h);q.au.unshift({at:nowIso(),by:cw(),role:AR(),hotel:h||S.hotel,ent,id:String(id==null?"":id),act,from:from==null?"":String(from),to:to==null?"":String(to),note:note||""});if(q.au.length>800)q.au.length=800}
function wrap(name,fn){const o=window[name];if(typeof o!=="function")return;window[name]=function(){const a=[].slice.call(arguments);let called=false;const oo=function(){called=true;return o.apply(null,arguments)};try{return fn.apply(null,[oo].concat(a))}catch(e){console.warn("audit wrap",name,e);if(!called)return o.apply(null,a)}}}
wrap("woSet",(o,i,v)=>{const w=D().wo[i];const f=w&&w.s;if(w&&v==="Done"&&f!=="Done")w.doneAt=nowIso();if(w&&!w.at)w.at=nowIso();o(i,v);if(w&&f!==v)audit("wo",w.id,"status",f,v,"Rm "+w.room)});
wrap("addW",o=>{const n=D().wo.length;o();const w=D().wo[0];if(D().wo.length>n&&w){w.at=w.at||nowIso();audit("wo",w.id,"created","",w.s,(w.room||"")+" · "+String(w.t||"").slice(0,60));save()}});
wrap("giStatus",(o,id,st)=>{const g=giList().find(x=>x.id===id),f=g&&g.st;o(id,st);if(g&&f!==st){audit("gi",id,"status",f,st,"Rm "+g.room);if(g.qp){const r=grList().find(x=>x.id===g.qp);if(r&&st==="done"&&r.st!=="done"){r.st="done";r.doneAt=nowIso()}if(r&&st!=="done"&&r.st==="done"){r.st="ack";r.doneAt=""}}save()}});
wrap("giLoopSave",(o,id,action)=>{const g=giList().find(x=>x.id===id),from=g?g.st:"",before=g?JSON.stringify({st:g.st,n:(g.loops||[]).length,loop:g.loop&&g.loop.at}):"";const res=o(id,action);const g2=giList().find(x=>x.id===id),after=g2?JSON.stringify({st:g2.st,n:(g2.loops||[]).length,loop:g2.loop&&g2.loop.at}):"";if(before!==after){audit("gi",id,"follow-up",from,g2?g2.st:"","Rm "+(g2?g2.room:"")+(action?" · "+action:""));save()}return res});
wrap("giRecSet",(o,id,v)=>{const g=giList().find(x=>x.id===id),f=g&&g.rec;o(id,v);audit("gi",id,"recovery",f,v);save()});
wrap("giPost",o=>{const n=giList().length;o();if(giList().length>n){const g=giList()[0];audit("gi",g.id,"created","",g.st,"Rm "+g.room);save()}});
wrap("setRoomFlow",(o,n,status,extra)=>{const r=D().rooms.find(x=>x.n==n),f=r?roomFlow(r):"";const res=o(n,status,extra);if(r&&f!==status){audit("room",n,"status",f,status);save()}return res});
wrap("asg",(o,n,a)=>{const r=D().rooms.find(x=>x.n==n),f=r&&r.hk;o(n,a);audit("room",n,"assigned",f,a);save()});
wrap("pmD",(o,i,c)=>{const e=pmToday()[i];o(i,c);if(e){audit("pm",e.room,c?"completed":"reopened","","",B("Guestroom PM","PM de habitación"));save()}});
wrap("pmT",(o,i,c)=>{const p=D().pm[i];o(i,c);if(p){audit("pm",p.a,c?"completed":"reopened");save()}});

/* ---------- (2) guest requests & complaints ---------- */
const GR_CAT=[["towels","Towels / linens","Toallas / ropa de cama","Housekeeping"],["amen","Amenities","Amenidades","Housekeeping"],["clean","Cleanliness","Limpieza","Housekeeping"],["maint","Maintenance","Mantenimiento","Maintenance"],["temp","Heat / AC","Calefacción / A/C","Maintenance"],["noise","Noise","Ruido","Front Desk"],["bill","Billing","Facturación","GM"],["bfast","Breakfast","Desayuno","Breakfast"],["other","Other","Otro","Front Desk"]];
const GR_PRI=[["low","Low","Baja",45],["med","Medium","Media",25],["high","High","Alta",15],["urgent","Urgent","Urgente",5]];
const GR_ST=[["open","Open","Abierta"],["ack","Acknowledged","Recibida"],["done","Resolved","Resuelta"]];
const DEPT_ROLES={Housekeeping:["Housekeeping","Housekeeper","House Person"],Maintenance:["Maintenance"],"Front Desk":["Front Desk"],Breakfast:["Breakfast Attendant"],GM:["GM","AGM"]};
const slaMin=r=>f4(GR_PRI,r.pri)[3];
function qpDemo(){return !(typeof useRemote==="function"&&useRemote())}
function grList(h){const q=Q(h);if(!q.gr){if(!qpDemo()){q.gr=[];return q.gr}const n=(S.h[h||S.hotel].rooms||[]);const rm=i=>String((n[i]||{}).n||100+i);
  q.gr=[{id:1,type:"request",room:rm(3),ini:"K",cat:"towels",pri:"med",dept:"Housekeeping",to:"",note:"2 extra bath towels and a blanket",at:agoIso(34),st:"open",ex:1},
  {id:2,type:"complaint",room:rm(9),ini:"M",cat:"temp",pri:"high",dept:"Maintenance",to:"",note:"Room too warm, thermostat not responding",at:agoIso(55),ackAt:agoIso(48),st:"ack",cb:{at:new Date(Date.now()+10*60000).toISOString(),done:false},ex:1},
  {id:3,type:"request",room:rm(14),ini:"R",cat:"amen",pri:"low",dept:"Housekeeping",to:"",note:"Toothbrush kit",at:agoIso(26*60),ackAt:agoIso(26*60-6),doneAt:agoIso(26*60-14),st:"done",res:"Delivered",rec:"none",ex:1},
  {id:4,type:"complaint",room:rm(6),ini:"T",cat:"noise",pri:"med",dept:"Front Desk",to:"",note:"Hallway noise after 11 PM",at:agoIso(3*1440),ackAt:agoIso(3*1440-4),doneAt:agoIso(3*1440-30),st:"done",res:"Called the room, quiet hours reminder",rec:"apology",ex:1}]}
  return q.gr}
function grOver(r){return r.st==="open"&&mins(r.at)>slaMin(r)}
function grCbDue(r){return !!(r.cb&&!r.cb.done&&new Date(r.cb.at)<=new Date(Date.now()+15*60000))}
function grNeedsLoop(r){if(!r||!r.gi||typeof giList!=="function"||typeof giLoopDue!=="function")return false;const g=giList().find(x=>x.id===r.gi);return !!(g&&giLoopDue(g))}
function grStillOpen(r){return r.st!=="done"||grNeedsLoop(r)}
function grCanLog(){return ["GM","AGM","Front Desk","Housekeeping"].includes(AR())}
function grMine(r){const ro=AR();return isMgr()||ro==="Front Desk"||(DEPT_ROLES[r.dept]||[]).includes(ro)||r.to===cw()}
function grF(){S.grf=S.grf||{type:"request",room:"",ini:"",cat:"towels",pri:"med",note:"",to:"",cb:""};return S.grf}
function grSync(){const f=grF();[["grRoom","room"],["grIni","ini"],["grNote","note"],["grCb","cb"]].forEach(([id,k])=>{const e=$(id);if(e)f[k]=e.value})}
function grEsc(){let ch=false;grList().forEach(r=>{if(grOver(r)&&!r.esc){r.esc=1;ch=true;audit("gr",r.id,"escalated","","GM/MOD",B("No response within ","Sin respuesta en ")+slaMin(r)+" min");try{careAlert(B("⏱️ Guest request overdue · Rm "+r.room,"⏱️ Solicitud atrasada · Hab. "+r.room),r.note,{role:"GM"})}catch(e){}}});if(ch)save()}
function grCard(r){const c=f4(GR_CAT,r.cat),p=f4(GR_PRI,r.pri),s=f4(GR_ST,r.st),over=grOver(r),el=mins(r.at,r.doneAt),cb=grCbDue(r),can=grMine(r)&&!isCorp(),gi=r.gi&&giList().find(g=>g.id===r.gi);
  const staff=ST().filter(x=>(DEPT_ROLES[r.dept]||[]).includes(x.role));
  return `<div class="card qp-c ${over?"miss-red":""}" data-qp="gr${r.id}"><div class="row" style="margin:0;flex-wrap:wrap;gap:6px"><b>🛏️ ${B("Rm","Hab.")} ${H(r.room)}</b><span class="raw">· ${H(r.ini||"-")}.</span><span class="pill ${r.type==="complaint"?"VD":"RFI"}">${r.type==="complaint"?B("Complaint","Queja"):B("Request","Solicitud")}</span><span class="pill ${r.pri==="urgent"||r.pri==="high"?"VD":r.pri==="med"?"OD":"VC"}">${B(p[1],p[2])}</span><span class="pill ${r.st==="done"?"VC":r.st==="ack"?"OC":"VD"}">${B(s[1],s[2])}</span>${exPill(r)}</div>
  <div style="margin:6px 0"><span class="pill RFI">${B(c[1],c[2])}</span> <small>→ ${H(giDeptName(r.dept))}${r.to?" · 👤 "+H(r.to):""}</small></div><div class="raw">${H(r.note)}</div>
  <small>${H(fmt(r.at))} · ${r.st==="done"?B("resolved in ","resuelta en ")+dur(el):"⏱️ "+dur(el)+" / SLA "+slaMin(r)+" min"}${r.ackAt?" · "+B("response ","respuesta ")+dur(mins(r.at,r.ackAt)):""}</small>
  ${over?`<div class="bad">🚨 ${B("Past response time — escalated to GM/MOD","Pasó el tiempo de respuesta — escalada a GM/MOD")}</div>`:""}
  ${r.cb&&!r.cb.done?`<div class="${cb?"bad":""}">📞 ${B("Callback","Llamar de vuelta")} ${H(fmt(r.cb.at))}${can?` <button class="chip" onclick="QP.grCb(${r.id})">${B("Called","Llamé")}</button>`:""}</div>`:r.cb&&r.cb.done?`<small>📞 ${B("Callback done","Llamada hecha")}</small>`:""}
  ${gi?`<div><button class="btn2" onclick="go('gi')">🛎️ ${B("Guest issue log","Registro de quejas")} #${gi.id} ›</button></div>`:""}
  ${r.st==="done"?`<div style="margin-top:4px"><small>✅ ${H(r.res||"")}${r.rec&&r.rec!=="none"?" · "+H(giRecName(r.rec)):""}</small></div>`:""}
  ${gi&&grNeedsLoop(r)?`<div class="bad" style="margin-top:6px">📞 ${B("Not fully closed. Contact the guest and close the loop.","No está cerrada del todo. Contacta al huésped y cierra el ciclo.")}</div>${typeof giLoopHist==="function"?giLoopHist(gi):""}${typeof giLoopForm==="function"?giLoopForm(gi):""}`:""}
  ${gi&&typeof giLoopClosed==="function"&&giLoopClosed(gi)&&typeof giLoopHist==="function"?giLoopHist(gi):""}
  ${can&&r.st!=="done"?`<div class="row" style="flex-wrap:wrap;margin-top:6px">${r.st==="open"?`<button class="btn" onclick="QP.grAck(${r.id})">👍 ${B("On it","En camino")}</button>`:""}<select aria-label="${H(B("Assign to","Asignar a"))}" onchange="QP.grAssign(${r.id},this.value)"><option value="">${B("Assign…","Asignar…")}</option>${Object.keys(DEPT_ROLES).map(k=>`<option value="d:${k}">${H(giDeptName(k))}</option>`).join("")}${staff.map(x=>`<option value="p:${H(x.n)}">👤 ${H(x.n)}</option>`).join("")}</select></div>
  ${S.grRes===r.id?`<div class="card" style="background:#f4f7fb"><input id="grRes${r.id}" style="width:100%" placeholder="${H(B("What was done?","¿Qué se hizo?"))}"><select id="grRec${r.id}" style="width:100%;margin-top:6px">${GI_REC.map(x=>`<option value="${x[0]}">${B("Service recovery: ","Recuperación: ")}${B(x[1],x[2])}</option>`).join("")}</select><label style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" id="grCbx${r.id}"> ${B("Follow-up call in 1 hour","Llamada de seguimiento en 1 hora")}</label><button class="btn" style="width:100%;margin-top:6px" onclick="QP.grDone(${r.id})">✅ ${B("Resolve","Resolver")}</button></div>`:`<button class="btn2" style="margin-top:6px" onclick="S.grRes=${r.id};render()">✅ ${B("Resolve…","Resolver…")}</button>`}`:""}</div>`}
function grView(){grEsc();const f=grF(),all=grList(),v=S.grv||"open";const vis=all.filter(grMine);
  const open=vis.filter(grStillOpen),over=vis.filter(grOver),cbs=vis.filter(grCbDue),loopN=vis.filter(grNeedsLoop).length;
  const rows=(v==="open"?open:v==="mine"?open.filter(r=>r.to===cw()||(DEPT_ROLES[r.dept]||[]).includes(AR())):v==="done"?vis.filter(r=>r.st==="done"&&!grNeedsLoop(r)):vis).slice().sort((a,b)=>(grOver(b)-grOver(a))||(grNeedsLoop(b)-grNeedsLoop(a))||(slaMin(a)-slaMin(b))||(new Date(a.at)-new Date(b.at)));
  const form=grCanLog()?`<div class="card" id="grForm"><h3>${B("Log a request or complaint","Registrar solicitud o queja")}</h3>
  <div class="chips" role="group">${[["request","Request","Solicitud"],["complaint","Complaint","Queja"]].map(x=>`<button type="button" class="chip ${f.type===x[0]?"on":""}" aria-pressed="${f.type===x[0]}" onclick="QP.grPick('type','${x[0]}')">${B(x[1],x[2])}</button>`).join("")}</div>
  <div class="row"><input id="grRoom" inputmode="numeric" placeholder="${H(B("Room #","Hab. #"))}" value="${H(f.room)}" aria-label="${H(B("Room number","Número de habitación"))}"><input id="grIni" maxlength="1" style="max-width:130px" placeholder="${H(B("Last initial","Inicial apellido"))}" value="${H(f.ini)}" aria-label="${H(B("Guest last initial only","Solo inicial del apellido"))}"></div>
  <div class="chips" role="group" aria-label="${H(B("Category","Categoría"))}">${GR_CAT.map(c=>`<button type="button" class="chip ${f.cat===c[0]?"on":""}" aria-pressed="${f.cat===c[0]}" onclick="QP.grPick('cat','${c[0]}')">${B(c[1],c[2])}</button>`).join("")}</div>
  <div class="chips" role="group" aria-label="${H(B("Priority","Prioridad"))}">${GR_PRI.map(c=>`<button type="button" class="chip ${f.pri===c[0]?"on":""}" aria-pressed="${f.pri===c[0]}" onclick="QP.grPick('pri','${c[0]}')">${B(c[1],c[2])} · ${c[3]}m</button>`).join("")}</div>
  <textarea id="grNote" style="width:100%;min-height:56px" placeholder="${H(B("What does the guest need?","¿Qué necesita el huésped?"))}">${H(f.note)}</textarea>
  <div class="row"><label style="flex:0 0 auto"><small>📞 ${B("Callback (optional)","Llamar de vuelta (opcional)")}</small></label><input id="grCb" type="datetime-local" value="${H(f.cb)}" aria-label="${H(B("Callback time","Hora de llamada"))}"></div>
  <small>${B("Goes to","Va a")}: <b>${H(giDeptName(f4(GR_CAT,f.cat)[3]))}</b>${f.type==="complaint"?" + "+B("guest issue log","registro de quejas"):""} · ${B("Privacy: room + last initial only.","Privacidad: solo habitación + inicial.")}</small>
  <div class="bad" id="grErr" role="alert"></div><button class="btn" style="width:100%" onclick="QP.grPost()">${B("Send","Enviar")}</button></div>`:"";
  const ack=all.filter(r=>r.ackAt),avg=ack.length?Math.round(ack.reduce((a,r)=>a+mins(r.at,r.ackAt),0)/ack.length):0;
  return `<h2>🙋 ${B("Guest Requests & Complaints","Solicitudes y Quejas")}</h2>
  ${over.length?`<div class="miss-banner">🚨 ${over.length} ${B("past response time","pasaron el tiempo de respuesta")}</div>`:""}${cbs.length?`<div class="miss-banner" style="background:#fff3cd;color:#6b4e00">📞 ${cbs.length} ${B("callback(s) due","llamada(s) pendiente(s)")}</div>`:""}${loopN?`<div class="miss-banner" id="grLoopBanner" style="background:#fff3cd;color:#6b4e00">📞 ${loopN} ${B("complaint(s) need a guest follow-up","queja(s) necesitan seguimiento del huésped")}</div>`:""}
  <div class="kpi"><div><b>${open.length}</b>${B("Open","Abiertas")}</div><div><b class="${over.length?"bad":"good"}">${over.length}</b>${B("Overdue","Atrasadas")}</div><div><b>${avg} min</b>${B("Avg response","Resp. prom.")}</div></div>
  <div class="qp-2">${form}<div><div class="chips">${[["open","Open","Abiertas"],["mine","My dept","Mi depto"],["done","Resolved","Resueltas"],["all","All","Todas"]].map(x=>`<button class="chip ${v===x[0]?"on":""}" onclick="S.grv='${x[0]}';render()">${B(x[1],x[2])}</button>`).join("")}</div><div id="grList">${rows.map(grCard).join("")||`<div class="card"><small>${B("Nothing here. 🎉","Nada aquí. 🎉")}</small></div>`}</div></div></div>`}
QP.grPick=(k,v)=>{grSync();grF()[k]=v;render()};
QP.grPost=()=>{grSync();const f=grF(),e=$("grErr");if(!/^[\w-]{1,6}$/.test(f.room.trim())||!f.note.trim()){if(e)e.textContent=B("Add the room and a short note.","Agrega la habitación y una nota corta.");return}
  if(f.ini&&!/^[A-Za-zÁÉÍÓÚÑáéíóúñ]$/.test(f.ini.trim())){if(e)e.textContent=B("Last initial only (one letter).","Solo la inicial (una letra).");return}
  const L=grList(),c=f4(GR_CAT,f.cat),r={id:nid(L),type:f.type,room:f.room.trim(),ini:f.ini.trim().toUpperCase(),cat:f.cat,pri:f.pri,dept:c[3],to:"",note:f.note.trim(),at:nowIso(),st:"open",by:cw()};
  if(f.cb)r.cb={at:new Date(f.cb).toISOString(),done:false};
  if(r.type==="complaint"){const ex=giList().find(g=>g.st!=="done"&&String(g.room)===r.room);
    if(ex){r.gi=ex.id;ex.qp=r.id}else{const gl=giList(),gid=careNextId(gl),sev=r.pri==="low"?"low":r.pri==="med"?"med":"high",gc=GI_CATS.some(x=>x[0]===r.cat)?r.cat:r.cat==="temp"?"maint":r.cat==="towels"||r.cat==="amen"?"room":"other";gl.unshift({id:gid,room:r.room,cat:gc,sev,note:r.note,st:"open",rec:"none",dep:"",dept:r.dept,at:r.at,by:cw(),qp:r.id});r.gi=gid}}
  L.unshift(r);audit("gr",r.id,"created","",r.st,r.type+" · Rm "+r.room);
  const to=GI_ROLEOF[r.dept];if(to&&to!==AR())try{careAlert(B("🙋 New guest request · Rm "+r.room,"🙋 Nueva solicitud · Hab. "+r.room),r.note,{role:to})}catch(x){}
  S.grf=null;save();showToast(B("Sent to ","Enviada a ")+giDeptName(r.dept));render()};
QP.grAck=id=>{const r=grList().find(x=>x.id===id);if(!r)return;r.st="ack";r.ackAt=nowIso();r.to=r.to||cw();audit("gr",id,"status","open","ack");save();render()};
QP.grAssign=(id,v)=>{const r=grList().find(x=>x.id===id);if(!r||!v)return;const f=r.to||r.dept;if(v.startsWith("d:")){r.dept=v.slice(2);r.to=""}else r.to=v.slice(2);audit("gr",id,"assigned",f,r.to||r.dept);save();render()};
QP.grCb=id=>{const r=grList().find(x=>x.id===id);if(!r||!r.cb)return;r.cb.done=true;r.cb.doneAt=nowIso();audit("gr",id,"callback done");save();render()};
QP.grDone=id=>{const r=grList().find(x=>x.id===id);if(!r)return;r.res=($("grRes"+id)||{}).value||"";r.rec=($("grRec"+id)||{}).value||"none";if(($("grCbx"+id)||{}).checked)r.cb={at:new Date(Date.now()+3600000).toISOString(),done:false};
  const f=r.st;r.st="done";r.doneAt=nowIso();if(!r.ackAt)r.ackAt=r.doneAt;S.grRes=0;audit("gr",id,"status",f,"done",r.res+(r.rec!=="none"?" · "+r.rec:""));
  const g=r.gi&&giList().find(x=>x.id===r.gi);if(g){g.rec=r.rec;if(g.st!=="done"){const was=g.st;if(window.HHQLoop)HHQLoop.markStatus(g,"done",r.doneAt);else{g.st="done";g.doneAt=r.doneAt}audit("gi",g.id,"status",was,"done",B("via guest request","vía solicitud"))}}save();render()};

/* ---------- (4) log sheets ---------- */
const LS_DEF=[
 {id:"keys",ic:"🔑",n:["Keys issued","Llaves entregadas"],roles:["Front Desk"],f:[{k:"room",l:["Room","Hab."],t:"text",req:1},{k:"ini",l:["Guest last initial","Inicial apellido"],t:"ini"},{k:"qty",l:["Keys","Llaves"],t:"num",req:1},{k:"why",l:["Reason","Motivo"],t:"sel",o:[["new","New check-in","Nueva llegada"],["extra","Extra key","Llave extra"],["lost","Lost / replaced","Perdida / reemplazo"],["staff","Staff master","Maestra de personal"]]},{k:"id",l:["ID verified","ID verificada"],t:"chk"}]},
 {id:"pkg",ic:"📦",n:["Packages","Paquetes"],roles:["Front Desk"],f:[{k:"room",l:["Room","Hab."],t:"text",req:1},{k:"ini",l:["Guest last initial","Inicial apellido"],t:"ini"},{k:"car",l:["Carrier","Transportista"],t:"sel",o:[["ups","UPS","UPS"],["fedex","FedEx","FedEx"],["usps","USPS","USPS"],["amz","Amazon","Amazon"],["oth","Other","Otro"]]},{k:"trk",l:["Tracking (last 4)","Rastreo (últ. 4)"],t:"text"},{k:"out",l:["Picked up","Recogido"],t:"chk"}]},
 {id:"wake",ic:"⏰",n:["Wake-up calls","Llamadas despertador"],roles:["Front Desk"],f:[{k:"room",l:["Room","Hab."],t:"text",req:1},{k:"ini",l:["Guest last initial","Inicial apellido"],t:"ini"},{k:"time",l:["Time","Hora"],t:"time",req:1},{k:"done",l:["Call made","Llamada hecha"],t:"chk"}]},
 {id:"cash",ic:"💵",n:["Cash / drawer count","Conteo de caja"],roles:["Front Desk"],f:[{k:"drawer",l:["Drawer","Caja"],t:"sel",o:[["fd1","Front desk 1","Recepción 1"],["fd2","Front desk 2","Recepción 2"],["mkt","Market","Tienda"],["bar","Bar","Bar"]]},{k:"shift",l:["Shift","Turno"],t:"sel",o:[["am","AM","AM"],["pm","PM","PM"],["na","Night audit","Auditoría"]]},{k:"exp",l:["Expected $","Esperado $"],t:"num",sens:1,req:1},{k:"cnt",l:["Counted $","Contado $"],t:"num",sens:1,req:1},{k:"wit",l:["Witness","Testigo"],t:"text"}]},
 {id:"pool",ic:"🏊",n:["Pool / spa chemicals","Químicos de alberca / spa"],roles:["Maintenance"],f:[{k:"body",l:["Pool or spa","Alberca o spa"],t:"sel",o:[["pool","Pool","Alberca"],["spa","Spa / hot tub","Spa / jacuzzi"]]},{k:"cl",l:["Free chlorine ppm","Cloro libre ppm"],t:"num",min:1,max:10,req:1},{k:"ph",l:["pH","pH"],t:"num",min:7.2,max:7.8,req:1},{k:"alk",l:["Alkalinity ppm","Alcalinidad ppm"],t:"num",min:80,max:120},{k:"temp",l:["Temp °F","Temp °F"],t:"num",max:104}]},
 {id:"meter",ic:"📟",n:["Meter readings","Lecturas de medidores"],roles:["Maintenance"],f:[{k:"m",l:["Meter","Medidor"],t:"sel",o:[["elec","Electric (kWh)","Eléctrico (kWh)"],["gas","Gas (therms)","Gas (therms)"],["water","Water (gal)","Agua (gal)"],["irr","Irrigation","Riego"]]},{k:"v",l:["Reading","Lectura"],t:"num",req:1},{k:"n",l:["Note","Nota"],t:"text"}]},
 {id:"vendor",ic:"🧰",n:["Vendor sign-in","Registro de proveedores"],roles:["Front Desk","Maintenance","Housekeeping"],f:[{k:"co",l:["Company","Empresa"],t:"text",req:1},{k:"who",l:["Contact (first name)","Contacto (nombre)"],t:"text"},{k:"why",l:["Purpose / area","Motivo / área"],t:"text",req:1},{k:"in",l:["Time in","Entrada"],t:"time"},{k:"out",l:["Time out","Salida"],t:"time"},{k:"coi",l:["COI on file","Seguro en archivo"],t:"chk"}]}];
function lsTpl(h){const q=Q(h);if(!q.tpl)q.tpl=JSON.parse(JSON.stringify(LS_DEF));return q.tpl}
const lsSeeSens=()=>isMgr();
const lsCan=s=>isMgr()||s.roles.includes(AR());
function lsRows(h){const q=Q(h);if(!q.logs){if(!qpDemo()){q.logs={keys:[],pkg:[],wake:[],cash:[],pool:[],meter:[],vendor:[]};return q.logs}q.logs={keys:[{id:1,at:agoIso(90),by:"Front desk (EX)",v:{room:"214",ini:"K",qty:"2",why:"new",id:true},ex:1}],pkg:[{id:1,at:agoIso(200),by:"Front desk (EX)",v:{room:"118",ini:"R",car:"ups",trk:"4417",out:false},ex:1}],wake:[{id:1,at:agoIso(600),by:"Night audit (EX)",v:{room:"305",ini:"M",time:"05:30",done:true},ex:1}],
  cash:[{id:1,at:agoIso(300),by:"Front desk (EX)",v:{drawer:"fd1",shift:"am",exp:"200",cnt:"200",wit:"GM"},ex:1},{id:2,at:agoIso(1500),by:"Night audit (EX)",v:{drawer:"fd1",shift:"na",exp:"200",cnt:"185",wit:""},ex:1}],
  pool:[{id:1,at:agoIso(120),by:"Maintenance (EX)",v:{body:"pool",cl:"3",ph:"7.5",alk:"100",temp:"82"},ex:1},{id:2,at:agoIso(125),by:"Maintenance (EX)",v:{body:"spa",cl:"2.5",ph:"8.0",alk:"90",temp:"102"},ex:1},{id:3,at:agoIso(1560),by:"Maintenance (EX)",v:{body:"pool",cl:"2.8",ph:"7.4",alk:"95",temp:"81"},ex:1}],
  meter:[{id:1,at:agoIso(1440*7+60),by:"Maintenance (EX)",v:{m:"elec",v:"482110",n:""},ex:1},{id:2,at:agoIso(60),by:"Maintenance (EX)",v:{m:"elec",v:"489935",n:""},ex:1},{id:3,at:agoIso(70),by:"Maintenance (EX)",v:{m:"water",v:"1203340",n:""},ex:1}],
  vendor:[{id:1,at:agoIso(240),by:"Front desk (EX)",v:{co:"Elevator service (EX)",who:"Sam",why:"Monthly elevator PM",in:"09:10",out:"10:25",coi:true},ex:1}]}}return q.logs}
function lsOut(f,v){if(v==null||v===""||f.t!=="num")return false;return (f.min!=null&&+v<f.min)||(f.max!=null&&+v>f.max)}
function lsVal(f,v){if(f.sens&&!lsSeeSens())return "•••";if(f.t==="chk")return v?"✅":"—";if(f.t==="sel"){const o=(f.o||[]).find(x=>x[0]===v);return o?H(B(o[1],o[2])):H(v||"")}return H(v==null?"":v)}
function lsCash(e){if(e.balanced===true)return `<span class="pill VC">${B("Balanced","Cuadrada")}</span>`;if(e.balanced===false&&!lsSeeSens())return `<span class="pill VD">${B("Variance — GM notified","Diferencia — GM avisado")}</span>`;const d=(+e.v.cnt||0)-(+e.v.exp||0);if(d===0)return `<span class="pill VC">${B("Balanced","Cuadrada")}</span>`;return lsSeeSens()?`<span class="pill VD">${d>0?"+":""}${d.toFixed(2)}</span>`:`<span class="pill VD">${B("Variance — GM notified","Diferencia — GM avisado")}</span>`}
function lsField(f){const id="ls_"+f.k,lb=H(B(f.l[0],f.l[1]))+(f.req?" *":"");if(f.t==="chk")return `<label class="qp-f qp-chk"><input type="checkbox" id="${id}"> ${lb}</label>`;
  if(f.t==="sel")return `<label class="qp-f"><small>${lb}</small><select id="${id}">${f.o.map(o=>`<option value="${o[0]}">${H(B(o[1],o[2]))}</option>`).join("")}</select></label>`;
  return `<label class="qp-f"><small>${lb}${f.sens?" 🔒":""}</small><input id="${id}" ${f.t==="num"?'inputmode="decimal" type="number" step="any"':f.t==="time"?'type="time"':f.t==="ini"?'maxlength="1"':""}></label>`}
function lsView(){const T=lsTpl().filter(s=>!s.off&&lsCan(s)),cur=T.find(s=>s.id===S.lsId)||T[0];if(!cur)return `<h2>📒 ${B("Log Sheets","Bitácoras")}</h2><div class="card">${B("No log sheets for your role.","No hay bitácoras para tu puesto.")}</div>`;
  const rows=(lsRows()[cur.id]||[]),q=(S.lsq||"").toLowerCase(),vis=rows.filter(e=>!q||JSON.stringify(e.v).toLowerCase().includes(q)||String(e.by).toLowerCase().includes(q));
  const head=`<th>${B("When","Cuándo")}</th><th>${B("By","Quién")}</th><th>${B("Example","Ejemplo")}</th>`+cur.f.map(f=>`<th>${H(B(f.l[0],f.l[1]))}</th>`).join("")+(cur.id==="cash"?`<th>${B("Result","Resultado")}</th>`:"");
  const flag=e=>cur.f.some(f=>lsOut(f,e.v[f.k]));
  const tbl=vis.map(e=>`<tr class="${flag(e)?"qp-bad":""}"><td data-l="${H(B("When","Cuándo"))}">${H(fmt(e.at))}</td><td data-l="${H(B("By","Quién"))}">${H(e.by||"")}</td><td data-l="${H(B("Example","Ejemplo"))}">${e.ex?B("EXAMPLE","EJEMPLO"):""}</td>${cur.f.map(f=>`<td data-l="${H(B(f.l[0],f.l[1]))}" class="${lsOut(f,e.v[f.k])?"bad":""}">${lsVal(f,e.v[f.k])}${lsOut(f,e.v[f.k])?" ⚠️":""}${f.t==="chk"&&!e.v[f.k]&&(f.k==="out"||f.k==="done")&&!isCorp()?` <button class="chip" aria-label="${H(B("Mark done","Marcar hecho"))}" onclick="QP.lsTick('${cur.id}',${e.id},'${f.k}')">✓</button>`:""}</td>`).join("")}${cur.id==="cash"?`<td data-l="${H(B("Result","Resultado"))}">${lsCash(e)}</td>`:""}</tr>`).join("");
  const gmEdit=isMgr();
  return `<h2>📒 ${B("Log Sheets","Bitácoras")}</h2><div class="chips" role="tablist">${T.map(s=>`<button class="chip ${s===cur?"on":""}" role="tab" aria-selected="${s===cur}" onclick="S.lsId='${s.id}';S.lsEd=0;render()">${s.ic} ${H(B(s.n[0],s.n[1]))} <small>(${(lsRows()[s.id]||[]).length})</small></button>`).join("")}</div>
  <div class="qp-2"><div class="card" id="lsForm"><h3>${cur.ic} ${B("New entry","Nueva entrada")}</h3>${isCorp()?`<small>${B("Corporate view is read-only.","Vista corporativa: solo lectura.")}</small>`:`<div class="qp-fs">${cur.f.map(lsField).join("")}</div>${cur.id==="cash"&&!lsSeeSens()?`<small>🔒 ${B("Amounts are hidden after saving. Only the GM/AGM sees them.","Los montos se ocultan al guardar. Solo GM/AGM los ve.")}</small>`:""}${cur.id==="pool"?`<small>${B("Targets: chlorine 1–10 ppm, pH 7.2–7.8, alkalinity 80–120, spa ≤104 °F. Out of range turns red and alerts the GM.","Rangos: cloro 1–10 ppm, pH 7.2–7.8, alcalinidad 80–120, spa ≤104 °F. Fuera de rango se marca en rojo y avisa al GM.")}</small>`:""}<div class="bad" id="lsErr" role="alert"></div><button class="btn" style="width:100%" onclick="QP.lsAdd('${cur.id}')">${B("Save entry","Guardar")}</button>`}
  ${gmEdit?`<button class="btn2" style="width:100%;margin-top:8px" onclick="S.lsEd=!S.lsEd;render()">✏️ ${B("Edit template","Editar plantilla")}</button>`:""}</div>
  <div>${S.lsEd&&gmEdit?lsEditor(cur):""}<div class="card"><input type="search" style="width:100%" placeholder="🔍 ${H(B("Search this log…","Buscar en esta bitácora…"))}" value="${H(S.lsq||"")}" oninput="S.lsq=this.value;QP.keep('lsq')" id="lsq" aria-label="${H(B("Search this log","Buscar en esta bitácora"))}"><div class="qp-tw"><table class="qp-t"><thead><tr>${head}</tr></thead><tbody>${tbl||`<tr><td colspan="12"><small>${B("No entries yet.","Sin entradas.")}</small></td></tr>`}</tbody></table></div></div></div></div>`}
function lsEditor(s){const hidden=lsTpl().filter(x=>x.off);return `<div class="card" id="lsEditor" style="background:#f4f7fb"><h3>✏️ ${B("Template","Plantilla")}: ${H(B(s.n[0],s.n[1]))}</h3><small>${B("GM/AGM can rename, add or remove fields for this hotel. Changes go to the audit trail.","GM/AGM puede renombrar, agregar o quitar campos para este hotel. Los cambios quedan en el historial.")}</small>
  ${s.f.map((f,i)=>`<div class="row" style="flex-wrap:wrap"><input aria-label="EN" value="${H(f.l[0])}" onchange="QP.lsRen('${s.id}',${i},0,this.value)"><input aria-label="ES" value="${H(f.l[1])}" onchange="QP.lsRen('${s.id}',${i},1,this.value)"><small style="flex:0 0 auto">${f.t}${f.sens?" 🔒":""}</small>${f.req||f.sens?"":`<button class="chip" aria-label="${H(B("Remove field","Quitar campo"))}" onclick="QP.lsDel('${s.id}',${i})">✕</button>`}</div>`).join("")}
  <div class="row" style="flex-wrap:wrap"><input id="lsNewEn" placeholder="${H(B("New field (English)","Campo nuevo (inglés)"))}"><input id="lsNewEs" placeholder="${H(B("New field (Spanish)","Campo nuevo (español)"))}"><select id="lsNewT" aria-label="${H(B("Field type","Tipo"))}"><option value="text">${B("Text","Texto")}</option><option value="num">${B("Number","Número")}</option><option value="time">${B("Time","Hora")}</option><option value="chk">${B("Checkbox","Casilla")}</option></select><button class="btn" onclick="QP.lsNew('${s.id}')">＋ ${B("Add","Agregar")}</button></div>
  <div class="row" style="flex-wrap:wrap"><button class="btn2" onclick="QP.lsOff('${s.id}',1)">${B("Hide this sheet","Ocultar bitácora")}</button><button class="btn2" onclick="QP.lsReset('${s.id}')">${B("Reset to default","Restablecer")}</button>${hidden.map(x=>`<button class="chip" onclick="QP.lsOff('${x.id}',0)">↩ ${H(B(x.n[0],x.n[1]))}</button>`).join("")}</div></div>`}
QP.keep=id=>{const e0=$(id),p=e0?e0.selectionStart:0;render();const e=$(id);if(e){e.focus();try{e.setSelectionRange(p,p)}catch(x){}}};
QP.lsAdd=id=>{const s=lsTpl().find(x=>x.id===id),v={};let bad="";s.f.forEach(f=>{const e=$("ls_"+f.k);if(!e)return;v[f.k]=f.t==="chk"?e.checked:e.value.trim();if(f.req&&!v[f.k])bad=B(f.l[0],f.l[1]);if(f.t==="ini"&&v[f.k]&&!/^[A-Za-zÑñ]$/.test(v[f.k]))bad=B("Last initial (one letter)","Inicial (una letra)")});
  if(bad){$("lsErr").textContent=B("Missing or invalid: ","Falta o no es válido: ")+bad;return}const L=lsRows();L[id]=L[id]||[];const e={id:nid(L[id]),at:nowIso(),by:cw(),v};L[id].unshift(e);
  audit("log",id+"#"+e.id,"created","","",s.f.filter(f=>!f.sens).map(f=>v[f.k]===true?B(f.l[0],f.l[1]):String(v[f.k]==null||v[f.k]===false?"":v[f.k])).filter(Boolean).join(" · ").slice(0,80));
  if(id==="cash"&&(+v.cnt||0)!==(+v.exp||0))try{careAlert(B("💵 Drawer variance","💵 Diferencia de caja"),B("A drawer count did not balance. Open Log Sheets.","Un conteo de caja no cuadró. Abre Bitácoras."),{role:"GM"})}catch(x){}
  if(s.f.some(f=>lsOut(f,v[f.k])))try{careAlert(B("⚠️ Out-of-range reading","⚠️ Lectura fuera de rango"),B(s.n[0],s.n[1]),{role:"GM"})}catch(x){}
  save();showToast(B("Saved","Guardado"));render()};
QP.lsTick=(id,eid,k)=>{const e=(lsRows()[id]||[]).find(x=>x.id===eid);if(!e)return;e.v[k]=true;e.v[k+"At"]=nowIso();audit("log",id+"#"+eid,k,"no","yes");save();render()};
QP.lsRen=(id,i,j,v)=>{const s=lsTpl().find(x=>x.id===id);const f=s.f[i].l[j];s.f[i].l[j]=v;audit("template",id,"renamed field",f,v);save();render()};
QP.lsDel=(id,i)=>{const s=lsTpl().find(x=>x.id===id);const f=s.f.splice(i,1)[0];audit("template",id,"removed field",f.l[0],"");save();render()};
QP.lsNew=id=>{const en=$("lsNewEn").value.trim();if(!en)return;const es=$("lsNewEs").value.trim()||en,s=lsTpl().find(x=>x.id===id);s.f.push({k:"c"+Date.now().toString(36),l:[en,es],t:$("lsNewT").value});audit("template",id,"added field","",en);save();render()};
QP.lsOff=(id,off)=>{const s=lsTpl().find(x=>x.id===id);s.off=off?1:0;audit("template",id,off?"hidden":"shown");if(off){S.lsId="";S.lsEd=0}else S.lsId=id;save();render()};
QP.lsReset=id=>{const T=lsTpl(),i=T.findIndex(x=>x.id===id);T[i]=JSON.parse(JSON.stringify(LS_DEF.find(x=>x.id===id)));audit("template",id,"reset");save();render()};

/* ---------- (5) room notices ---------- */
const RN=[["eci","🕐","Early check-in","Llegada temprana","VC"],["lco","🕓","Late checkout","Salida tarde","OC"],["vip","⭐","VIP","VIP","RFI"],["dnd","🚫","DND","No molestar","VD"],["ada","♿","Accessibility","Accesibilidad","OD"],["oth","📌","Other","Otro","OD"]];
function rnList(h){const q=Q(h);if(!q.nt){if(!qpDemo()){q.nt=[];return q.nt}const n=(S.h[h||S.hotel].rooms||[]),rm=i=>String((n[i]||{}).n||101+i),t=new Date();const at=(hh,m)=>{const d=new Date(t);d.setHours(hh,m||0,0,0);return d.toISOString()};const tm=hh=>{const d=new Date(t);d.setDate(d.getDate()+1);d.setHours(hh,0,0,0);return d.toISOString()};
  q.nt=[{id:1,room:rm(1),ty:"eci",note:"Arriving 11 AM — clean first",until:at(23,0),at:agoIso(60),by:"Front desk (EX)",ex:1},{id:2,room:rm(5),ty:"lco",note:"Checkout 1 PM approved",until:tm(13),at:agoIso(120),by:"Front desk (EX)",ex:1},{id:3,room:rm(10),ty:"vip",note:"Top-tier member, welcome amenity",until:tm(12),at:agoIso(200),by:"GM (EX)",ex:1},{id:4,room:rm(12),ty:"ada",note:"Hearing-accessible kit in room",until:tm(12),at:agoIso(300),by:"Front desk (EX)",ex:1},{id:5,room:rm(4),ty:"dnd",note:"",until:at(23,59),at:agoIso(30),by:"Housekeeper (EX)",ex:1},{id:6,room:rm(7),ty:"lco",note:"Expired example",until:agoIso(300),at:agoIso(1500),by:"Front desk (EX)",ex:1}]}return q.nt}
function rnActive(r,h){return rnList(h).filter(x=>new Date(x.until)>new Date()&&(r==null||String(x.room)===String(r)))}
const rnCanAdd=()=>["GM","AGM","Front Desk","Housekeeping","Housekeeper"].includes(AR());
const rnTypesFor=()=>AR()==="Housekeeper"?RN.filter(x=>x[0]==="dnd"):RN;
function rnBadges(room,small){const a=rnActive(room);if(!a.length)return "";return `<div class="qp-rn">${a.map(x=>{const t=f4(RN,x.ty);return `<span class="pill ${t[4]}" title="${H(B(t[2],t[3])+(x.note?": "+x.note:"")+" · "+B("until ","hasta ")+fmt(x.until))}">${t[1]}${small?"":" "+H(B(t[2],t[3]))}</span>`}).join("")}</div>`}
const _bc=window.boardCard;if(_bc)window.boardCard=function(r){const h=_bc(r);let b="";try{b=rnBadges(r.n,true)+dcBadge(r.n)}catch(e){}return b?h.replace(/<\/div>\s*$/,b+"</div>"):h};
const _mrc=window.myRoomCard;if(_mrc)window.myRoomCard=function(x){const h=_mrc(x);let b="";try{b=rnBadges(x.n)}catch(e){}return b?h.replace(/<\/div>\s*$/,b+"</div>"):h};
function rnView(){const L=rnList().slice().sort((a,b)=>new Date(a.until)-new Date(b.until)),act=L.filter(x=>new Date(x.until)>new Date()),exp=L.filter(x=>new Date(x.until)<=new Date());const ty=rnTypesFor();
  const card=x=>{const t=f4(RN,x.ty),live=new Date(x.until)>new Date();return `<div class="card qp-c" style="${live?"":"opacity:.6"}"><div class="row" style="margin:0;flex-wrap:wrap"><b>🛏️ ${B("Rm","Hab.")} ${H(x.room)}</b><span class="pill ${t[4]}">${t[1]} ${H(B(t[2],t[3]))}</span>${exPill(x)}</div>${x.note?`<div class="raw">${H(x.note)}</div>`:""}<small>${live?B("Until ","Hasta ")+H(fmt(x.until)):B("Expired ","Venció ")+H(fmt(x.until))} · ${H(x.by)}</small>${live&&rnCanAdd()?` <button class="chip" onclick="QP.rnEnd(${x.id})">${B("Clear","Quitar")}</button>`:""}</div>`};
  const d=new Date();d.setHours(23,59,0,0);const dv=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  return `<h2>📌 ${B("Room Notices","Avisos de habitación")}</h2><small>${B("Notices show on the room board and expire on their own.","Los avisos aparecen en el tablero y vencen solos.")}</small>
  <div class="qp-2">${rnCanAdd()?`<div class="card" id="rnForm"><h3>${B("Add notice","Agregar aviso")}</h3><div class="row"><input id="rnRoom" inputmode="numeric" placeholder="${H(B("Room #","Hab. #"))}" aria-label="${H(B("Room number","Número de habitación"))}"><input id="rnUntil" type="datetime-local" value="${dv}" aria-label="${H(B("Expires","Vence"))}"></div><div class="chips">${ty.map((t,i)=>`<label class="chip"><input type="radio" name="rnTy" value="${t[0]}" ${i===0?"checked":""}> ${t[1]} ${H(B(t[2],t[3]))}</label>`).join("")}</div><input id="rnNote" style="width:100%" placeholder="${H(B("Note (time, request…) — no guest names","Nota (hora, solicitud…) — sin nombres"))}"><div class="bad" id="rnErr" role="alert"></div><button class="btn" style="width:100%" onclick="QP.rnAdd()">${B("Add to board","Agregar al tablero")}</button></div>`:""}
  <div><div class="card"><h3>${B("Active","Activos")} (${act.length})</h3></div>${act.map(card).join("")||`<div class="card"><small>${B("No active notices.","Sin avisos activos.")}</small></div>`}${exp.length?`<details class="card"><summary>${B("Expired","Vencidos")} (${exp.length})</summary>${exp.map(card).join("")}</details>`:""}</div></div>`}
QP.rnAdd=()=>{const room=$("rnRoom").value.trim(),u=$("rnUntil").value,ty=(document.querySelector("input[name=rnTy]:checked")||{}).value;if(!room||!u||!ty){$("rnErr").textContent=B("Room and expiry are required.","Habitación y vencimiento son obligatorios.");return}
  const L=rnList(),x={id:nid(L),room,ty,note:$("rnNote").value.trim(),until:new Date(u).toISOString(),at:nowIso(),by:cw()};L.unshift(x);audit("notice",x.id,"created","",ty,"Rm "+room);save();showToast(B("Notice added","Aviso agregado"));render()};
QP.rnEnd=id=>{const x=rnList().find(y=>y.id===id);if(!x)return;x.until=nowIso();audit("notice",id,"cleared","",x.ty,"Rm "+x.room);save();render()};

/* ---------- (6) deep cleans ---------- */
function dcState(h){const q=Q(h);if(!q.dc){if(!qpDemo()){q.dc={cycle:90,rooms:{},hist:[],ex:0};return q.dc}const rooms=(S.h[h||S.hotel].rooms||[]),t=today();
  q.dc={cycle:90,rooms:{},hist:[],ex:1};rooms.forEach((r,i)=>{const age=[5,20,48,71,84,88,93,104,120,62,33,15][i%12]+(i>11?3:0);q.dc.rooms[r.n]={last:addDays(t,-age),st:"",who:""}});
  if((h||S.hotel)==="MSPAM")Object.keys(q.dc.rooms).slice(0,3).forEach(n=>{q.dc.rooms[n].last=addDays(t,-1);q.dc.hist.push({n,d:addDays(t,-1),by:"Housekeeping (EX)"})})}return q.dc}
function dcLeft(n,h){const s=dcState(h),r=s.rooms[n];if(!r)return null;return dayDiff(addDays(r.last,s.cycle),today())}
function dcBadge(n){const l=dcLeft(n);return l!=null&&l<0?`<span class="pill VD" title="${H(B("Deep clean overdue","Limpieza profunda atrasada"))}">🧽!</span>`:""}
const dcCanMng=()=>["GM","AGM","Housekeeping"].includes(AR());
function dcView(){const s=dcState(),me=cw(),rs=Object.keys(s.rooms).map(n=>Object.assign({n},s.rooms[n],{left:dcLeft(n)})).sort((a,b)=>a.left-b.left);
  const vis=AR()==="Housekeeper"?rs.filter(r=>r.who===me):rs,over=rs.filter(r=>r.left<0).length,soon=rs.filter(r=>r.left>=0&&r.left<=14).length;
  const hk=ST().filter(x=>x.role==="Housekeeper"||x.role==="Housekeeping"),f=S.dcf||"due",list=f==="due"?vis.filter(r=>r.left<=14||r.st):vis;
  const row=r=>`<div class="card qp-c ${r.left<0?"miss-red":""}"><div class="row" style="margin:0;flex-wrap:wrap"><b>🛏️ ${H(r.n)}</b><span class="pill ${r.left<0?"VD":r.left<=14?"OD":"VC"}">${r.left<0?B(-r.left+" days overdue",-r.left+" días atrasada"):B("due in "+r.left+" d","vence en "+r.left+" d")}</span>${r.st?`<span class="pill RFI">${r.st==="prog"?B("In progress","En proceso"):B("Assigned","Asignada")}</span>`:""}</div><small>${B("Last","Última")}: ${H(r.last)} · ${B("Next","Próxima")}: ${H(addDays(r.last,s.cycle))}${r.who?" · 👤 "+H(r.who):""}</small>
   <div class="row" style="flex-wrap:wrap">${dcCanMng()?`<select aria-label="${H(B("Assign","Asignar"))}" onchange="QP.dcAsg('${r.n}',this.value)"><option value="">${B("Assign…","Asignar…")}</option>${hk.map(x=>`<option ${r.who===x.n?"selected":""}>${H(x.n)}</option>`).join("")}</select>`:""}${(dcCanMng()||r.who===me)&&r.st!=="prog"?`<button class="btn2" onclick="QP.dcSt('${r.n}')">▶ ${B("Start","Iniciar")}</button>`:""}${dcCanMng()||r.who===me?`<button class="btn" onclick="QP.dcDone('${r.n}')">✅ ${B("Done","Hecha")}</button>`:""}</div></div>`;
  return `<h2>🧽 ${B("Deep Cleans","Limpiezas profundas")}</h2>${over?`<div class="miss-banner">🧽 ${over} ${B("room(s) overdue for a deep clean","cuarto(s) con limpieza profunda atrasada")}</div>`:""}
  <div class="kpi"><div><b>${Math.round(100*(rs.length-over)/Math.max(1,rs.length))}%</b>${B("In cycle","En ciclo")}</div><div><b class="${over?"bad":"good"}">${over}</b>${B("Overdue","Atrasadas")}</div><div><b>${soon}</b>${B("Due ≤14 d","Vencen ≤14 d")}</div><div><b>${s.hist.filter(x=>dayDiff(today(),x.d)<=7).length}</b>${B("Done 7 d","Hechas 7 d")}</div></div>
  <div class="card"><div class="row" style="flex-wrap:wrap"><label for="dcCyc" style="flex:0 0 auto">${B("Cycle (days)","Ciclo (días)")}</label><input type="number" id="dcCyc" value="${s.cycle}" style="max-width:100px" ${AR()==="GM"||AR()==="AGM"?"":"disabled"} onchange="QP.dcCycle(this.value)"><div class="chips">${[["due","Queue (due ≤14 d)","Cola (≤14 d)"],["all","All rooms","Todos"]].map(x=>`<button class="chip ${f===x[0]?"on":""}" onclick="S.dcf='${x[0]}';render()">${B(x[1],x[2])}</button>`).join("")}</div></div>${s.ex?`<small>${B("EXAMPLE dates until real history is imported from Quore.","Fechas de EJEMPLO hasta importar el historial de Quore.")}</small>`:""}</div>
  <div class="qp-grid">${list.map(row).join("")||`<div class="card"><small>${AR()==="Housekeeper"?B("No deep cleans assigned to you.","No tienes limpiezas profundas asignadas."):B("Nothing due. 🎉","Nada pendiente. 🎉")}</small></div>`}</div>`}
QP.dcAsg=(n,w)=>{const r=dcState().rooms[n];const f=r.who;r.who=w;r.st=w?"asg":"";audit("deepclean",n,"assigned",f,w);save();render()};
QP.dcSt=n=>{const r=dcState().rooms[n];r.st="prog";r.who=r.who||cw();r.t0=nowIso();audit("deepclean",n,"started");save();render()};
QP.dcDone=n=>{const s=dcState(),r=s.rooms[n],f=r.last;r.last=today();s.hist.unshift({n,d:today(),by:r.who||cw()});r.st="";r.who="";audit("deepclean",n,"completed",f,r.last);save();showToast(B("Deep clean logged","Limpieza registrada"));render()};
QP.dcCycle=v=>{const s=dcState(),f=s.cycle;s.cycle=Math.max(7,Math.min(365,+v||90));audit("deepclean","cycle","changed",f,s.cycle);save();render()};

/* ---------- (3) global search + full history ---------- */
function srcAll(h){const d=S.h[h],q=Q(h),out=[],add=(k,ic,room,title,sub,at,st,g,done)=>out.push({k,ic,room:String(room==null?"":room),title:String(title||""),sub:String(sub||""),at:at||"",st:st||"",go:g,done:!!done,h});
  (d.wo||[]).forEach(w=>add("wo","🔧",w.room,"#"+w.id+" "+ftPlain(w,w.t),(w.comments||[]).map(c=>c.text).join(" · "),w.doneAt||w.at||"",w.s,"wo",w.s==="Done"));
  (q.hist.wo||[]).forEach(w=>add("wo","🔧",w.room,(w.ext?"Q-"+w.ext+" ":"")+w.title,B("Imported from Quore","Importado de Quore")+(w.who?" · "+w.who:""),w.at,w.status,"find",/done|complete|closed/i.test(w.status)));
  (d.pm||[]).forEach(p=>add("pm","🗓️",p.room||"",p.a,p.f||"",p.dk||"",pdn(p)?"Done":B("Due ","Vence ")+(p.due||""),"pm",pdn(p)));
  (d.pmRooms||[]).forEach(r=>add("pm","🗓️",r,B("Guestroom PM completed","PM de habitación completado"),B("This quarter","Este trimestre"),"","Done","pm",true));
  (q.hist.pm||[]).forEach(p=>add("pm","🗓️",p.room,p.title,B("Imported from Quore","Importado de Quore")+(p.who?" · "+p.who:""),p.at,p.status||"Done","find",true));
  (q.hist.assets||[]).forEach(a=>add("asset","🔩",a.room,a.title,(a.model||"")+" "+(a.serial||""),a.at,"","find",true));
  const L=q.logs||{},T=q.tpl||LS_DEF;Object.keys(L).forEach(k=>{const s=T.find(x=>x.id===k)||LS_DEF.find(x=>x.id===k);if(!s)return;(L[k]||[]).forEach(e=>add(k==="meter"||k==="pool"?"meter":"log",s.ic,e.v.room||"",B(s.n[0],s.n[1]),s.f.filter(f=>!f.sens).map(f=>{const v=e.v[f.k];if(v===true)return B(f.l[0],f.l[1]);if(v===false||v==null)return "";if(f.t==="sel"){const o=(f.o||[]).find(x=>x[0]===v);return o?B(o[1],o[2]):v}return v}).filter(Boolean).join(" · "),e.at,"","logs",true))});
  (d.notes||[]).forEach(n=>add("note","📝","",n.sh+" · "+n.by,ftPlain(n,n.t),"",n.at,"notes",true));
  (q.gr||[]).forEach(r=>add("req","🙋",r.room,(r.type==="complaint"?B("Complaint","Queja"):B("Request","Solicitud"))+": "+r.note,r.res||"",r.at,grNeedsLoop(r)?"follow-up":r.st,"greq",r.st==="done"&&!grNeedsLoop(r)));
  (d.gi||[]).forEach(g=>add("req","🛎️",g.room,B("Guest issue","Queja")+": "+g.note,"",g.at,typeof giLoopDue==="function"&&giLoopDue(g)?"follow-up":g.st,"gi",typeof giLoopClosed==="function"?giLoopClosed(g):g.st==="done"));
  (d.lfx||[]).forEach(x=>add("lf","🧳",x.room,x.desc,x.where||"",x.at,x.st,"lf",x.st!=="stored"));
  (q.nt||[]).forEach(x=>{const t=f4(RN,x.ty);add("notice",t[1],x.room,B(t[2],t[3]),x.note,x.at,"","notice",new Date(x.until)<=new Date())});
  ((q.dc||{}).hist||[]).forEach(x=>add("deep","🧽",x.n,B("Deep clean done","Limpieza profunda hecha"),x.by,x.d,"Done","dc",true));
  (d.insp||[]).forEach(x=>add("insp","🔍",x.room,B("Inspection ","Inspección ")+(x.score==null?"":x.score+"%"),(x.notes||"")+" "+(x.failed||[]).join(", "),x.date||"","","insp",true));
  return out}
const SK=[["all","All","Todo"],["room","Rooms","Cuartos"],["wo","Work orders","Órdenes"],["pm","PMs","PMs"],["meter","Readings","Lecturas"],["note","Notes","Notas"],["req","Guest requests","Solicitudes"],["lf","Lost & found","Objetos perdidos"],["log","Logs","Bitácoras"]];
function findView(){const q=(S.fq||"").trim().toLowerCase(),k=S.fk||"all",st=S.fs||"any",hs=isCorp()&&S.fh==="all"?Object.keys(HOTELS):[S.hotel];
  let all=[];hs.forEach(h=>all=all.concat(srcAll(h)));const isRoom=/^\d{2,4}$/.test(q);
  const res=all.filter(x=>(k==="all"||x.k===k||(k==="room"&&x.room))&&(st==="any"||(st==="done"?x.done:!x.done))&&(!q||(isRoom?x.room===q:(x.title+" "+x.sub+" "+x.room+" "+x.st).toLowerCase().includes(q))));
  res.sort((a,b)=>String(b.at).localeCompare(String(a.at)));const lim=res.slice(0,150);
  let roomInfo="";if(isRoom){const r=(D().rooms||[]).find(x=>String(x.n)===q),dl=dcLeft(q);roomInfo=`<div class="card" id="roomHist"><h3>🛏️ ${B("Room","Cuarto")} ${H(q)} · ${B("full history","historial completo")}</h3>${r?`<span class="pill flow-${roomFlow(r)}">${flowLabel(roomFlow(r))}</span> `:""}${rnBadges(q)}${dl!=null?`<div><small>🧽 ${B("Deep clean","Limpieza profunda")}: ${dl<0?`<b class="bad">${B(-dl+" days overdue",-dl+" días atrasada")}</b>`:B("due in "+dl+" days","vence en "+dl+" días")}</small></div>`:""}<div class="kpi"><div><b>${res.filter(x=>x.k==="wo").length}</b>${B("Work orders","Órdenes")}</div><div><b>${res.filter(x=>x.k==="pm").length}</b>PMs</div><div><b>${res.filter(x=>x.k==="req").length}</b>${B("Guest","Huésped")}</div></div></div>`}
  return `<h2>🔎 ${B("Search & History","Buscar e historial")}</h2><div class="card"><input id="fq" type="search" style="width:100%;font-size:17px" placeholder="${H(B("Room #, work order, PM, note, item…","Hab. #, orden, PM, nota, objeto…"))}" value="${H(S.fq||"")}" oninput="S.fq=this.value;QP.keep('fq')" aria-label="${H(B("Search everything","Buscar todo"))}">
  <div class="chips">${SK.map(x=>`<button class="chip ${k===x[0]?"on":""}" onclick="S.fk='${x[0]}';render()">${B(x[1],x[2])}</button>`).join("")}</div><div class="chips">${[["any","Open + completed","Abiertos + completados"],["open","Open","Abiertos"],["done","Completed","Completados"]].map(x=>`<button class="chip ${st===x[0]?"on":""}" onclick="S.fs='${x[0]}';render()">${B(x[1],x[2])}</button>`).join("")}${isCorp()?`<button class="chip ${S.fh==="all"?"on":""}" onclick="S.fh=S.fh==='all'?'':'all';render()">🏨 ${B("All hotels","Todos los hoteles")}</button>`:""}</div><small>${res.length} ${B("results","resultados")}${res.length>150?" · "+B("showing 150","mostrando 150"):""}</small></div>${roomInfo}
  <div id="findRes" class="qp-grid">${lim.map(x=>`<div class="card qp-c qp-hit" role="button" tabindex="0" onclick="QP.fgo('${x.go}','${H(x.room)}')"><div class="row" style="margin:0;flex-wrap:wrap"><span aria-hidden="true">${x.ic}</span>${x.room?`<b>${B("Rm","Hab.")} ${H(x.room)}</b>`:""}${hs.length>1?`<span class="pill RFI">${x.h}</span>`:""}${x.st?`<span class="pill ${x.done?"VC":"OD"}">${H(x.st)}</span>`:""}</div><div class="raw">${H(x.title)}</div>${x.sub?`<small class="raw">${H(x.sub.slice(0,160))}</small><br>`:""}<small>${H(/T\d/.test(x.at)?fmt(x.at):x.at)}</small></div>`).join("")||`<div class="card"><small>${q?B("Nothing found.","No se encontró nada."):B("Type a room number to see its full history.","Escribe un número de cuarto para ver su historial.")}</small></div>`}</div>`}
QP.fgo=(t,room)=>{if(room&&/^\d+$/.test(room)&&S.fq!==room){S.fq=room;render();scrollTo(0,0);return}let ok=false;try{ok=rIds().includes(t)}catch(e){}if(t&&t!=="find"&&ok)go(t)};

/* ---------- (8) corporate reports ---------- */
function woAge(w){if(w.at)return Math.max(0,Math.floor(mins(w.at)/1440));return (Number(w.id)*5)%23}
function repData(h){const d=S.h[h],q=d.pmq||{total:0,done:0},dl=daysLeft(),open=(d.wo||[]).filter(w=>w.s!=="Done"),b=[0,0,0,0];open.forEach(w=>{const a=woAge(w);b[a<=2?0:a<=7?1:a<=14?2:3]++});
  const wk=Object.keys(d.pmDay||{}).filter(k=>dayDiff(today(),k)<7).reduce((a,k)=>a+(d.pmDay[k]||[]).filter(e=>e.done).length,0);
  const gr=grList(h),ack=gr.filter(r=>r.ackAt),res=gr.filter(r=>r.doneAt),inSla=ack.filter(r=>mins(r.at,r.ackAt)<=slaMin(r)).length,need=(q.total-q.done)/dl;
  const s=dcState(h),dk=Object.keys(s.rooms);
  return {h,pm:{done:q.done,total:q.total,pct:q.total?Math.round(100*q.done/q.total):0,need:need.toFixed(1),wk,on:need<=1.5},wo:{open:open.length,b},rq:{n:gr.length,ack:ack.length?Math.round(ack.reduce((a,r)=>a+mins(r.at,r.ackAt),0)/ack.length):0,res:res.length?Math.round(res.reduce((a,r)=>a+mins(r.at,r.doneAt),0)/res.length):0,sla:ack.length?Math.round(100*inSla/ack.length):100,open:gr.filter(grStillOpen).length},dc:{over:dk.filter(n=>dcLeft(n,h)<0).length,n:dk.length}}}
const repHotels=()=>isCorp()?Object.keys(HOTELS):[S.hotel];
function repHtml(){const R=repHotels().map(repData),td="padding:6px 10px;border:1px solid #d5deea;text-align:left",th=td+";background:#14365d;color:#fff";
  const tb=(hd,rows)=>`<table style="border-collapse:collapse;font:14px Arial,sans-serif;margin:6px 0 16px"><tr>${hd.map(x=>`<th style="${th}">${x}</th>`).join("")}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td style="${td}">${c}</td>`).join("")}</tr>`).join("")}</table>`;
  return `<div style="font:14px Arial,sans-serif;color:#1d2733"><h2 style="color:#14365d;margin-top:0">HotelHQ · ${B("Weekly corporate report","Reporte corporativo semanal")} · ${H(new Date().toLocaleDateString(localeTag(),{month:"short",day:"numeric",year:"numeric"}))}</h2>
  <h3>${B("Room PM progress (quarter)","Avance PM de habitaciones (trimestre)")}</h3>${tb(["Hotel",B("Done","Hechos"),"%",B("This week","Esta semana"),B("Need/day","Necesario/día"),B("Status","Estado")],R.map(r=>[r.h,r.pm.done+"/"+r.pm.total,r.pm.pct+"%",r.pm.wk,r.pm.need,r.pm.on?"✅ "+B("On track","En camino"):"⚠️ "+B("Behind","Atrasado")]))}
  <h3>${B("Open work order aging","Antigüedad de órdenes abiertas")}</h3>${tb(["Hotel",B("Open","Abiertas"),"0–2 d","3–7 d","8–14 d","15+ d"],R.map(r=>[r.h,r.wo.open].concat(r.wo.b)))}
  <h3>${B("Guest request response times","Tiempos de respuesta a solicitudes")}</h3>${tb(["Hotel",B("Requests","Solicitudes"),B("Open","Abiertas"),B("Avg response","Resp. prom."),B("Avg resolve","Resol. prom."),B("Within SLA","Dentro de SLA")],R.map(r=>[r.h,r.rq.n,r.rq.open,r.rq.ack+" min",dur(r.rq.res),r.rq.sla+"%"]))}
  <h3>${B("Deep cleans","Limpiezas profundas")}</h3>${tb(["Hotel",B("Rooms","Cuartos"),B("Overdue","Atrasadas")],R.map(r=>[r.h,r.dc.n,r.dc.over]))}
  <p style="color:#5b6b7f;font-size:12px">${B("Generated by HotelHQ. Includes EXAMPLE data until live sign-in is on.","Generado por HotelHQ. Incluye datos de EJEMPLO hasta activar el inicio de sesión.")}</p></div>`}
function repView(){const R=repHotels().map(repData);
  return `<h2>📨 ${B("Corporate Reports","Reportes corporativos")}</h2>
  <div class="card" id="repSched"><h3>📅 ${B("Schedule (design)","Programación (diseño)")}</h3><small>${B("Weekly PM progress, WO aging and request response times · every Monday 7:00 AM CT → corporate. Replaces the manual Monday PM emails. Sending stays OFF until the report mailbox is set up.","Avance PM, antigüedad de órdenes y tiempos de respuesta · cada lunes 7:00 AM CT → corporativo. Reemplaza los correos manuales de los lunes. El envío sigue APAGADO hasta configurar el buzón.")}</small><div class="chips"><span class="pill OD">${B("Not sending","Sin enviar")}</span></div><div class="row" style="flex-wrap:wrap"><button class="btn" onclick="QP.repDl()">⬇️ ${B("Email this (download HTML)","Enviar por correo (descargar HTML)")}</button><button class="btn2" onclick="QP.repCopy()">📋 ${B("Copy HTML","Copiar HTML")}</button></div></div>
  <div class="qp-grid">${R.map(r=>`<div class="card"><h3>🏨 ${r.h}</h3><div class="kpi"><div><b>${r.pm.pct}%</b>PM ${r.pm.done}/${r.pm.total}</div><div><b class="${r.pm.on?"good":"bad"}">${r.pm.need}</b>${B("Need/day","Necesario/día")}</div><div><b>${r.pm.wk}</b>${B("PM this week","PM semana")}</div></div>
   <div class="qp-bar" role="img" aria-label="${r.pm.pct}%"><i style="width:${r.pm.pct}%"></i></div><h4>${B("Open WO aging","Antigüedad de órdenes")}</h4><div class="kpi">${["0–2 d","3–7 d","8–14 d","15+ d"].map((l,i)=>`<div><b class="${i===3&&r.wo.b[3]?"bad":""}">${r.wo.b[i]}</b>${l}</div>`).join("")}</div>
   <h4>${B("Guest requests","Solicitudes")}</h4><div class="kpi"><div><b>${r.rq.ack} min</b>${B("Avg response","Resp. prom.")}</div><div><b>${r.rq.sla}%</b>SLA</div><div><b>${r.rq.open}</b>${B("Open","Abiertas")}</div></div><small>🧽 ${r.dc.over} ${B("deep cleans overdue","limpiezas atrasadas")}</small></div>`).join("")}</div>
  <div class="card"><h3>👁️ ${B("Email preview","Vista previa del correo")}</h3><div id="repPrev" style="overflow:auto;background:#fff;border:1px solid #d5deea;border-radius:8px;padding:8px">${repHtml()}</div></div>`}
QP.repDl=()=>{const html="<!doctype html><html><head><meta charset='utf-8'><title>HotelHQ report</title></head><body>"+repHtml()+"</body></html>";const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([html],{type:"text/html"}));a.download="hotelhq-weekly-report-"+today()+".html";document.body.appendChild(a);a.click();a.remove();audit("report","weekly","exported");save();showToast(B("Report downloaded — nothing was sent","Reporte descargado — no se envió nada"))};
QP.repCopy=()=>{const ok=()=>showToast(B("HTML copied","HTML copiado")),no=()=>showToast(B("Copy blocked by browser","El navegador bloqueó copiar"));try{navigator.clipboard.writeText(repHtml()).then(ok,no)}catch(e){no()}};

/* ---------- (10) audit view ---------- */
const AU_ENT={wo:["Work order","Orden"],gi:["Guest issue","Queja"],gr:["Guest request","Solicitud"],room:["Room","Cuarto"],pm:["PM","PM"],log:["Log sheet","Bitácora"],template:["Template","Plantilla"],notice:["Room notice","Aviso"],deepclean:["Deep clean","Limpieza profunda"],import:["Import","Importación"],report:["Report","Reporte"]};
function auView(){const q0=Q();if(!q0.auSeed){q0.auSeed=1;q0.au.push({at:agoIso(45),by:"Front desk (EX)",role:"Front Desk",hotel:S.hotel,ent:"gr",id:"1",act:"created",from:"",to:"open",note:"EXAMPLE"},{at:agoIso(30),by:"Maintenance (EX)",role:"Maintenance",hotel:S.hotel,ent:"wo",id:"1",act:"status",from:"Open",to:"In Progress",note:"EXAMPLE"});save()}
  const hs=isCorp()&&S.auh==="all"?Object.keys(HOTELS):[S.hotel];let A=[];hs.forEach(h=>A=A.concat(Q(h).au));
  const e=S.aue||"all",q=(S.auq||"").toLowerCase();A=A.filter(x=>(e==="all"||x.ent===e)&&(!q||JSON.stringify(x).toLowerCase().includes(q))).sort((a,b)=>b.at.localeCompare(a.at));
  return `<h2>🧾 ${B("Audit Trail","Historial de cambios")}</h2><small>${B("Who changed what, and when. Visible to GM, AGM and corporate only.","Quién cambió qué y cuándo. Solo GM, AGM y corporativo.")}</small>
  <div class="card"><input id="auq" type="search" style="width:100%" placeholder="🔍 ${H(B("Search person, room, record…","Buscar persona, cuarto, registro…"))}" value="${H(S.auq||"")}" oninput="S.auq=this.value;QP.keep('auq')" aria-label="${H(B("Search audit trail","Buscar historial"))}"><div class="row" style="flex-wrap:wrap"><select aria-label="${H(B("Record type","Tipo"))}" onchange="S.aue=this.value;render()">${["all"].concat(Object.keys(AU_ENT)).map(k=>`<option value="${k}" ${e===k?"selected":""}>${k==="all"?B("All records","Todos"):H(B(AU_ENT[k][0],AU_ENT[k][1]))}</option>`).join("")}</select>${isCorp()?`<button class="chip ${S.auh==="all"?"on":""}" onclick="S.auh=S.auh==='all'?'':'all';render()">🏨 ${B("All hotels","Todos los hoteles")}</button>`:""}</div><small>${A.length} ${B("changes","cambios")}</small></div>
  <div class="card"><div class="qp-tw"><table class="qp-t" id="auTbl"><thead><tr><th>${B("When","Cuándo")}</th><th>${B("Who","Quién")}</th><th>${B("Role","Puesto")}</th>${hs.length>1?"<th>Hotel</th>":""}<th>${B("Record","Registro")}</th><th>${B("Id","Id")}</th><th>${B("Action","Acción")}</th><th>${B("From","De")}</th><th>${B("To","A")}</th><th>${B("Note","Nota")}</th></tr></thead><tbody>${A.slice(0,300).map(x=>`<tr><td data-l="${H(B("When","Cuándo"))}">${H(fmt(x.at))}</td><td data-l="${H(B("Who","Quién"))}">${H(x.by)}</td><td data-l="${H(B("Role","Puesto"))}">${H(x.role?roleName(x.role):"")}</td>${hs.length>1?`<td data-l="Hotel">${H(x.hotel||"")}</td>`:""}<td data-l="${H(B("Record","Registro"))}">${H(AU_ENT[x.ent]?B(AU_ENT[x.ent][0],AU_ENT[x.ent][1]):x.ent)}</td><td data-l="Id">${H(x.id)}</td><td data-l="${H(B("Action","Acción"))}">${H(x.act)}</td><td data-l="${H(B("From","De"))}">${H(x.from||"")}</td><td data-l="${H(B("To","A"))}">${H(x.to||"")}</td><td data-l="${H(B("Note","Nota"))}">${H(x.note||"")}</td></tr>`).join("")||`<tr><td colspan="10"><small>${B("No changes yet.","Sin cambios.")}</small></td></tr>`}</tbody></table></div></div>`}

/* ---------- (9) Quore CSV importer ---------- */
const IMP={wo:{n:["Work order history","Historial de órdenes"],f:[["ext","Quore ID",["id","work order id","wo #","work order #","number","ticket"]],["room","Room / location",["room","location","area","room number"]],["title","Description",["description","title","issue","summary","task"]],["status","Status",["status","state"]],["at","Created",["created","created date","date created","opened","date"]],["done","Completed",["completed","completed date","closed","date completed","resolved"]],["who","Assigned to",["assigned","assigned to","technician","completed by"]]],req:["title"]},
 pm:{n:["PM history","Historial de PM"],f:[["ext","Quore ID",["id","pm id","inspection id"]],["room","Room / asset",["room","location","asset","room number"]],["title","Template / task",["template","pm","name","task","checklist"]],["status","Status",["status"]],["at","Completed date",["date completed","completed date","completed","date"]],["who","Completed by",["completed by","technician","user","assigned to"]]],req:["room","at"]},
 assets:{n:["Assets / equipment","Activos / equipos"],f:[["ext","Quore ID",["asset id","id"]],["title","Asset name",["asset","name","equipment","description"]],["room","Location",["location","room","area"]],["model","Model",["make/model","model","make"]],["serial","Serial",["serial number","serial","serial #"]],["at","Installed",["install date","installed","purchase date"]]],req:["title"]}};
const IMP_SAMPLE={wo:"Work Order #,Location,Description,Status,Date Created,Date Completed,Assigned To\n10231,214,PTAC not cooling,Completed,2026-08-02,2026-08-03,Tech A\n10244,Lobby,Front door closer adjust,Completed,2026-08-10,2026-08-10,Tech A\n10301,118,Toilet running,Open,2026-10-20,,Tech B\n10302,305,Light out over vanity,Completed,2026-10-21,2026-10-21,Tech B\n10303,,Missing description row,Open,not-a-date,,",
 pm:"Room,Template,Status,Date Completed,Completed By\n101,Guest Room,Completed,2026-07-14,Tech A\n102,Guest Room,Completed,2026-07-15,Tech A\n103,Guest Room,Completed,2026-07-15,Tech B\n214,Guest Room,Completed,2026-09-02,Tech A\nBoiler,Monthly Boiler,Completed,2026-10-01,Tech B",
 assets:"Asset ID,Asset,Location,Make/Model,Serial Number,Install Date\nA-1,PTAC unit,214,Example PTAC 12k,SN-EX-0001,2019-05-01\nA-2,Ice machine,2nd floor,Example ice 300,SN-EX-0002,2021-03-12"};
function csvParse(t){const rows=[];let r=[],c="",q=false;t=String(t||"").replace(/\r/g,"").replace(/^\uFEFF/,"");for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}else if(ch==='"')q=true;else if(ch===","){r.push(c);c=""}else if(ch==="\n"){r.push(c);rows.push(r);r=[];c=""}else c+=ch}if(c||r.length){r.push(c);rows.push(r)}return rows.filter(x=>x.some(v=>v.trim()))}
function impSt(){S.imp=S.imp||{kind:"wo",text:"",map:{}};return S.imp}
function impAuto(){const s=impSt(),hd=(csvParse(s.text)[0]||[]).map(x=>x.trim().toLowerCase()),used=new Set();s.map={};IMP[s.kind].f.forEach(([k,,syn])=>{let i=-1;for(const x of syn){i=hd.findIndex((h,j)=>h===x&&!used.has(j));if(i>=0)break}if(i<0)i=hd.findIndex((h,j)=>!used.has(j)&&syn.some(x=>x.length>2&&h.includes(x)));if(i>=0){s.map[k]=i;used.add(i)}})}
function impRows(){const s=impSt(),rows=csvParse(s.text).slice(1),F=IMP[s.kind];return rows.map(r=>{const o={};F.f.forEach(([k])=>{const i=s.map[k];o[k]=i==null||i===""?"":String(r[+i]||"").trim()});const err=F.req.filter(k=>!o[k]);["at","done"].forEach(k=>{if(o[k]&&isNaN(new Date(o[k])))err.push(k)});o._err=err;return o})}
function impView(){const s=impSt(),rows=csvParse(s.text),hd=rows[0]||[],F=IMP[s.kind],P=s.text?impRows():[],bad=P.filter(r=>r._err.length).length,hist=Q().hist,done=Q().imp;
  return `<h2>📥 ${B("Import from Quore","Importar de Quore")}</h2><small>${B("Bring PM, work order and asset history over from Quore CSV exports so nothing is lost. Map the columns, check the preview, then import.","Trae el historial de PM, órdenes y activos desde exportaciones CSV de Quore. Asigna columnas, revisa la vista previa y luego importa.")}</small>
  <div class="qp-2"><div class="card" id="impForm"><h3>1 · ${B("Choose file","Elegir archivo")}</h3><div class="chips">${Object.keys(IMP).map(k=>`<button class="chip ${s.kind===k?"on":""}" onclick="QP.impKind('${k}')">${H(B(IMP[k].n[0],IMP[k].n[1]))}</button>`).join("")}</div>
   <input type="file" accept=".csv,text/csv" onchange="QP.impFile(this)" aria-label="${H(B("Quore CSV file","Archivo CSV de Quore"))}"><textarea id="impTxt" style="width:100%;min-height:90px;font-family:monospace;font-size:12px" placeholder="${H(B("…or paste CSV here","…o pega el CSV aquí"))}" onchange="QP.impText(this.value)" aria-label="CSV">${H(s.text)}</textarea><button class="btn2" onclick="QP.impSample()">${B("Load sample (EXAMPLE)","Cargar ejemplo")}</button>
   ${hd.length?`<h3>2 · ${B("Map columns","Asignar columnas")}</h3><div class="qp-fs">${F.f.map(([k,l])=>`<label class="qp-f"><small>${H(l)}${F.req.includes(k)?" *":""}</small><select onchange="QP.impMap('${k}',this.value)"><option value="">— ${B("skip","omitir")} —</option>${hd.map((h,i)=>`<option value="${i}" ${String(s.map[k])===String(i)?"selected":""}>${H(h)}</option>`).join("")}</select></label>`).join("")}</div>`:""}</div>
  <div>${P.length?`<div class="card" id="impPrev"><h3>3 · ${B("Preview","Vista previa")} (${P.length} ${B("rows","filas")}${bad?`, <span class="bad">${bad} ${B("with problems","con problemas")}</span>`:""})</h3><div class="qp-tw"><table class="qp-t"><thead><tr>${F.f.map(([,l])=>`<th>${H(l)}</th>`).join("")}<th></th></tr></thead><tbody>${P.slice(0,10).map(r=>`<tr class="${r._err.length?"qp-bad":""}">${F.f.map(([k,l])=>`<td data-l="${H(l)}" class="${r._err.includes(k)?"bad":""}">${H(r[k])}${r._err.includes(k)?" ⚠️":""}</td>`).join("")}<td>${r._err.length?"⚠️":"✅"}</td></tr>`).join("")}</tbody></table></div>${P.length>10?`<small>+${P.length-10} ${B("more","más")}</small>`:""}
   <button class="btn" style="width:100%;margin-top:8px" onclick="QP.impGo()" ${P.length-bad?"":"disabled"}>📥 ${B("Import","Importar")} ${P.length-bad} ${B("rows","filas")}${bad?" ("+B("skip","omitir")+" "+bad+")":""}</button></div>`:""}
   <div class="card"><h3>${B("Imported so far","Importado hasta ahora")}</h3><div class="kpi"><div><b>${hist.wo.length}</b>${B("Work orders","Órdenes")}</div><div><b>${hist.pm.length}</b>PMs</div><div><b>${hist.assets.length}</b>${B("Assets","Activos")}</div></div>${done.slice(0,5).map(x=>`<div class="li"><small>${H(fmt(x.at))} · ${H(x.kind)} · ${x.n} ${B("rows","filas")} · ${H(x.by)}</small></div>`).join("")}<small>${B("Imported records show up in Search & History. Duplicates are skipped.","Los registros importados aparecen en Buscar e historial. Se omiten duplicados.")}</small></div></div></div>`}
QP.impKind=k=>{impSt().kind=k;impAuto();render()};
QP.impText=v=>{impSt().text=v;impAuto();render()};
QP.impSample=()=>{const s=impSt();s.text=IMP_SAMPLE[s.kind];impAuto();render()};
QP.impFile=el=>{const f=el.files&&el.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{impSt().text=String(e.target.result||"");impAuto();render()};r.readAsText(f)};
QP.impMap=(k,v)=>{impSt().map[k]=v===""?"":+v;render()};
QP.impGo=()=>{const s=impSt(),P=impRows().filter(r=>!r._err.length),HH=Q().hist[s.kind],seen=new Set(HH.map(x=>x.ext+"|"+x.room+"|"+x.at+"|"+x.title));let n=0;
  P.forEach(r=>{const at=r.at?new Date(r.at).toISOString():"",o={ext:r.ext,room:r.room,title:r.title,status:r.status||(s.kind==="pm"?"Done":""),at,done:r.done||"",who:r.who||"",model:r.model||"",serial:r.serial||"",src:"quore"};const key=o.ext+"|"+o.room+"|"+o.at+"|"+o.title;if(seen.has(key))return;seen.add(key);HH.push(o);n++});
  Q().imp.unshift({at:nowIso(),kind:s.kind,n,by:cw()});audit("import",s.kind,"imported","",n+" rows");S.imp={kind:s.kind,text:"",map:{}};save();showToast(B(n+" rows imported",n+" filas importadas"));render()};

/* ---------- wiring: tabs, roles, nav, i18n, home cards, styles ---------- */
const TABS={greq:["🙋","Guest Requests","Solicitudes",grView],find:["🔎","Search & History","Buscar e historial",findView],logs:["📒","Log Sheets","Bitácoras",lsView],notice:["📌","Room Notices","Avisos de habitación",rnView],dc:["🧽","Deep Cleans","Limpiezas profundas",dcView],crep:["📨","Corporate Reports","Reportes corporativos",repView],audit:["🧾","Audit Trail","Historial de cambios",auView],qimp:["📥","Quore Import","Importar de Quore",impView]};
Object.keys(TABS).forEach(k=>{M[k]=[TABS[k][0],TABS[k][1]];I18N.es[TABS[k][1]]=TABS[k][2];V[k]=TABS[k][3]});
const ACC={greq:["GM","Front Desk","Housekeeping","Housekeeper","Maintenance","House Person","Breakfast Attendant"],find:["GM","Front Desk","Housekeeping","Maintenance"],logs:["GM","Front Desk","Maintenance","Housekeeping"],notice:["GM","Front Desk","Housekeeping","Housekeeper"],dc:["GM","Housekeeping","Housekeeper"],crep:["GM"],audit:["GM"],qimp:["GM","Maintenance"]};
const MGR_ONLY={crep:1,audit:1};
Object.keys(ACC).forEach(k=>ACC[k].forEach(r=>{TILES[r]=TILES[r]||[];if(!TILES[r].includes(k))TILES[r].push(k)}));
const _tf=window.tilesFor;window.tilesFor=function(role){let t=_tf(role);if(!isMgr())t=t.filter(x=>!MGR_ONLY[x]);if(!(isMgr()||AR()==="Maintenance"))t=t.filter(x=>x!=="qimp");return t};
try{RSEC[1][2].push("find","notice","dc","logs");RSEC[2][2].unshift("greq");RSEC[4][2].push("crep","audit","qimp")}catch(e){}
try{QA["Front Desk"]=["greq","gi","rushq","notes"];["GM","AGM","Above Property"].forEach(r=>{if(QA[r]&&!QA[r].includes("greq"))QA[r].splice(1,0,"greq")});RQL.greq=["Guest requests","Solicitudes"];RQL.find=["Search everything","Buscar todo"];RQL.logs=["Log sheets","Bitácoras"];
  const _qc=window.qaCount;window.qaCount=function(id){if(id==="greq")try{return grList().filter(grStillOpen).length}catch(e){return 0}return _qc(id)}}catch(e){}
try{const _pi=window.palItems;window.palItems=function(q){const a=_pi(q);if(q&&q.trim()&&rIds().includes("find"))a.unshift({k:"s",id:"find",ic:"🔎",lb:B("Search everything for “","Buscar todo: “")+q.trim()+"”",sub:B("History","Historial"),q:q.trim()});return a.slice(0,14)};
  const _pp=window.palPick;window.palPick=function(i){const x=PAL&&PAL.items[i];if(x&&x.id==="find"&&x.q)S.fq=x.q;return _pp(i)}}catch(e){}
const _home=V.home;V.home=function(){let h="";try{const ids=rIds();const gr=grList().filter(r=>grStillOpen(r)&&grMine(r)),ov=gr.filter(grOver).length,cb=grList().filter(r=>grMine(r)&&grCbDue(r)).length;
  const loopN=grList().filter(r=>grMine(r)&&grNeedsLoop(r)).length;
  if(ids.includes("greq")&&(gr.length||cb||loopN))h+=`<div class="card" id="qpHomeGr" onclick="go('greq')" style="cursor:pointer"><b>🙋 ${B("Guest requests","Solicitudes de huéspedes")}</b> · ${gr.length} ${B("open","abiertas")}${ov?`<div class="miss-banner" style="margin:6px 0 0">🚨 ${ov} ${B("past response time","pasaron el tiempo de respuesta")}</div>`:""}${cb?`<div class="bad">📞 ${cb} ${B("callback(s) due","llamada(s) pendiente(s)")}</div>`:""}${loopN?`<div class="bad">📞 ${loopN} ${B("need a guest follow-up","faltan seguimiento al huésped")}</div>`:""}</div>`;
  const rn=rnActive();if(ids.includes("notice")&&rn.length)h+=`<div class="card" id="qpHomeRn" onclick="go('notice')" style="cursor:pointer"><b>📌 ${B("Room notices","Avisos de habitación")}</b><div class="qp-rn">${rn.slice(0,8).map(x=>{const t=f4(RN,x.ty);return `<span class="pill ${t[4]}">${t[1]} ${H(x.room)}</span>`}).join("")}</div></div>`}catch(e){console.warn(e)}return h+_home()};
const st=document.createElement("style");st.textContent=`.qp-rn{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px}.qp-rn .pill{font-size:11px;padding:2px 6px}
.qp-t{width:100%;border-collapse:collapse;font-size:14px}.qp-t th,.qp-t td{padding:6px 8px;border-bottom:1px solid #e3e8ef;text-align:left;vertical-align:top}.qp-t th{background:#f4f7fb;font-size:12px;position:sticky;top:0}.qp-tw{overflow:auto;max-height:70vh}.qp-bad{background:#fff1f0}
.qp-fs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.qp-f{display:flex;flex-direction:column;gap:2px;min-width:0}.qp-f input,.qp-f select{width:100%}.qp-chk{flex-direction:row;align-items:center;gap:8px;min-height:44px}
.qp-bar{height:8px;background:#e6ebf2;border-radius:4px;overflow:hidden;margin:6px 0}.qp-bar i{display:block;height:100%;background:#15642f}.qp-hit{cursor:pointer}.qp-c{margin-bottom:8px}
.qp-grid{display:grid;grid-template-columns:1fr;gap:0 12px}.qp-2{display:grid;grid-template-columns:1fr;gap:0 16px}.qp-2>*{min-width:0}#app>.qp-2,#app>.qp-grid,#app>.kpi,#app>.qp-tw,#app>.chips,#app>.qp-span{column-span:all}
@media(max-width:560px){.qp-t thead{display:none}.qp-t tr{display:block;border-bottom:1px solid #e3e8ef;padding:6px 0}.qp-t td{display:flex;gap:8px;border:0;padding:2px 4px}.qp-t td[data-l]::before{content:attr(data-l);font-size:12px;color:#5b6b7f;min-width:110px;flex:none}}
@media(min-width:768px){.qp-grid{grid-template-columns:1fr 1fr}}@media(min-width:1024px){.qp-2{grid-template-columns:minmax(320px,420px) 1fr;align-items:start}.qp-2>.card:first-child{position:sticky;top:12px}}`;document.head.appendChild(st);
setInterval(()=>{try{if(meUser()&&S.tab==="greq"&&!(document.activeElement&&document.activeElement.matches("input,textarea,select")))render()}catch(e){}},60000);
/* Shared database. Demo rows (ex:1) never leave this device. */
function qpSb(){try{return (typeof sb!=="undefined"&&sb)?sb:null}catch(e){return null}}
const qpSent=new WeakMap();
let qpChain=Promise.resolve();
function grToDb(r){
  const ini=String(r.ini||"").trim().toUpperCase();
  const body={
    hotel_id:S.hotel,
    kind:r.type==="complaint"?"complaint":"request",
    room:String(r.room||"").slice(0,40),
    guest_initial:/^[A-Z]$/.test(ini)?ini:null,
    category:String(r.cat||"other"),
    priority:["low","med","high","urgent"].includes(r.pri)?r.pri:"med",
    sla_minutes:+slaMin(r)||25,
    note:r.note||"",
    dept:r.dept||"",
    assignee_label:r.to||"",
    status:["open","ack","done"].includes(r.st)?r.st:"open",
    callback_at:r.cb&&r.cb.at?r.cb.at:null,
    callback_done_at:r.cb&&r.cb.done?(r.cb.doneAt||nowIso()):null,
    recovery:r.rec&&r.rec!=="none"?r.rec:null,
    resolution:r.res||null,
    author_label:r.by||"",
    example:false,
    ack_at:r.ackAt||null,
    done_at:r.doneAt||null,
    escalated_at:r.esc?(r.escAt||r.ackAt||r.at||null):null
  };
  return body;
}
function grFromDb(row){
  return {id:row.id,sb:row.id,type:row.kind,room:row.room,ini:row.guest_initial?String(row.guest_initial).trim():"",cat:row.category,pri:row.priority,dept:row.dept||"",to:row.assignee_label||"",note:row.note||"",at:row.created_at,st:row.status,ackAt:row.ack_at,doneAt:row.done_at,esc:row.escalated_at?1:0,escAt:row.escalated_at||"",res:row.resolution||"",rec:row.recovery||"none",by:row.author_label||"",cb:row.callback_at?{at:row.callback_at,done:!!row.callback_done_at,doneAt:row.callback_done_at||""}:null,ex:row.example?1:0};
}
function rnToDb(x){
  const ended=x.until&&new Date(x.until)<=new Date();
  return {hotel_id:S.hotel,room:String(x.room||""),kind:x.ty,note:x.note||"",expires_at:x.until,ended_at:ended?(x.ended||x.until):null,author_label:x.by||"",example:false};
}
function rnFromDb(row){
  const until=row.ended_at||row.expires_at;
  return {id:row.id,sb:row.id,room:row.room,ty:row.kind,note:row.note||"",until,at:row.created_at,by:row.author_label||"",ex:row.example?1:0,ended:row.ended_at||""};
}
function splitLog(sheet,e){
  const s=lsTpl().find(x=>x.id===sheet),plain={},sens={};
  (s?s.f:[]).forEach(f=>{if(f.sens)sens[f.k]=e.v[f.k];else plain[f.k]=e.v[f.k]});
  const oor=(s?s.f:[]).some(f=>lsOut(f,e.v[f.k]));
  let balanced=null;
  if(sheet==="cash")balanced=(+e.v.cnt||0)===(+e.v.exp||0);
  return {body:{hotel_id:S.hotel,sheet,data:plain,out_of_range:oor,balanced,author_label:e.by||"",example:false},sens,balanced};
}
async function qpPushGr(client){
  for(const r of grList()){
    if(r.ex)continue;
    const body=grToDb(r),key=JSON.stringify(body)+"|"+(r.sb||"");
    if(qpSent.get(r)===key)continue;
    const res=r.sb?await client.from("guest_requests").update(body).eq("id",r.sb).select().single():await client.from("guest_requests").insert(body).select().single();
    if(res.error){console.warn("guest_requests",res.error.message||res.error);continue}
    if(res.data){r.sb=res.data.id;r.id=res.data.id}
    qpSent.set(r,JSON.stringify(grToDb(r))+"|"+(r.sb||""));
  }
}
async function qpPushLogs(client){
  const logs=lsRows();
  for(const sheet of Object.keys(logs)){
    const fields=(lsTpl().find(x=>x.id===sheet)||{}).f||[];
    for(const e of logs[sheet]){
      if(e.ex)continue;
      const pack=splitLog(sheet,e),key=JSON.stringify(pack.body)+"|"+(e.sb||"");
      if(qpSent.get(e)===key)continue;
      const res=e.sb?await client.from("log_entries").update(pack.body).eq("id",e.sb).select().single():await client.from("log_entries").insert(pack.body).select().single();
      if(res.error){console.warn("log_entries",res.error.message||res.error);continue}
      if(res.data){e.sb=res.data.id;e.id=res.data.id;e.balanced=pack.balanced}
      if(Object.keys(pack.sens).length){
        const ins=await client.from("log_entry_sensitive").insert({entry_id:e.sb,hotel_id:S.hotel,data:pack.sens});
        if(ins.error&&!/duplicate|23505/i.test(String(ins.error.message||ins.error.code||"")))console.warn("log_entry_sensitive",ins.error.message||ins.error);
        if(!lsSeeSens())Object.keys(pack.sens).forEach(k=>{e.v[k]=""})}
      qpSent.set(e,JSON.stringify(splitLog(sheet,e).body)+"|"+(e.sb||""));
    }
  }
}
async function qpPushTpl(client){
  const rows=lsTpl().filter(s=>s._dirty).map(s=>({hotel_id:S.hotel,sheet:s.id,fields:s.f,hidden:!!s.off}));
  if(!rows.length)return;
  const res=await client.from("log_templates").upsert(rows,{onConflict:"hotel_id,sheet"});
  if(!res.error)lsTpl().forEach(s=>{s._dirty=0;s.sb=1});
}
async function qpEnsureTpl(client){
  const got=await client.from("log_templates").select("sheet").eq("hotel_id",S.hotel);
  if(got.error||(got.data&&got.data.length))return;
  const rows=lsTpl().map(s=>({hotel_id:S.hotel,sheet:s.id,fields:s.f,hidden:!!s.off}));
  await client.from("log_templates").upsert(rows,{onConflict:"hotel_id,sheet"});
}
async function qpPushRn(client){
  for(const x of rnList()){
    if(x.ex)continue;
    const body=rnToDb(x),key=JSON.stringify(body)+"|"+(x.sb||"");
    if(qpSent.get(x)===key)continue;
    const res=x.sb?await client.from("room_notices").update(body).eq("id",x.sb).select().single():await client.from("room_notices").insert(body).select().single();
    if(res.error){console.warn("room_notices",res.error.message||res.error);continue}
    if(res.data){x.sb=res.data.id;x.id=res.data.id}
    qpSent.set(x,JSON.stringify(rnToDb(x))+"|"+(x.sb||""));
  }
}
function qpFlush(kind){
  if(qpDemo())return;
  qpChain=qpChain.then(()=>qpFlushNow(kind)).catch(e=>console.warn("qp",e));
}
async function qpFlushNow(kind){
  const client=qpSb();if(!client||qpDemo())return;
  if(!kind||kind==="gr")await qpPushGr(client);
  if(!kind||kind==="log")await qpPushLogs(client);
  if(!kind||kind==="tpl")await qpPushTpl(client);
  if(!kind||kind==="rn")await qpPushRn(client);
}
async function qpPull(){
  if(qpDemo())return;
  const client=qpSb();if(!client)return;
  const h=S.hotel;
  const [gr,tpl,en,sens,rn]=await Promise.all([
    client.from("guest_requests").select("*").eq("hotel_id",h).order("created_at",{ascending:false}),
    client.from("log_templates").select("*").eq("hotel_id",h),
    client.from("log_entries").select("*").eq("hotel_id",h).order("created_at",{ascending:false}),
    client.from("log_entry_sensitive").select("*").eq("hotel_id",h),
    client.from("room_notices").select("*").eq("hotel_id",h).order("created_at",{ascending:false})
  ]);
  const q=Q();
  if(!gr.error)q.gr=(gr.data||[]).map(grFromDb).concat((q.gr||[]).filter(r=>!r.ex&&!r.sb));
  if(!tpl.error&&tpl.data&&tpl.data.length){
    const base=JSON.parse(JSON.stringify(LS_DEF));
    tpl.data.forEach(row=>{
      let s=base.find(x=>x.id===row.sheet);
      if(!s){s={id:row.sheet,ic:"📒",n:[row.sheet,row.sheet],roles:["GM","AGM"],f:[]};base.push(s)}
      if(Array.isArray(row.fields)&&row.fields.length)s.f=row.fields;
      s.off=row.hidden?1:0;s.sb=1;
    });
    q.tpl=base;
  }
  if(!en.error){
    const by={};(en.data||[]).forEach(row=>{
      const extra=(sens.data||[]).find(s=>s.entry_id===row.id);
      const v=Object.assign({},row.data||{},extra&&extra.data||{});
      (by[row.sheet]=by[row.sheet]||[]).push({id:row.id,sb:row.id,at:row.created_at,by:row.author_label||"",v,ex:row.example?1:0,balanced:row.balanced});
    });
    ["keys","pkg","wake","cash","pool","meter","vendor"].forEach(k=>{if(!by[k])by[k]=[]});
    const pending={};
    Object.keys(q.logs||{}).forEach(k=>{(q.logs[k]||[]).forEach(e=>{if(!e.ex&&!e.sb)(pending[k]=pending[k]||[]).push(e)})});
    Object.keys(pending).forEach(k=>{by[k]=(pending[k]||[]).concat(by[k]||[])});
    q.logs=by;
  }
  if(!rn.error)q.nt=(rn.data||[]).map(rnFromDb).concat((q.nt||[]).filter(x=>!x.ex&&!x.sb));
  try{await qpEnsureTpl(client)}catch(e){}
}
function qpWatch(name,kind){const fn=QP[name];if(typeof fn!=="function")return;QP[name]=function(){const out=fn.apply(this,arguments);qpFlush(kind);return out}}
["grPost","grAck","grAssign","grCb","grDone"].forEach(n=>qpWatch(n,"gr"));
["lsAdd","lsTick"].forEach(n=>qpWatch(n,"log"));
["rnAdd","rnEnd"].forEach(n=>qpWatch(n,"rn"));
function markTpl(id){const s=lsTpl().find(x=>x.id===id);if(s)s._dirty=1}
["lsRen","lsDel","lsNew","lsOff","lsReset"].forEach(function(name){
  const fn=QP[name];
  QP[name]=function(){const out=fn.apply(this,arguments);markTpl(arguments[0]);qpFlush("tpl");return out};
});
if(typeof hydrate==="function"){const _hy=hydrate;hydrate=async function(){const out=await _hy.apply(this,arguments);try{await qpPull();render()}catch(e){console.warn(e)}return out}}
if(typeof go==="function"){const _go=go;go=function(t){const out=_go.apply(this,arguments);if(!qpDemo()&&(t==="greq"||t==="logs"||t==="notice"||t==="dc"))qpPull().then(()=>{try{render()}catch(e){}});return out}}
window.QPX={audit,grList,lsRows,rnList,dcState,repHtml,csvParse,srcAll,qpDemo,qpPull,qpFlush};
try{if(meUser())render()}catch(e){}
})();
