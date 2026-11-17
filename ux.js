/* HotelHQ UX layer: role home, 5-item nav + More, search, quick actions, back header, guided tour, new-hire onboarding.
   Loads last. Wraps render(); keeps every existing view, permission and Example-data label. */
(function(){
const L=(en,es)=>LANG==="es"?es:en;
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const EXB=()=>`<span class="ex">${L("Example data","Datos de ejemplo")}</span>`;
/* ---------- onboarding data ---------- */
M.onb=["🎓","Onboarding"];
const OB_ROLES=["Housekeeper","House Person","Laundry Attendant","Front Desk","Maintenance","Breakfast Attendant","GM","AGM","Housekeeping","Shuttle Driver"];
Object.keys(TILES).forEach(r=>{if(!TILES[r].includes("onb"))TILES[r].push("onb")});
["Housekeeper","Shuttle Driver","House Person","Laundry Attendant","Breakfast Attendant","Front Desk","Housekeeping","Maintenance","GM"].forEach(r=>{TILES[r]=TILES[r]||[];if(!TILES[r].includes("onb"))TILES[r].push("onb")});
if(TILES["Shuttle Driver"]&&!TILES["Shuttle Driver"].includes("my"))TILES["Shuttle Driver"].push("my");
const POL=[["handbook","Employee handbook","Manual del empleado"],["safety","Safety & chemicals (SDS)","Seguridad y químicos (SDS)"],["keys","Key control","Control de llaves"],["brand","Brand standards","Estándares de la marca"]];
const Q=(k,en,es,qen,qes,opts,a)=>({k,en,es,q:[qen,qes],opts,a});
const COMMON=[["tour","Take the HotelHQ tour","Hacer el recorrido de HotelHQ"],["login","Log in within 30 min of shift start","Entrar a HotelHQ 30 min después de iniciar turno"],["emerg","Know fire exits & emergency plan","Conocer salidas y plan de emergencia"]];
const ROLE_ITEMS={
Housekeeper:[["cart","Stock your cart","Surtir tu carrito"],["clean","Shadow 3 checkout cleans","Observar 3 limpiezas de salida"],["mark","Mark a room clean in My Rooms","Marcar un cuarto limpio en Mis cuartos"]],
"House Person":[["lobby","Lobby & public area route","Ruta de lobby y áreas públicas"],["linen","Linen closet restock","Surtir closets de ropa"]],
"Laundry Attendant":[["mach","Machine & chemical setup","Máquinas y químicos"],["par","Linen par counts","Conteo de par de ropa"]],
"Front Desk":[["pms","Check-in / check-out in the PMS","Check-in / check-out en el PMS"],["greq","Log a guest request","Registrar una solicitud de huésped"],["cash","Cash drawer & audit basics","Caja y auditoría básica"]],
Maintenance:[["wo","Close a work order with photo","Cerrar una orden con foto"],["pm","Run a room PM","Hacer un PM de cuarto"],["lock","Lockout/tagout","Bloqueo y etiquetado"]],
"Breakfast Attendant":[["food","Food safety & temps","Inocuidad y temperaturas"],["setup","Breakfast setup & teardown","Montaje y cierre del desayuno"]],
GM:[["labor","Labor plan & Win/Loss","Plan laboral y Win/Loss"],["he","Hotel Effectiveness basics","Básicos de Hotel Effectiveness"],["brandsys","Brand systems access","Acceso a sistemas de marca"]],
AGM:[["labor","Labor plan & Win/Loss","Plan laboral y Win/Loss"],["mod","Manager-on-duty duties","Funciones de gerente en turno"]],
Housekeeping:[["insp","Inspect a room","Inspeccionar un cuarto"],["assign","Assign boards","Asignar cuartos"]],
"Shuttle Driver":[["pre","Vehicle pre-trip check","Revisión previa del vehículo"],["route","Airport / MOA routes","Rutas aeropuerto / MOA"]]};
const QUIZ=[Q("q_chem","Chemical safety quiz","Quiz de químicos","Where do you find chemical safety info?","¿Dónde encuentras la info de seguridad de químicos?",[["SDS binder","Carpeta SDS"],["Guest","Huésped"],["Nowhere","En ningún lado"]],0),
Q("q_key","Key control quiz","Quiz de llaves","A guest without a key asks you to open a room. You…","Un huésped sin llave te pide abrir un cuarto. Tú…",[["Open it","Lo abres"],["Send them to the front desk","Lo mandas a recepción"]],1)];
function OB(){S.onb=S.onb||{hires:[]};if(!S.onb.seeded){S.onb.seeded=1;const d=new Date(),ago=n=>new Date(d-n*864e5).toISOString().slice(0,10);
 [["ex-1","Sam Rivera (EX)","Housekeeper","MSPWE",ago(3)],["ex-2","Lee Park (EX)","Front Desk","MSPAM",ago(9)],["ex-3","Ana Flores (EX)","Laundry Attendant","MSPMS",ago(28)],["ex-4","Jo Kim (EX)","Maintenance","MSPWE",ago(1)]].forEach(([id,n,r,h,s],i)=>S.onb.hires.push({id,name:n,role:r,hotel:h,start:s,ex:1,buddy:"",done:{},quiz:{},sign:{},uni:"",key:"",chk:{},gm:null,...(i==2?{done:{tour:1,login:1,emerg:1,mach:1},sign:{handbook:L("signed","firmado")}}:{})}))}
 return S.onb}
function items(h){return [...COMMON,...(ROLE_ITEMS[h.role]||[])]}
function pct(h){const tot=items(h).length+QUIZ.length+POL.length+5;let n=items(h).filter(i=>h.done[i[0]]).length+QUIZ.filter(q=>h.quiz[q.k]).length+POL.filter(p=>h.sign[p[0]]).length+(h.uni?1:0)+(h.key?1:0)+["d1","d7","d30"].filter(k=>h.chk[k]).length;return Math.round(100*n/tot)}
function myHire(){const u=meUser();return u&&OB().hires.find(h=>h.uid===u.id)}
function canManage(){return leader()}
function hireById(id){return OB().hires.find(h=>h.id===id)}
window.uxOb={
 start(){const u=meUser();OB().hires.unshift({id:"u-"+u.id,uid:u.id,name:u.name,role:u.role,hotel:u.hotel||S.hotel,start:new Date().toISOString().slice(0,10),buddy:"",done:{},quiz:{},sign:{},uni:"",key:"",chk:{},gm:null});save();render()},
 tog(id,k){const h=hireById(id);h.done[k]=h.done[k]?0:1;save();render()},
 quiz(id,k,i){const h=hireById(id),q=QUIZ.find(x=>x.k===k);if(i===q.a){h.quiz[k]=1;save();render()}else{showToast(L("Not quite, try again","Casi, intenta otra vez"))}},
 sign(id,k){const h=hireById(id),v=(document.getElementById("sg-"+k)||{}).value||"";if(!v.trim()){showToast(L("Type your name to sign","Escribe tu nombre para firmar"));return}h.sign[k]=v.trim()+" · "+new Date().toLocaleDateString(localeTag());save();render()},
 set(id,f,v){const h=hireById(id);h[f]=v;save();render()},
 chk(id,k){if(!canManage())return;const h=hireById(id);h.chk[k]=h.chk[k]?0:cw()+" · "+new Date().toLocaleDateString(localeTag());save();render()},
 gm(id){if(!canManage())return;const h=hireById(id);if(pct(h)<100){showToast(L("Finish all items first","Primero completa todo"));return}h.gm=cw()+" · "+new Date().toLocaleDateString(localeTag());save();render()},
 open(id){S.obSel=id;save();render();scrollTo(0,0)},
 add(){if(!canManage())return;const n=document.getElementById("obn").value.trim(),r=document.getElementById("obr").value;if(!n){showToast(L("Enter a name","Escribe un nombre"));return}OB().hires.unshift({id:"h-"+Date.now(),name:n,role:r,hotel:S.hotel,start:document.getElementById("obs").value||new Date().toISOString().slice(0,10),buddy:"",done:{},quiz:{},sign:{},uni:"",key:"",chk:{},gm:null});save();render()}};
const NOHR=()=>`<div class="ux-note">🔒 ${L("No SSN, I-9, W-4, bank or pay info here. Those stay in the payroll/HR system.","Aquí no va SSN, I-9, W-4, banco ni pago. Eso queda en el sistema de nómina/RR. HH.")}</div>`;
function bar(p){return `<div class="ux-prog" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div><b>${p}% ${L("complete","completo")}</b>`}
function row(on,label,act,disabled){return `<button class="ux-row ${on?"ok":""}" ${disabled?"disabled":""} onclick="${act}"><span class="ux-box">${on?"✓":""}</span><span>${label}</span><span class="ux-st">${on?L("Done","Listo"):L("To do","Pendiente")}</span></button>`}
function detail(h,mgr){const id=h.id,p=pct(h);
 return `<div class="card">${h.ex?EXB():""}<h3 style="margin:6px 0">${E(h.name)}</h3><small>${E(roleName(h.role))} · ${E(h.hotel)} · ${L("Start","Inicio")} ${E(h.start)}</small><div style="margin-top:8px">${bar(p)}</div>${h.gm?`<div class="ux-good">✅ ${L("GM sign-off","Firma del GM")}: ${E(h.gm)}</div>`:""}</div>
 <div class="card"><h3>1. ${L("Training","Capacitación")}</h3>${items(h).map(i=>row(h.done[i[0]],L(i[1],i[2]),`uxOb.tog('${id}','${i[0]}')`)).join("")}</div>
 <div class="card"><h3>2. ${L("Quick quizzes","Quizzes rápidos")}</h3>${QUIZ.map(q=>h.quiz[q.k]?row(1,L(q.en,q.es),"",1):`<div class="ux-quiz"><b>${L(q.q[0],q.q[1])}</b>${q.opts.map((o,i)=>`<button class="btn2" onclick="uxOb.quiz('${id}','${q.k}',${i})">${L(o[0],o[1])}</button>`).join("")}</div>`).join("")}</div>
 <div class="card"><h3>3. ${L("Policy sign-offs","Firmas de políticas")}</h3>${POL.map(([k,en,es])=>h.sign[k]?row(1,L(en,es)+` <small>(${E(h.sign[k])})</small>`,"",1):`<div class="ux-quiz"><b>${L(en,es)}</b><small>${L("I read and agree. Type your full name:","Leí y acepto. Escribe tu nombre completo:")}</small><div class="row"><input id="sg-${k}" placeholder="${L("Full name","Nombre completo")}"><button class="btn" style="flex:0 0 auto" onclick="uxOb.sign('${id}','${k}')">${L("Sign","Firmar")}</button></div></div>`).join("")}</div>
 <div class="card"><h3>4. ${L("Uniform & keys","Uniforme y llaves")}</h3>${mgr?`<label>${L("Uniform issued","Uniforme entregado")}<input value="${E(h.uni)}" placeholder="${L("e.g. 2 shirts, size M","ej. 2 camisas, talla M")}" onchange="uxOb.set('${id}','uni',this.value)"></label><label>${L("Key / key card issued","Llave / tarjeta entregada")}<input value="${E(h.key)}" placeholder="${L("e.g. Master key #4","ej. Llave maestra #4")}" onchange="uxOb.set('${id}','key',this.value)"></label><label>${L("Buddy / trainer","Compañero / entrenador")}<select onchange="uxOb.set('${id}','buddy',this.value)"><option value="">${L("Choose…","Elige…")}</option>${(typeof ST==="function"?ST():[]).map(s=>`<option ${s.n===h.buddy?"selected":""}>${E(s.n)}</option>`).join("")}</select></label>`:`${row(!!h.uni,L("Uniform issued","Uniforme entregado")+(h.uni?`: ${E(h.uni)}`:""),"",1)}${row(!!h.key,L("Key issued","Llave entregada")+(h.key?`: ${E(h.key)}`:""),"",1)}<p>👥 ${L("Your buddy","Tu compañero")}: <b>${E(h.buddy||L("Not assigned yet","Sin asignar"))}</b></p>`}</div>
 <div class="card"><h3>5. ${L("Check-ins","Revisiones")}</h3>${[["d1","Day 1","Día 1"],["d7","Day 7","Día 7"],["d30","Day 30","Día 30"]].map(([k,en,es])=>row(h.chk[k],L(en,es)+(h.chk[k]?` <small>${E(h.chk[k])}</small>`:""),`uxOb.chk('${id}','${k}')`,!mgr)).join("")}${mgr?"":`<small>${L("Your manager marks these.","Tu gerente las marca.")}</small>`}</div>
 ${mgr?`<button class="btn ux-primary" ${h.gm?"disabled":""} onclick="uxOb.gm('${id}')">${h.gm?L("Signed off","Firmado"):L("GM sign-off","Firma del GM")+` (${p}%)`}</button>`:""}${NOHR()}`}
V.onb=function(){const mgr=canManage(),me=myHire();
 if(mgr){const corp=authRole()==="Above Property";const all=OB().hires.filter(h=>corp||h.hotel===S.hotel);
  if(S.obSel&&hireById(S.obSel)){const h=hireById(S.obSel);return `<button class="btn2 ux-back2" onclick="uxOb.open('')">‹ ${L("All new hires","Todos los nuevos")}</button>`+detail(h,1)}
  return `<h2>${L("New-hire onboarding","Integración de nuevos")}</h2>
  <div class="card">${all.length?all.map(h=>{const p=pct(h);return `<button class="ux-hire" onclick="uxOb.open('${h.id}')"><span><b>${E(h.name)}</b> ${h.ex?EXB():""}<br><small>${E(roleName(h.role))} · ${E(h.hotel)} · ${E(h.start)}</small><div class="ux-prog"><i style="width:${p}%"></i></div></span><span class="pill ${h.gm?"VC":p>=100?"RFI":"OD"}">${h.gm?L("Signed off","Firmado"):p>=100?L("Ready for GM","Listo p/ GM"):p+"%"}</span></button>`}).join(""):`<div class="ux-empty">🎉 ${L("No one in onboarding right now.","Nadie en integración ahora.")}</div>`}</div>
  <div class="card"><h3>${L("Add a new hire","Agregar nuevo empleado")}</h3><input id="obn" placeholder="${L("Name","Nombre")}"><div class="row"><select id="obr">${OB_ROLES.map(r=>`<option value="${r}">${E(roleName(r))}</option>`).join("")}</select><input id="obs" type="date"></div><button class="btn ux-primary" onclick="uxOb.add()">${L("Add","Agregar")}</button>${NOHR()}</div>`}
 if(me)return `<h2>${L("My onboarding","Mi integración")}</h2>`+detail(me,0);
 return `<h2>${L("My onboarding","Mi integración")}</h2><div class="card ux-empty">🎓 ${L("New here? Start your checklist: training, quick quizzes and policy sign-offs.","¿Eres nuevo? Empieza tu lista: capacitación, quizzes y firmas.")}<button class="btn ux-primary" onclick="uxOb.start()">${L("Start onboarding","Empezar integración")}</button></div>`};
/* ---------- role home ---------- */
const NAV5={Housekeeper:["home","myrooms","check","sched"],"House Person":["home","my","line","sched"],"Laundry Attendant":["home","my","line","sched"],"Breakfast Attendant":["home","my","line","sched"],"Shuttle Driver":["home","my","shut","line"],"Front Desk":["home","greq","rooms","notes"],Maintenance:["home","wo","pm","my"],Housekeeping:["home","myrooms","rooms","insp"],GM:["home","greq","wo","labor"]};
function allowed(){return [...new Set(["home",...navFor(S.role),...tilesFor(S.role),...((typeof canSeeReports==="function"&&canSeeReports())?["health","score"]:[])])].filter(x=>M[x])}
window.uxAllowed=allowed;
function lbl(id){return t(M[id][1])}
function act(ic,en,es,fn,sub,primary){return `<button class="ux-act ${primary?"pri":""}" onclick="${fn}"><span class="ic">${ic}</span><span><b>${L(en,es)}</b>${sub?`<small>${sub}</small>`:""}</span><span class="chev">›</span></button>`}
function hero(){const d=D(),r=S.role,ok=allowed(),a=[],g=x=>ok.includes(x);
 const openWO=d.wo.filter(function(w){return typeof woOpen==="function"?woOpen(w):w.s!="Done"}).length,mine=(typeof myReqs==="function"?myReqs():[]).filter(x=>x.st!="Done").length,gr=(d.greq||d.gr||[]).length;
 if(r==="Housekeeper"){a.push(act("🛏️","My rooms · mark clean","Mis cuartos · marcar limpio","go('myrooms')",L("Your board and projected out time","Tu tablero y hora de salida"),1));a.push(act("🙋","Request help","Pedir ayuda","uxSheet('help')",L("Linens, trash, heavy lifting","Ropa, basura, cargas")));a.push(act("🔧","Report maintenance problem","Reportar problema de mantenimiento","HKReport.open('')",L("Photo required","Foto requerida")));a.push(act("✅","My checklist","Mi lista","go('check')"))}
 else if(["House Person","Laundry Attendant","Breakfast Attendant","Shuttle Driver"].includes(r)){a.push(act("📋","My tasks","Mis tareas","go('my')",mine?L(mine+" open",mine+" abiertas"):L("All caught up","Todo al día"),1));a.push(act(M.line[0],M.line[1],M.line[1],"go('line')",L("Projected out time & station","Hora de salida y estación")));a.push(act("🙋","Request help","Pedir ayuda","uxSheet('help')"));a.push(act("🔧","Report issue + photo","Reportar falla + foto","uxSheet('wo')"))}
 else if(r==="Front Desk"){if(g("greq"))a.push(act("🛎️","Log guest request","Registrar solicitud","go('greq')","",1));a.push(act("🔧","Work order + photo","Orden + foto","uxSheet('wo')"));a.push(act("🛏️","Room status","Estado de cuartos","go('rooms')"));a.push(act("📝","Shift notes","Notas de turno","go('notes')"))}
 else if(r==="Maintenance"){a.push(act("🔧","Open work orders","Órdenes abiertas","go('wo')",openWO+" "+L("open","abiertas"),1));a.push(act("📷","New work order + photo","Nueva orden + foto","uxSheet('wo')"));a.push(act("🗓️","Today's PMs","PMs de hoy","go('pm')"));a.push(act("👤","My tasks","Mis tareas","go('my')"))}
 else if(r==="Housekeeping"){a.push(act("🔍","Inspect rooms","Inspeccionar cuartos","go('insp')",L("Start with rooms waiting for a check","Empieza por los cuartos que esperan revisión"),1));a.push(act("🛏️","My rooms","Mis cuartos","go('myrooms')",L("Your out time and bonus","Tu hora de salida y bono")));a.push(act("⏱️","Team board","Tablero del equipo","go('rooms')"));if(g("rushq"))a.push(act("⚡","Rush rooms","Cuartos urgentes","go('rushq')"));a.push(act("🔧","Work order + photo","Orden + foto","uxSheet('wo')"))}
 else if(r==="GM"||r==="AGM"){if(g("gscores"))a.push(act("📈","Scores vs goals","Calificaciones contra metas","go('gscores')",L("See what is short of the goal","Ve qué está bajo la meta"),1));else if(g("naudit"))a.push(act("🌙","Night audit","Auditoría nocturna","go('naudit')",L("Occupancy, ADR, and RevPAR","Ocupación, ADR y RevPAR"),1));else if(g("labor"))a.push(act("⏱️","Labor","Labor","go('labor')","",1));if(g("onclock"))a.push(act("🕒","On the clock","En turno","go('onclock')"));if(g("lcmd"))a.push(act("📊","Labor win or loss","Labor gana o pierde","go('lcmd')"));if(g("greq"))a.push(act("🛎️","Guest requests","Solicitudes","go('greq')"));a.push(act("🔧","Work orders","Órdenes","go('wo')",openWO+" "+L("open","abiertas")))}
 else if(r==="Above Property"){if(g("gscores"))a.push(act("📈","Scores vs goals","Calificaciones contra metas","go('gscores')",L("Every hotel against its goals","Cada hotel contra sus metas"),1));else if(g("crep"))a.push(act("📈","Reports","Reportes","go('crep')","",1));if(g("naudit"))a.push(act("🌙","Night audit","Auditoría nocturna","go('naudit')"));a.push(act("🔧","Work orders","Órdenes","go('wo')",openWO+" "+L("open","abiertas")))}
 else {if(g("onclock"))a.push(act("🕒","On the clock","En turno","go('onclock')","",1));if(g("lcmd"))a.push(act("📊","Labor win or loss","Labor gana o pierde","go('lcmd')"));if(g("greq"))a.push(act("🛎️","Guest requests","Solicitudes","go('greq')"));a.push(act("🔧","Work orders","Órdenes","go('wo')",openWO+" "+L("open","abiertas")))}
 const hr=new Date().getHours(),u=meUser();
 return `<section class="ux-hero"><div class="ux-hi">${hr<12?L("Good morning","Buenos días"):hr<18?L("Good afternoon","Buenas tardes"):L("Good evening","Buenas noches")}, ${E((u.name||"").split(" ")[0])}</div><button class="ux-search" onclick="uxSheet('search')">🔎 ${L("Search rooms, tasks, screens…","Buscar cuartos, tareas, pantallas…")}</button><div class="ux-acts">${a.slice(0,5).join("")}</div></section><h3 class="ux-sec">${L("Updates","Novedades")}</h3>`}
/* ---------- sheets ---------- */
window.uxClose=()=>{const s=document.getElementById("uxSheet");if(s)s.remove()};
window.uxSheet=function(kind){uxClose();const w=document.createElement("div");w.id="uxSheet";w.className="ux-overlay"+(kind==="more"?" ux-more":"");w.onclick=e=>{if(e.target===w)uxClose()};let h="";
 if(kind==="more"){h=(window.HHQMore&&HHQMore.sheetHtml)?HHQMore.sheetHtml():`<h3>${L("More","Más")}</h3>`}
 else if(kind==="search"){h=`<h3>${L("Search","Buscar")}</h3><input id="uxSq" autofocus placeholder="${L("Room number, task, screen…","Número de cuarto, tarea, pantalla…")}" oninput="uxFind(this.value)"><div id="uxSr" class="ux-res"><div class="ux-empty">${L("Type to search. Try a room number like 214.","Escribe para buscar. Prueba un cuarto como 214.")}</div></div>`}
 else if(kind==="wo"){h=`<h3>${L("Report an issue","Reportar una falla")}</h3><input id="uxWr" inputmode="numeric" placeholder="${L("Room or area","Cuarto o área")}"><textarea id="uxWt" rows="3" placeholder="${L("What's wrong?","¿Qué pasa?")}"></textarea><div class="row"><select id="uxWp"><option value="Med">${L("Normal","Normal")}</option><option value="High">${L("Urgent","Urgente")}</option><option value="Low">${L("Low","Baja")}</option></select><label class="btn2 ux-photo">📷 ${L("Photo","Foto")}<input id="uxWf" type="file" accept="image/*" capture="environment" hidden onchange="uxPhoto(this)"></label></div><img id="uxWi" hidden class="ux-thumb" alt=""><button class="btn ux-primary" onclick="uxWO()">${L("Send to maintenance","Enviar a mantenimiento")}</button>`}
 else if(kind==="help"){const helpOpts=[["houseperson_help","Houseperson help","Ayuda de houseperson"],["Laundry Attendant","Laundry Attendant","Lavandería"],["Maintenance","Maintenance","Mantenimiento"],["Housekeeping","Housekeeping","Ama de llaves"]];h=`<h3>${L("Request help","Pedir ayuda")}</h3><select id="uxHr">${helpOpts.map(r=>`<option value="${r[0]}">${E(L(r[1],r[2]))}</option>`).join("")}</select><input id="uxHt" placeholder="${L("e.g. Towels to 214","ej. Toallas al 214")}"><button class="btn ux-primary" onclick="uxHelp()">${L("Send request","Enviar")}</button><small>${L("Houseperson help alerts the house person and the shuttle driver at this hotel.","Ayuda de houseperson avisa al houseman y al chofer de shuttle de este hotel.")}</small>`}
 w.innerHTML=`<div class="ux-sheet" role="dialog" aria-modal="true"><button class="ux-x" aria-label="${L("Close","Cerrar")}" onclick="uxClose()">✕</button>${h}</div>`;document.body.appendChild(w);const f=w.querySelector("input");if(f&&kind!=="wo")setTimeout(()=>f.focus(),50)};
document.addEventListener("keydown",e=>{if(e.key==="Escape"){uxClose();uxTourEnd&&uxTourEnd()}});
window.uxFilt=q=>{if(window.HHQMore&&HHQMore.filter){HHQMore.filter(q);return}q=q.toLowerCase();document.querySelectorAll(".ux-grid button").forEach(b=>b.hidden=!!q&&!b.dataset.k.includes(q))};
window.uxFind=function(q){q=q.trim().toLowerCase();const box=document.getElementById("uxSr");if(!q){box.innerHTML="";return}const d=D(),out=[];
 allowed().forEach(id=>{const k=(M[id][1]+" "+lbl(id)).toLowerCase();if(k.includes(q))out.push(`<button onclick="uxClose();go('${id}')">${M[id][0]} ${E(lbl(id))}<small>${L("Screen","Pantalla")}</small></button>`)});
 (d.rooms||[]).forEach(r=>{const n=String(r.n||r.r||r.room||r.num||"");if(n&&n.toLowerCase().startsWith(q))out.push(`<button onclick="uxClose();go('${allowed().includes("rooms")?"rooms":allowed().includes("myrooms")?"myrooms":"home"}')">🛏️ ${L("Room","Cuarto")} ${E(n)} <small>${E(stLabel(r.s))}</small></button>`)});
 (d.wo||[]).forEach(w=>{if((w.room+" "+w.t).toLowerCase().includes(q))out.push(`<button onclick="uxClose();go('${allowed().includes("wo")?"wo":"home"}')">🔧 ${E(w.room)}: ${E(String(w.t).slice(0,60))}<small>${E(w.s)}</small></button>`)});
 if(allowed().includes("find"))out.push(`<button onclick="uxClose();go('find')">🔎 ${L("Search full history","Buscar en todo el historial")}</button>`);
 box.innerHTML=out.slice(0,30).join("")||`<div class="ux-empty">${L("Nothing found. Check the spelling or try a room number.","Nada encontrado. Revisa o prueba un número de cuarto.")}</div>`};
let PH="";window.uxPhoto=function(inp){const f=inp.files[0];if(!f)return;const img=new Image(),rd=new FileReader();rd.onload=()=>{img.onload=()=>{const c=document.createElement("canvas"),s=Math.min(1,640/Math.max(img.width,img.height));c.width=img.width*s;c.height=img.height*s;c.getContext("2d").drawImage(img,0,0,c.width,c.height);PH=c.toDataURL("image/jpeg",.7);const t=document.getElementById("uxWi");t.src=PH;t.hidden=false};img.src=rd.result};rd.readAsDataURL(f)};
window.uxWO=function(){const r=document.getElementById("uxWr").value.trim()||"-",v=document.getElementById("uxWt").value.trim();if(!v){document.getElementById("uxWt").placeholder=L("⚠ Describe the issue","⚠ Describe la falla");return}const d=D(),row={id:d.wo.length+1,room:r,t:v+" (reported by "+cw()+")",p:document.getElementById("uxWp").value,s:"Open",photo:PH};if(typeof ftCapture==="function")Object.assign(row,ftCapture(v));d.wo.unshift(row);PH="";save();uxClose();render();showToast(L("✓ Work order sent","✓ Orden enviada"))};
window.uxHelp=function(){const role=document.getElementById("uxHr").value,t2=document.getElementById("uxHt").value.trim();if(!t2){document.getElementById("uxHt").placeholder=L("⚠ What do you need?","⚠ ¿Qué necesitas?");return}if(typeof postStaffReq==="function"){postStaffReq(role,t2);uxClose();render();showToast(L("✓ Request sent","✓ Solicitud enviada"));return}const d=D(),pool=onS(role),w=pool.length?pool[0].n:"Unassigned";d.reqs=d.reqs||[];d.reqs.unshift({role,text:t2,by:cw()+" ("+S.role+")",who:w,st:"Open",day:ld()});save();uxClose();render();showToast(L("✓ Request sent","✓ Solicitud enviada"))};
/* ---------- status labels ---------- */
const STL={VC:["Vacant clean","Vacío limpio"],VD:["Vacant dirty","Vacío sucio"],OC:["Occupied clean","Ocupado limpio"],OD:["Occupied dirty","Ocupado sucio"],OOO:["Out of order","Fuera de servicio"],RFI:["Ready for inspection","Listo p/ inspección"]};
function stLabel(s){return STL[s]?s+" · "+L(STL[s][0],STL[s][1]):(s||"")}
function labelPills(root){root.querySelectorAll(".pill").forEach(p=>{const s=p.textContent.trim();if(STL[s]&&!p.dataset.ux){p.dataset.ux=1;p.title=L(STL[s][0],STL[s][1]);p.insertAdjacentHTML("beforeend",`<span class="ux-pl"> ${L(STL[s][0],STL[s][1])}</span>`)}})}
/* ---------- guided tour ---------- */
const TK=()=>"hhq_tour_"+(S.uid||"");
function steps(){const s=[["#uxHero",L("Your top tasks are right here. Tap one to start.","Tus tareas principales están aquí. Toca una para empezar.")],[".ux-search",L("Search anything: rooms, work orders, screens.","Busca lo que sea: cuartos, órdenes, pantallas.")],["#nav",L("Your main screens. 'More' has everything else.","Tus pantallas principales. 'Más' tiene todo lo demás.")],["#uxHelpBtn",L("Tap ? anytime to replay this tour.","Toca ? cuando quieras para repetir este recorrido.")]];
 if(S.role==="Housekeeper")s.splice(1,0,["#uxHero .ux-act",L("Open My rooms to mark rooms clean and see your out time. Leave on time with all rooms done to earn bonus points.","Abre Mis cuartos para marcar limpio y ver tu hora de salida. Sal a tiempo con todo listo y gana puntos.")]);
 if(leader())s.splice(3,0,["#uxMoreBtn",L("Labor plan, onboarding and reports are under More.","Plan laboral, integración y reportes están en Más.")]);return s}
let TI=-1;window.uxTourEnd=function(){TI=-1;const o=document.getElementById("uxTour");if(o)o.remove();try{localStorage.setItem(TK(),"1")}catch(e){}};
window.uxTour=function(force){if(force){if(S.tab!=="home"){S.tab="home";render()}TI=0}else if(TI<0)return;const st=steps();if(TI>=st.length){uxTourEnd();const me=myHire();if(me&&!me.done.tour){me.done.tour=1;save()}return}
 let o=document.getElementById("uxTour");if(!o){o=document.createElement("div");o.id="uxTour";document.body.appendChild(o)}const [sel,txt]=st[TI],el=document.querySelector(sel);if(el&&sel!=="#nav"&&sel!=="#uxHelpBtn")el.scrollIntoView({block:"center"});const r=el?el.getBoundingClientRect():{top:120,left:20,width:350,height:60,bottom:180};
 const below=r.top<window.innerHeight/2;o.innerHTML=`<div class="ux-hole" style="top:${r.top-6}px;left:${r.left-6}px;width:${r.width+12}px;height:${r.height+12}px"></div><div class="ux-tip" style="${below?"top:"+Math.min(r.bottom+14,window.innerHeight-220)+"px":"bottom:"+(window.innerHeight-r.top+14)+"px"}"><small>${TI+1} / ${st.length}</small><p>${txt}</p><div class="row"><button class="btn2" onclick="uxTourEnd()">${L("Skip","Saltar")}</button>${TI?`<button class="btn2" onclick="TI_(-1)">${L("Back","Atrás")}</button>`:""}<button class="btn" onclick="TI_(1)">${TI===st.length-1?L("Done","Listo"):L("Next","Siguiente")}</button></div></div>`};
window.TI_=d=>{TI+=d;uxTour()};
/* ---------- render wrap ---------- */
const base=render;
render=function(){base.apply(this,arguments);if(!meUser()||meUser().pin_reset_required)return;const app=document.getElementById("app"),nav=document.getElementById("nav");
 if(S.tab!=="onb")S.obSel=S.obSel||"";
 const ok=allowed(),main=(NAV5[S.role]||navFor(S.role)).filter(x=>ok.includes(x)).slice(0,4);
 const inMain=main.includes(S.tab);
 const desk=typeof rMode==="function"?rMode()==="desk":innerWidth>=1024;
 if(!desk)nav.innerHTML=main.map(id=>`<button class="${S.tab==id?"on":""}" onclick="go('${id}')" ${S.tab==id?'aria-current="page"':""}><span>${M[id][0]}</span>${E(lbl(id))}</button>`).join("")+`<button id="uxMoreBtn" class="${inMain?"":"on"}" onclick="uxSheet('more')"><span>☰</span>${L("More","Más")}</button>`;
 if(typeof paintReqBadges==="function")paintReqBadges();
 if(S.tab==="home"){app.insertAdjacentHTML("afterbegin",hero().replace('<section class="ux-hero"','<section class="ux-hero" id="uxHero"'))}
 else if(app.querySelector(".pgbar")){const pb=app.querySelector(".pgbar");pb.classList.add("ux-sticky");if(!pb.querySelector(".ux-srch"))pb.insertAdjacentHTML("beforeend",`<button class="ux-bk ux-srch" onclick="uxSheet('search')" aria-label="${L("Search","Buscar")}">🔎</button>`)}
 else app.insertAdjacentHTML("afterbegin",`<div class="ux-top"><button class="ux-bk" onclick="go('home')" aria-label="${L("Back to Home","Volver al inicio")}">‹ ${L("Home","Inicio")}</button><b>${M[S.tab]?M[S.tab][0]+" "+E(lbl(S.tab)):""}</b><button class="ux-bk" onclick="uxSheet('search')" aria-label="${L("Search","Buscar")}">🔎</button></div>`);
 labelPills(app);
 app.querySelectorAll(".card").forEach(c=>{if(!c.textContent.trim()&&!c.querySelector("img,canvas,input"))c.innerHTML=`<div class="ux-empty">✨ ${L("Nothing here yet.","Nada aquí todavía.")}</div>`});
 if(!document.getElementById("uxHelpBtn")){const b=document.createElement("button");b.id="uxHelpBtn";b.textContent="?";b.setAttribute("aria-label","Help");b.onclick=()=>uxTour(1);document.body.appendChild(b)}
 document.getElementById("uxHelpBtn").setAttribute("aria-label",L("Help & tour","Ayuda y recorrido"));
 let seen="1";try{seen=localStorage.getItem(TK())}catch(e){}
 if(!seen&&S.tab==="home"&&TI<0&&!document.querySelector(".wl-ov,#welcome,.welcome")){setTimeout(()=>{if(TI<0&&!localStorage.getItem(TK()))uxTour(1)},700)}
};
const css=document.createElement("style");css.textContent=`
#app button,#app select,#app input:not([type=checkbox]):not([type=radio]),#app textarea,#app a.btn{min-height:44px}
nav button{min-height:60px;font-size:12px}
.ux-hero{background:transparent;color:inherit;border-radius:12px;padding:0;margin:4px 0 8px}
.ux-hi{font-size:22px;font-weight:700;letter-spacing:-.02em;margin-bottom:8px}
.ux-search{width:100%;text-align:left;background:#fff;color:#5c6570;border:1px solid #e6e8ee;border-radius:12px;font-size:16px;padding:12px;margin-bottom:10px;min-height:48px}
.ux-acts{display:grid;gap:8px}
.ux-act{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#fff;color:#1c1f26;border:1px solid #e6e8ee;border-radius:12px;padding:10px 12px;min-height:56px;font-size:16px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
.ux-act.pri{background:#3b5bdb;color:#fff;border-color:#3b5bdb}
.ux-act .ic{font-size:24px}.ux-act span:nth-child(2){flex:1}.ux-act small{display:block;font-weight:400;opacity:.85;font-size:13px}.ux-act .chev{font-size:24px;opacity:.7}
.ux-sec{margin:8px 2px;color:#55606f;font-size:14px;text-transform:uppercase;letter-spacing:.5px}
.ux-top{position:sticky;top:64px;z-index:4;display:flex;align-items:center;gap:8px;background:#f3f5f9;padding:6px 0;margin-bottom:6px}
.pgbar.ux-sticky{position:sticky;top:64px;z-index:4;background:#f3f5f9;display:flex;align-items:center;gap:8px}.pgbar.ux-sticky h2{flex:1;margin:0}.ux-srch{margin-left:auto}
.ux-sheet label,.card label{display:block;margin:6px 0}.card label input,.card label select{display:block;width:100%;box-sizing:border-box}
.ux-top b{flex:1;font-size:17px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.ux-bk{background:#e6ebf2;border:0;border-radius:10px;min-height:44px;min-width:44px;font-size:16px;font-weight:600;padding:0 12px}
.ux-overlay{position:fixed;inset:0;background:#0008;z-index:100;display:flex;align-items:flex-end}
.ux-sheet{background:#fff;width:100%;max-height:85vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px;box-sizing:border-box;position:relative}
.ux-sheet input,.ux-sheet select,.ux-sheet textarea{width:100%;box-sizing:border-box;min-height:48px;font-size:16px;margin:6px 0}
.ux-x{position:absolute;right:10px;top:10px;width:44px;height:44px;border:0;background:#eef1f5;border-radius:50%;font-size:18px}
.ux-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ux-grid button{min-height:76px;border:0;background:#eef2f7;border-radius:12px;font-size:12px;padding:6px}.ux-grid button span{display:block;font-size:24px}
.ux-res button{display:block;width:100%;text-align:left;min-height:48px;border:0;border-bottom:1px solid #eee;background:none;font-size:15px}.ux-res small{display:block;color:#777}
.ux-primary{width:100%;min-height:52px!important;font-size:17px;border-radius:12px;margin-top:8px}
.ux-photo{display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:8px;cursor:pointer}
.ux-thumb{max-width:100%;border-radius:10px;margin-top:6px}
.ux-empty{text-align:center;color:#55606f;padding:18px 8px;font-size:15px}
.ux-pl{font-weight:500}
.ux-note{background:#eef4ff;border-radius:10px;padding:10px;margin-top:10px;font-size:13px}
.ux-prog{height:10px;background:#e3e8f0;border-radius:6px;overflow:hidden;margin:6px 0}.ux-prog i{display:block;height:100%;background:#2e9d5b}
.ux-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #eef0f3;min-height:52px;font-size:15px;color:inherit}
.ux-row:disabled{opacity:1}.ux-box{width:26px;height:26px;border:2px solid #9aa5b4;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;flex:none;font-weight:800}
.ux-row.ok .ux-box{background:#2e9d5b;border-color:#2e9d5b;color:#fff}.ux-row span:nth-child(2){flex:1}.ux-st{font-size:12px;color:#55606f}.ux-row.ok .ux-st{color:#2e7d4f;font-weight:700}
.ux-quiz{padding:8px 0;border-bottom:1px solid #eef0f3}.ux-quiz b,.ux-quiz small{display:block;margin-bottom:6px}.ux-quiz>.btn2{display:block;width:100%;margin:4px 0;text-align:left}
.ux-good{color:#2e7d4f;font-weight:700;margin-top:6px}
.ux-hire{display:flex;gap:10px;align-items:center;width:100%;text-align:left;border:0;border-bottom:1px solid #eef0f3;background:none;padding:8px 0;min-height:64px}.ux-hire>span:first-child{flex:1}
.ux-back2{margin-bottom:8px}
#uxHelpBtn{position:fixed;right:12px;bottom:96px;width:48px;height:48px;border-radius:50%;border:0;background:#3b5bdb;color:#fff;font-size:22px;font-weight:800;z-index:6;box-shadow:0 8px 20px rgba(16,24,40,.18)}
#uxTour{position:fixed;inset:0;z-index:200}
.ux-hole{position:fixed;border-radius:14px;box-shadow:0 0 0 9999px #000a;border:3px solid #f9c74f;pointer-events:none}
.ux-tip{position:fixed;left:12px;right:12px;background:#fff;border-radius:14px;padding:14px;font-size:16px}.ux-tip p{margin:6px 0 10px}
@media(min-width:1024px){
.ux-overlay{align-items:center;justify-content:center;padding:24px}
.ux-sheet{width:min(640px,100%);max-height:min(80vh,760px);border-radius:16px;box-shadow:0 24px 70px #0006}
.ux-sheet .row{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px}
.ux-tip{left:50%;right:auto;width:min(480px,calc(100vw - 48px));transform:translateX(-50%)}
#uxHelpBtn{bottom:24px;right:24px}
}
`;document.head.appendChild(css);
render();
})();
