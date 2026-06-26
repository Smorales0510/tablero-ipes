/* ============ IPES Tablero ============ */
const D = window.IPES_DATA;
const C = D.countries;
const PM = D.pillarMeta;                 // 13 pillars {key,label,dim,sub}
const PKEYS = PM.map(p=>p.key);
const DIMS = [...new Set(PM.map(p=>p.dim))];
const REGIONS = [...new Set(C.map(c=>c.region))];
const ECO_P = PM.filter(p=>p.sub==="Económico").map(p=>p.key);
const SOC_P = PM.filter(p=>p.sub==="Social").map(p=>p.key);

const regionColor = d3.scaleOrdinal()
  .domain(["Europa","Norteamérica","Asia-Pacífico y Medio Oriente","América Latina y el Caribe"])
  .range(["#2563eb","#0891b2","#7c3aed","#ea580c"]);
const colorScore = d3.scaleLinear()
  .domain([25,40,52,64,78,92]).range(["#b91c1c","#ef4444","#f59e0b","#eab308","#22c55e","#15803d"]).clamp(true);

const byIso = iso => C.find(c=>c.iso===iso);
const fmt = v => v==null? "—" : (Math.round(v*10)/10).toFixed(1);
const mean = a => a.length? a.reduce((s,x)=>s+x,0)/a.length : 0;
const $ = (s,r=document)=>r.querySelector(s);

/* metrics available (IPES, subíndices, pillars) */
const METRICS = [
  {k:"ipes",l:"IPES (general)"},
  {k:"eco",l:"Subíndice Económico"},
  {k:"soc",l:"Subíndice Social"},
  ...PM.map(p=>({k:p.key,l:p.key+" · "+p.label}))
];
const mval = (c,k)=> (k==="ipes"||k==="eco"||k==="soc") ? c[k] : c.p[k];
const mlabel = k => (METRICS.find(m=>m.k===k)||{}).l || k;

/* ---------- state via URL hash ---------- */
const state = {tab:"resumen", country:"COL", metric:"ipes"};
function readHash(){
  const h=new URLSearchParams(location.hash.slice(1));
  if(h.get("tab")) state.tab=h.get("tab");
  if(h.get("country")) state.country=h.get("country");
  if(h.get("metric")) state.metric=h.get("metric");
}
function writeHash(){
  const p=new URLSearchParams();
  p.set("tab",state.tab); p.set("country",state.country); p.set("metric",state.metric);
  history.replaceState(null,"","#"+p.toString());
}
function go(tab){ state.tab=tab; writeHash(); render(); }
function selectCountry(iso,{open=false}={}){ state.country=iso; if(open) state.tab="ficha"; writeHash(); render(); }

/* ---------- tabs ---------- */
const TABS=[
  ["resumen","Resumen"],["ranking","Ranking"],["mapa","Mapa"],["comparar","Comparar"],
  ["dispersion","Dispersión"],["dimensiones","Dimensiones"],["graficas","Gráficas"],
  ["indicadores","Indicadores"],["ficha","Ficha"],["metodologia","Metodología"]
];
function buildTabs(){
  const nav=$("#tabnav"); nav.innerHTML="";
  TABS.forEach(([k,l])=>{
    const b=document.createElement("button");
    b.textContent=l; b.className=(state.tab===k?"active":"");
    b.onclick=()=>go(k); nav.appendChild(b);
  });
}

/* ---------- chart registry ---------- */
const charts={};
function chart(id,cfg){ if(charts[id]){charts[id].destroy();} charts[id]=new Chart($("#"+id),cfg); return charts[id]; }
function destroyAll(){ Object.values(charts).forEach(c=>c.destroy()); for(const k in charts) delete charts[k]; }
const cssVar = n => getComputedStyle(document.body).getPropertyValue(n).trim();
const tickColor = ()=> cssVar('--muted');
const lineColor = ()=> cssVar('--line');

/* ===================================================== RENDER ROUTER */
function render(){
  buildTabs(); destroyAll();
  const app=$("#app");
  ({resumen:vResumen,ranking:vRanking,mapa:vMapa,comparar:vComparar,dispersion:vDispersion,
    dimensiones:vDimensiones,graficas:vGraficas,indicadores:vIndicadores,ficha:vFicha,
    metodologia:vMetodologia}[state.tab]||vResumen)(app);
  window.scrollTo({top:0});
}

/* ===================================================== RESUMEN */
function vResumen(app){
  const sorted=[...C].sort((a,b)=>b.ipes-a.ipes);
  const top=sorted[0];
  const ecoAvg=mean(C.map(c=>c.eco)), socAvg=mean(C.map(c=>c.soc)), ipesAvg=mean(C.map(c=>c.ipes));
  const la=sorted.find(c=>c.region==="América Latina y el Caribe");
  const col=byIso("COL");
  app.innerHTML=`
  <div class="panel">
    <h2>Resumen ejecutivo</h2>
    <p class="sub">Edición de referencia · 53 países · puntajes 0–100 (10... mayor = mejor desempeño).</p>
    <div class="grid kpis" style="margin-top:14px">
      <div class="kpi"><div class="v">${C.length}</div><div class="l">Países evaluados</div></div>
      <div class="kpi"><div class="v">${fmt(ipesAvg)}</div><div class="l">IPES promedio</div></div>
      <div class="kpi"><div class="v">${top.name}</div><div class="l">Líder global · IPES ${fmt(top.ipes)}</div></div>
      <div class="kpi"><div class="v">${fmt(ecoAvg-socAvg)}</div><div class="l">Brecha Económico–Social (prom.)</div><div class="x" style="color:var(--muted)">Eco ${fmt(ecoAvg)} · Soc ${fmt(socAvg)}</div></div>
      <div class="kpi"><div class="v">${la.name}</div><div class="l">Líder América Latina · ${fmt(la.ipes)}</div></div>
      <div class="kpi"><div class="v">#${col.rank}</div><div class="l">Posición de Colombia · IPES ${fmt(col.ipes)}</div></div>
    </div>
  </div>
  <div class="panel">
    <h3>Mejores 5 (IPES)</h3>
    <div class="grid cards" id="topcards"></div>
  </div>
  <div class="panel">
    <h3>IPES promedio por región</h3>
    <div class="chartbox" style="height:300px"><canvas id="cRegion"></canvas></div>
  </div>
  <div class="panel">
    <h3>Panorama por región</h3>
    <table><thead><tr><th class="l">Región</th><th>Países</th><th>IPES</th><th>Económico</th><th>Social</th></tr></thead>
    <tbody id="regbody"></tbody></table>
    <p class="sub" style="margin-top:8px">Clic en una tarjeta o fila de cualquier vista para abrir la <b>Ficha</b> del país.</p>
  </div>`;
  // top cards
  const tc=$("#topcards");
  sorted.slice(0,5).forEach((c,i)=>{
    const d=document.createElement("div"); d.className="card"; d.onclick=()=>selectCountry(c.iso,{open:true});
    d.innerHTML=`<div class="rk">${i+1}</div><div class="cn">${c.name}</div>
      <div class="ci flagiso">${c.iso} · ${c.region.split(" ")[0]}</div>
      <div class="cs" style="color:${colorScore(c.ipes)}">${fmt(c.ipes)}</div>
      <div class="bars"><span>Eco ${fmt(c.eco)}</span><span>Soc ${fmt(c.soc)}</span></div>`;
    tc.appendChild(d);
  });
  // region table
  const rb=$("#regbody");
  REGIONS.map(r=>{const g=C.filter(c=>c.region===r);return {r,n:g.length,ipes:mean(g.map(c=>c.ipes)),eco:mean(g.map(c=>c.eco)),soc:mean(g.map(c=>c.soc))};})
    .sort((a,b)=>b.ipes-a.ipes).forEach(o=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td class="l"><span class="dot" style="background:${regionColor(o.r)}"></span> ${o.r}</td><td>${o.n}</td>
        <td><span class="scorecell" style="background:${colorScore(o.ipes)}">${fmt(o.ipes)}</span></td><td>${fmt(o.eco)}</td><td>${fmt(o.soc)}</td>`;
      rb.appendChild(tr);
    });
  // region chart
  const rstats=REGIONS.map(r=>({r,v:mean(C.filter(c=>c.region===r).map(c=>c.ipes))})).sort((a,b)=>b.v-a.v);
  chart("cRegion",{type:"bar",data:{labels:rstats.map(o=>o.r),datasets:[{data:rstats.map(o=>o.v),
    backgroundColor:rstats.map(o=>regionColor(o.r))}]},
    options:barOpts({horizontal:true,max:100})});
}

/* ===================================================== RANKING */
let rkSort={key:"ipes",dir:-1};
function vRanking(app){
  app.innerHTML=`
  <div class="panel">
    <h2>Ranking · 53 países</h2>
    <div class="controls">
      <label class="fld">Buscar<input type="search" id="rkq" placeholder="país o ISO…"></label>
      <label class="fld">Región<select id="rkreg"><option value="">Todas</option>${REGIONS.map(r=>`<option>${r}</option>`).join("")}</select></label>
      <span class="sub" style="margin-bottom:8px">Clic en un encabezado para ordenar · clic en una fila para ver la Ficha.</span>
    </div>
    <div class="tablescroll"><table id="rktab"></table></div>
    <div class="legendrow" id="rklegend"></div>
  </div>`;
  $("#rkq").oninput=drawRk; $("#rkreg").onchange=drawRk; drawRk();
  // legend
  const lg=$("#rklegend");
  lg.innerHTML="Escala: "+[30,45,60,75,90].map(v=>`<span><span class="dot" style="background:${colorScore(v)}"></span>${v}</span>`).join("");
}
function drawRk(){
  const q=($("#rkq").value||"").toLowerCase(), reg=$("#rkreg").value;
  let rows=C.filter(c=>(!reg||c.region===reg)&&(c.name.toLowerCase().includes(q)||c.iso.toLowerCase().includes(q)));
  const k=rkSort.key, dir=rkSort.dir;
  rows.sort((a,b)=>{const va=k==="name"?a.name:(k==="region"?a.region:mval(a,k)); const vb=k==="name"?b.name:(k==="region"?b.region:mval(b,k));
    return (va>vb?1:va<vb?-1:0)*dir;});
  const head=`<thead><tr><th>#</th><th class="l" data-k="name">País</th><th class="l" data-k="region">Región</th>
    ${PM.map(p=>`<th data-k="${p.key}" title="${p.label}">${p.key}</th>`).join("")}
    <th data-k="eco">Eco</th><th data-k="soc">Soc</th><th data-k="ipes">IPES</th></tr></thead>`;
  const body="<tbody>"+rows.map(c=>`<tr class="${c.iso===state.country?'sel':''}" data-iso="${c.iso}">
    <td class="muted">${c.rank}</td><td class="l"><b>${c.name}</b> <span class="flagiso">${c.iso}</span></td>
    <td class="l"><span class="dot" style="background:${regionColor(c.region)}"></span>${c.region.split(" ")[0]}</td>
    ${PM.map(p=>`<td><span class="scorecell" style="background:${colorScore(c.p[p.key])}">${fmt(c.p[p.key])}</span></td>`).join("")}
    <td>${fmt(c.eco)}</td><td>${fmt(c.soc)}</td>
    <td><span class="scorecell" style="background:${colorScore(c.ipes)}">${fmt(c.ipes)}</span></td></tr>`).join("")+"</tbody>";
  const t=$("#rktab"); t.innerHTML=head+body;
  t.querySelectorAll("thead th[data-k]").forEach(th=>th.onclick=()=>{const kk=th.dataset.k;
    if(rkSort.key===kk)rkSort.dir*=-1; else rkSort={key:kk,dir:(kk==="name"||kk==="region")?1:-1}; drawRk();});
  t.querySelectorAll("tbody tr").forEach(tr=>tr.onclick=()=>selectCountry(tr.dataset.iso,{open:true}));
}

/* ===================================================== MAPA */
function vMapa(app){
  app.innerHTML=`
  <div class="panel">
    <h2>Mapa mundial</h2>
    <div class="controls">
      <label class="fld">Indicador<select id="mapMetric">${METRICS.map(m=>`<option value="${m.k}" ${m.k===state.metric?'selected':''}>${m.l}</option>`).join("")}</select></label>
      <span class="sub" style="margin-bottom:8px">Los 53 países del IPES aparecen coloreados; los demás en gris. Clic en un país para abrir su Ficha.</span>
    </div>
    <div class="mapwrap" id="mapwrap"><div class="muted" style="padding:40px;text-align:center">Cargando mapa…</div></div>
    <div class="legendrow" id="maplegend"></div>
  </div>`;
  $("#mapMetric").onchange=e=>{state.metric=e.target.value; writeHash(); paintMap();};
  loadWorld().then(paintMap).catch(()=>{$("#mapwrap").innerHTML='<div class="note">No se pudo cargar la geometría del mapa (requiere conexión a internet). Las demás vistas funcionan sin conexión.</div>';});
}
let WORLD=null;
function loadWorld(){
  if(WORLD) return Promise.resolve();
  return d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(topo=>{
    WORLD=topojson.feature(topo,topo.objects.countries).features;
  });
}
function paintMap(){
  if(!WORLD) return;
  const k=state.metric;
  const num2iso={}; Object.entries(D.isoNum).forEach(([iso,n])=>{ if(n) num2iso[String(+n)]=iso; });
  const w=960,h=500;
  const proj=d3.geoNaturalEarth1().fitSize([w,h],{type:"Sphere"});
  const path=d3.geoPath(proj);
  const svg=d3.create("svg").attr("viewBox",`0 0 ${w} ${h}`).attr("preserveAspectRatio","xMidYMid meet");
  const noData=cssVar('--line'), sphere=cssVar('--panel2');
  svg.append("path").attr("d",path({type:"Sphere"})).attr("fill",sphere);
  const tip=$("#tip");
  svg.selectAll("path.country").data(WORLD).join("path").attr("class","country").attr("d",path)
    .attr("fill",f=>{const iso=num2iso[String(+f.id)]; const c=iso&&byIso(iso); return c?colorScore(mval(c,k)):noData;})
    .on("mousemove",(e,f)=>{const iso=num2iso[String(+f.id)]; const c=iso&&byIso(iso);
       if(!c){tip.style.opacity=0;return;} tip.style.opacity=1; tip.style.left=(e.clientX+14)+"px"; tip.style.top=(e.clientY+14)+"px";
       tip.innerHTML=`<b>${c.name}</b> · ${mlabel(k)}: ${fmt(mval(c,k))}`;})
    .on("mouseleave",()=>tip.style.opacity=0)
    .on("click",(e,f)=>{const iso=num2iso[String(+f.id)]; if(iso&&byIso(iso)) selectCountry(iso,{open:true});});
  const wrap=$("#mapwrap"); wrap.innerHTML=""; wrap.appendChild(svg.node());
  $("#maplegend").innerHTML="Escala "+mlabel(k)+": "+[20,40,60,80,100].map(v=>`<span><span class="dot" style="background:${colorScore(v)}"></span>${v}</span>`).join("")+` <span><span class="dot" style="background:var(--line)"></span>sin dato</span>`;
}

/* ===================================================== COMPARAR */
let cmpSel=null;
function vComparar(app){
  if(!cmpSel){ const t=[...C].sort((a,b)=>b.ipes-a.ipes); cmpSel=[t[0].iso,"CHL","BRA",state.country].filter((v,i,a)=>a.indexOf(v)===i).slice(0,5); }
  app.innerHTML=`
  <div class="panel">
    <h2>Comparar países</h2>
    <p class="sub">Elige hasta 5 países para comparar su perfil en los 13 pilares.</p>
    <div class="pickwrap" id="cmpPick"></div>
    <div class="chartbox tall"><canvas id="cmpRadar"></canvas></div>
  </div>
  <div class="panel">
    <h3>Tabla comparativa (puntaje 0–100)</h3>
    <div class="tablescroll"><table id="cmpTab"></table></div>
  </div>`;
  const pw=$("#cmpPick");
  [...C].sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{
    const b=document.createElement("button"); b.className="pick"+(cmpSel.includes(c.iso)?" on":""); b.textContent=c.name;
    b.onclick=()=>{ if(cmpSel.includes(c.iso))cmpSel=cmpSel.filter(x=>x!==c.iso); else if(cmpSel.length<5)cmpSel.push(c.iso); vComparar(app); };
    pw.appendChild(b);
  });
  const pal=["#2563eb","#ea580c","#16a34a","#7c3aed","#dc2626"];
  const ds=cmpSel.map((iso,i)=>{const c=byIso(iso);return{label:c.name,data:PKEYS.map(k=>c.p[k]),
    borderColor:pal[i],backgroundColor:pal[i]+"22",pointBackgroundColor:pal[i],borderWidth:2};});
  chart("cmpRadar",{type:"radar",data:{labels:PM.map(p=>p.key),datasets:ds},options:radarOpts()});
  // table
  const t=$("#cmpTab");
  t.innerHTML=`<thead><tr><th class="l">Pilar</th>${cmpSel.map(iso=>`<th>${byIso(iso).iso}</th>`).join("")}</tr></thead>
  <tbody>${PM.map(p=>`<tr><td class="l">${p.key} · ${p.label}</td>${cmpSel.map(iso=>{const v=byIso(iso).p[p.key];return `<td><span class="scorecell" style="background:${colorScore(v)}">${fmt(v)}</span></td>`;}).join("")}</tr>`).join("")}
  <tr><td class="l"><b>Subíndice Económico</b></td>${cmpSel.map(iso=>`<td><b>${fmt(byIso(iso).eco)}</b></td>`).join("")}</tr>
  <tr><td class="l"><b>Subíndice Social</b></td>${cmpSel.map(iso=>`<td><b>${fmt(byIso(iso).soc)}</b></td>`).join("")}</tr>
  <tr><td class="l"><b>IPES</b></td>${cmpSel.map(iso=>`<td><span class="scorecell" style="background:${colorScore(byIso(iso).ipes)}">${fmt(byIso(iso).ipes)}</span></td>`).join("")}</tr></tbody>`;
}

/* ===================================================== DISPERSION */
function vDispersion(app){
  app.innerHTML=`
  <div class="panel">
    <h2>Relación entre dos dimensiones</h2>
    <div class="controls">
      <label class="fld">Eje X<select id="dx">${METRICS.map(m=>`<option value="${m.k}">${m.l}</option>`).join("")}</select></label>
      <label class="fld">Eje Y<select id="dy">${METRICS.map(m=>`<option value="${m.k}">${m.l}</option>`).join("")}</select></label>
      <span class="sub" id="dcorr" style="margin-bottom:8px"></span>
    </div>
    <div class="chartbox tall"><canvas id="cScatter"></canvas></div>
    <div class="legendrow">${REGIONS.map(r=>`<span><span class="dot" style="background:${regionColor(r)}"></span>${r}</span>`).join("")}</div>
    <p class="sub">Cada punto es un país. El país seleccionado (${byIso(state.country).name}) se resalta. La línea punteada es la tendencia lineal.</p>
  </div>`;
  $("#dx").value="eco"; $("#dy").value="soc";
  $("#dx").onchange=drawScatter; $("#dy").onchange=drawScatter; drawScatter();
}
function drawScatter(){
  const kx=$("#dx").value, ky=$("#dy").value;
  const pts=C.map(c=>({x:mval(c,kx),y:mval(c,ky),c}));
  const ds=REGIONS.map(r=>({label:r,data:pts.filter(p=>p.c.region===r).map(p=>({x:p.x,y:p.y,iso:p.c.iso,name:p.c.name})),
    backgroundColor:regionColor(r),pointRadius:p=>p.raw&&p.raw.iso===state.country?9:5,
    pointHoverRadius:8,borderColor:p=>p.raw&&p.raw.iso===state.country?"#0f1f3d":"transparent",
    pointBorderWidth:p=>p.raw&&p.raw.iso===state.country?2:0}));
  // regression
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),n=xs.length;
  const mx=mean(xs),my=mean(ys);
  const b=xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0)/xs.reduce((s,x)=>s+(x-mx)**2,0);
  const a=my-b*mx;
  const r=xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0)/Math.sqrt(xs.reduce((s,x)=>s+(x-mx)**2,0)*ys.reduce((s,y)=>s+(y-my)**2,0));
  const xmin=Math.min(...xs),xmax=Math.max(...xs);
  ds.push({type:"line",label:"Tendencia",data:[{x:xmin,y:a+b*xmin},{x:xmax,y:a+b*xmax}],
    borderColor:tickColor(),borderDash:[6,6],borderWidth:1.5,pointRadius:0,fill:false});
  $("#dcorr").innerHTML=`Correlación r = <b>${r.toFixed(2)}</b>`;
  chart("cScatter",{type:"scatter",data:{datasets:ds},options:{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.raw.name?`${c.raw.name}: (${fmt(c.raw.x)}, ${fmt(c.raw.y)})`:""}},
      datalabels:false},
    scales:{x:{title:{display:true,text:mlabel(kx),color:tickColor()},ticks:{color:tickColor()},grid:{color:lineColor()}},
            y:{title:{display:true,text:mlabel(ky),color:tickColor()},ticks:{color:tickColor()},grid:{color:lineColor()}}}}});
}

/* ===================================================== DIMENSIONES (regiones) */
function vDimensiones(app){
  app.innerHTML=`
  <div class="panel">
    <h2>Perfil por región</h2>
    <p class="sub">Promedio de cada pilar por grupo de países.</p>
    <div class="chartbox tall"><canvas id="cRegRadar"></canvas></div>
  </div>
  <div class="panel">
    <h3>Promedios por dimensión y región</h3>
    <div class="tablescroll"><table id="dimTab"></table></div>
  </div>`;
  const pal={"Europa":"#2563eb","Norteamérica":"#0891b2","Asia-Pacífico y Medio Oriente":"#7c3aed","América Latina y el Caribe":"#ea580c"};
  const ds=REGIONS.map(r=>{const g=C.filter(c=>c.region===r);
    return{label:r,data:PKEYS.map(k=>mean(g.map(c=>c.p[k]))),borderColor:pal[r],backgroundColor:pal[r]+"18",borderWidth:2,pointRadius:2};});
  chart("cRegRadar",{type:"radar",data:{labels:PM.map(p=>p.key),datasets:ds},options:radarOpts()});
  // dimension table
  const dimAvg=(g,dim)=>{const ks=PM.filter(p=>p.dim===dim).map(p=>p.key); return mean(g.flatMap(c=>ks.map(k=>c.p[k])));};
  const t=$("#dimTab");
  t.innerHTML=`<thead><tr><th class="l">Dimensión</th>${REGIONS.map(r=>`<th>${r.split(" ")[0]}</th>`).join("")}</tr></thead>
  <tbody>${DIMS.map(dim=>`<tr><td class="l">${dim}</td>${REGIONS.map(r=>{const v=dimAvg(C.filter(c=>c.region===r),dim);return `<td><span class="scorecell" style="background:${colorScore(v)}">${fmt(v)}</span></td>`;}).join("")}</tr>`).join("")}
  <tr><td class="l"><b>IPES</b></td>${REGIONS.map(r=>{const v=mean(C.filter(c=>c.region===r).map(c=>c.ipes));return `<td><b>${fmt(v)}</b></td>`;}).join("")}</tr></tbody>`;
}

/* ===================================================== GRAFICAS (builder) */
function vGraficas(app){
  app.innerHTML=`
  <div class="panel">
    <h2>Crea tus gráficas</h2>
    <div class="controls">
      <label class="fld">Tipo<select id="gType">
        <option value="top">Top 10 por indicador</option>
        <option value="bottom">Bottom 10 por indicador</option>
        <option value="hist">Histograma (distribución)</option>
        <option value="heat">Mapa de calor (países × pilares)</option>
      </select></label>
      <label class="fld" id="gMetricWrap">Indicador<select id="gMetric">${METRICS.map(m=>`<option value="${m.k}">${m.l}</option>`).join("")}</select></label>
    </div>
    <div id="gOut"></div>
  </div>`;
  $("#gType").onchange=drawG; $("#gMetric").onchange=drawG; drawG();
}
function drawG(){
  const type=$("#gType").value, k=$("#gMetric").value, out=$("#gOut");
  $("#gMetricWrap").style.display = type==="heat" ? "none":"inline-flex";
  destroyAll();
  if(type==="heat"){
    let html='<div class="tablescroll"><table class="heat"><thead><tr><th class="l">País</th>'+PM.map(p=>`<th title="${p.label}">${p.key}</th>`).join("")+'<th>IPES</th></tr></thead><tbody>';
    [...C].sort((a,b)=>b.ipes-a.ipes).forEach(c=>{html+=`<tr><td class="l">${c.name}</td>`+
      PM.map(p=>`<td style="background:${colorScore(c.p[p.key])}">${fmt(c.p[p.key])}</td>`).join("")+
      `<td style="background:${colorScore(c.ipes)}">${fmt(c.ipes)}</td></tr>`;});
    out.innerHTML=html+'</tbody></table></div>'; return;
  }
  out.innerHTML='<div class="chartbox tall"><canvas id="gCanvas"></canvas></div>';
  if(type==="hist"){
    const vals=C.map(c=>mval(c,k)); const bins=[0,20,30,40,50,60,70,80,90,100];
    const counts=[],labels=[];
    for(let i=0;i<bins.length-1;i++){labels.push(bins[i]+"–"+bins[i+1]);counts.push(vals.filter(v=>v>=bins[i]&&v<bins[i+1]).length);}
    chart("gCanvas",{type:"bar",data:{labels,datasets:[{data:counts,backgroundColor:bins.slice(0,-1).map((b,i)=>colorScore((bins[i]+bins[i+1])/2))}]},
      options:barOpts({max:Math.max(...counts)+1,xtitle:mlabel(k)+" (rango)",ytitle:"Nº de países"})});
  }else{
    const sorted=[...C].sort((a,b)=>mval(b,k)-mval(a,k));
    const rows=type==="top"?sorted.slice(0,10):sorted.slice(-10).reverse();
    chart("gCanvas",{type:"bar",data:{labels:rows.map(c=>c.name),datasets:[{data:rows.map(c=>mval(c,k)),
      backgroundColor:rows.map(c=>c.iso===state.country?"#0f1f3d":colorScore(mval(c,k)))}]},
      options:barOpts({horizontal:true,max:100})});
  }
}

/* ===================================================== INDICADORES */
function vIndicadores(app){
  const pilares=[...new Set(D.indicators.map(i=>i.pilar))];
  app.innerHTML=`
  <div class="panel">
    <h2>Batería de indicadores (91)</h2>
    <p class="sub">2 subíndices · 5 dimensiones · 13 pilares. Origen: Base = propuesta inicial · Comentario = ajuste solicitado · Encuesta = sugerencia de expertos.</p>
    <div class="controls">
      <label class="fld">Pilar<select id="iPil"><option value="">Todos</option>${pilares.map(p=>`<option>${p}</option>`).join("")}</select></label>
      <label class="fld">Buscar<input type="search" id="iQ" placeholder="indicador o fuente…"></label>
    </div>
    <div class="tablescroll"><table id="iTab"></table></div>
  </div>`;
  $("#iPil").onchange=drawInd; $("#iQ").oninput=drawInd; drawInd();
}
function drawInd(){
  const pil=$("#iPil").value, q=($("#iQ").value||"").toLowerCase();
  const rows=D.indicators.filter(i=>(!pil||i.pilar===pil)&&((i.ind||"").toLowerCase().includes(q)||(i.fuente||"").toLowerCase().includes(q)));
  $("#iTab").innerHTML=`<thead><tr><th class="l">Subíndice</th><th class="l">Pilar</th><th class="l">Indicador</th><th class="l">Qué evalúa</th><th class="l">Fuente</th><th class="l">Origen</th></tr></thead>
  <tbody>${rows.map(i=>`<tr><td class="l">${i.sub}</td><td class="l">${i.pilar}</td><td class="l"><b>${i.ind}</b></td><td class="l muted">${i.eval||""}</td><td class="l">${i.fuente||""}</td><td class="l"><span class="tag">${i.origen||""}</span></td></tr>`).join("")}</tbody>`;
}

/* ===================================================== FICHA */
function vFicha(app){
  app.innerHTML=`
  <div class="panel">
    <div class="controls">
      <label class="fld">País<select id="fSel">${[...C].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.iso}" ${c.iso===state.country?'selected':''}>${c.name}</option>`).join("")}</select></label>
    </div>
    <div id="fBody"></div>
  </div>`;
  $("#fSel").onchange=e=>{state.country=e.target.value; writeHash(); vFicha(app);};
  const c=byIso(state.country);
  const ranked=[...C].sort((a,b)=>b.ipes-a.ipes);
  const ranks={}; PKEYS.concat(["eco","soc","ipes"]).forEach(k=>{const s=[...C].sort((a,b)=>mval(b,k)-mval(a,k)); ranks[k]=s.findIndex(x=>x.iso===c.iso)+1;});
  const pillarsSorted=[...PM].sort((a,b)=>c.p[b.key]-c.p[a.key]);
  $("#fBody").innerHTML=`
    <h2>${c.name} <span class="flagiso">${c.iso}</span></h2>
    <p class="sub"><span class="dot" style="background:${regionColor(c.region)}"></span> ${c.region}</p>
    <div class="grid kpis" style="margin-top:12px">
      <div class="kpi"><div class="v" style="color:${colorScore(c.ipes)}">${fmt(c.ipes)}</div><div class="l">IPES · puesto #${c.rank} de 53</div></div>
      <div class="kpi"><div class="v">${fmt(c.eco)}</div><div class="l">Subíndice Económico · #${ranks.eco}</div></div>
      <div class="kpi"><div class="v">${fmt(c.soc)}</div><div class="l">Subíndice Social · #${ranks.soc}</div></div>
    </div>
    <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:14px" id="fGrid">
      <div class="panel" style="margin:0"><h3>Perfil de pilares</h3><div class="chartbox"><canvas id="fRadar"></canvas></div></div>
      <div class="panel" style="margin:0"><h3>Fortalezas y rezagos</h3>
        <table><thead><tr><th class="l">Pilar</th><th>Puntaje</th><th>Puesto</th></tr></thead><tbody>
        ${pillarsSorted.map(p=>`<tr><td class="l">${p.key} · ${p.label}</td><td><span class="scorecell" style="background:${colorScore(c.p[p.key])}">${fmt(c.p[p.key])}</span></td><td class="muted">#${ranks[p.key]}</td></tr>`).join("")}
        </tbody></table></div>
    </div>`;
  chart("fRadar",{type:"radar",data:{labels:PM.map(p=>p.key),datasets:[
    {label:c.name,data:PKEYS.map(k=>c.p[k]),borderColor:"#2563eb",backgroundColor:"#2563eb22",borderWidth:2,pointRadius:2},
    {label:"Promedio 53",data:PKEYS.map(k=>mean(C.map(x=>x.p[k]))),borderColor:tickColor(),borderDash:[5,5],backgroundColor:"transparent",borderWidth:1.5,pointRadius:0}
  ]},options:radarOpts()});
}

/* ===================================================== METODOLOGIA */
function vMetodologia(app){
  const dimList=DIMS.map(dim=>{const ps=PM.filter(p=>p.dim===dim).map(p=>p.key+" "+p.label).join(" · ");return `<p><b>${dim}:</b> ${ps}</p>`;}).join("");
  app.innerHTML=`
  <div class="panel metho">
    <h2>Metodología y fuentes</h2>
    <p>El <b>Índice de Progreso Económico y Social (IPES)</b> mide el desempeño de <b>53 países</b> (Colombia + OCDE + América Latina) a partir de <b>91 indicadores</b> de fuentes oficiales, organizados en <b>13 pilares</b>, <b>5 dimensiones</b> y <b>2 subíndices</b>. Todos los puntajes van de <b>0 a 100</b> (100 = mejor desempeño).</p>
    <h3>Estructura</h3>
    <p><b>Subíndice Económico</b> = promedio de los pilares 1–7. <b>Subíndice Social</b> = promedio de los pilares 8–13. <b>IPES</b> = promedio de los dos subíndices.</p>
    ${dimList}
    <h3>Normalización</h3>
    <p>Método min–max a escala 0–100 sobre los 53 países: <code>puntaje = (valor − mínimo) / (máximo − mínimo) × 100</code>. Los indicadores de sentido negativo (inflación, arancel, desempleo, mortalidad…) se invierten. El puntaje de cada pilar es el promedio simple de sus indicadores disponibles.</p>
    <h3>Cobertura y datos</h3>
    <p>Dato más reciente disponible por indicador (2020–2024). Esta versión utiliza 41 indicadores accesibles de forma abierta (principalmente API del Banco Mundial, que agrega OMS, OIT, UNESCO, etc.); el resto de la batería de 91 indicadores está documentada en la pestaña <b>Indicadores</b>. Los años de referencia varían por indicador y algunos países tienen menos indicadores disponibles.</p>
    <h3>Aviso</h3>
    <p class="note">Tablero con fines de visualización académica. Verifica las cifras contra las fuentes oficiales antes de publicar.</p>
  </div>`;
}

/* ---------- chart option helpers ---------- */
function barOpts({horizontal=false,max=100,xtitle="",ytitle=""}={}){
  return {indexAxis:horizontal?"y":"x",responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>fmt(c.parsed[horizontal?"x":"y"])}}},
    scales:{x:{max:horizontal?max:undefined,beginAtZero:true,ticks:{color:tickColor()},grid:{color:lineColor()},title:{display:!!xtitle,text:xtitle,color:tickColor()}},
            y:{max:horizontal?undefined:max,beginAtZero:true,ticks:{color:tickColor()},grid:{color:lineColor()},title:{display:!!ytitle,text:ytitle,color:tickColor()}}}};
}
function radarOpts(){
  return {responsive:true,maintainAspectRatio:false,
    plugins:{legend:{position:"bottom",labels:{color:tickColor(),boxWidth:12}},
      tooltip:{callbacks:{label:c=>{const p=PM[c.dataIndex];return `${c.dataset.label} · ${p.label}: ${fmt(c.parsed.r)}`;}}}},
    scales:{r:{min:0,max:100,ticks:{stepSize:25,color:tickColor(),backdropColor:"transparent"},
      grid:{color:lineColor()},angleLines:{color:lineColor()},pointLabels:{color:tickColor(),font:{size:11}}}}};
}

/* ---------- toolbar ---------- */
function setTheme(t){ document.body.setAttribute("data-theme",t); $("#btnTheme").textContent=t==="dark"?"☀ Modo claro":"🌙 Modo oscuro"; render(); }
$("#btnTheme").onclick=()=>setTheme(document.body.getAttribute("data-theme")==="dark"?"light":"dark");
$("#btnShare").onclick=()=>{navigator.clipboard.writeText(location.href).then(()=>{const b=$("#btnShare");b.textContent="✓ Copiado";setTimeout(()=>b.textContent="🔗 Compartir",1500);});};
$("#btnCsv").onclick=()=>{
  const head=["Rank","Pais","ISO","Region",...PM.map(p=>p.key+" "+p.label),"Economico","Social","IPES"];
  const lines=[head.join(",")].concat([...C].sort((a,b)=>b.ipes-a.ipes).map(c=>
    [c.rank,'"'+c.name+'"',c.iso,'"'+c.region+'"',...PKEYS.map(k=>c.p[k]),c.eco,c.soc,c.ipes].join(",")));
  const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="IPES_puntajes_53paises.csv"; a.click();
};

/* ---------- boot ---------- */
readHash(); document.body.setAttribute("data-theme","light"); render();
