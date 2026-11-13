/* =====================================================================
   S/E Termales 115 kV · Motor de cálculo compartido
   Lo usan index.html (herramienta de diseño) y simulador.html (patio 3D),
   para que los dos muestren siempre los mismos resultados.
   ===================================================================== */
(function(){
"use strict";

/* ============================================================
   Datos del proyecto (valores iniciales = entregas G1/G2 + ETAP)
   ============================================================ */
const DEF={
  g:{um:123,alt:1800,t:18},
  ais:{dist:20,mp:25,ko:0.8,kt:1.15,ke:1.4,S:1000,ur:96,npr:226,npm:180,pol:"d",kd:1.1,ins:"p074",extra:0},
  dis:{link:true,BIL:550,dMode:"none",dMan:0.893,fff:1.15,galibo:4,rnd:true,Es:550,kS:1.04,nExp:0.9,kVB:1.1,barra:"flex",cond:"ACSR",K:10,vano:22,fMode:"pct",pct:3,w:1.628,Fh:500,Wb:11},
  mal:{If:30.876,XR:15,Sf:0.2,tf:0.5,tc:1,rho:800,rhos:5000,hs:0.2,peso:50,Ta:18,Lx:130,Ly:70,D:4,h:0.6,size:"250",mat:"duro",conn:"exo",nR:120,LR:20,rodPos:"esq"}
};
const SUBE_KEY="sube-termales-web-v2";
/* Lee los datos guardados por la herramienta (o los del proyecto si no hay) */
function SUBE_load(){const S=JSON.parse(JSON.stringify(DEF));
  try{const s=JSON.parse(localStorage.getItem(SUBE_KEY)||"null");if(s&&s.v===2)for(const m of Object.keys(DEF))Object.assign(S[m],s[m]||{})}catch(e){}
  return S;}
function SUBE_save(S){try{localStorage.setItem(SUBE_KEY,JSON.stringify({v:2,...S}))}catch(e){}}
/* Utilidad de formato usada por los motores */
const roundUp=(x,s)=>Math.ceil(x/s-1e-9)*s;
const mx=(a,b)=>b==null?a:Math.max(a,b);

/* ============================================================
   Tablas normativas
   ============================================================ */
const BIL_IEC={52:[250],72.5:[325],100:[380,450],123:[450,550],145:[450,550,650],170:[550,650,750],245:[650,750,850,950,1050]};
/* RETIE 2013: distancias mínimas de seguridad en subestaciones (BIL, d mín IEC, valor básico, circulación de personal, trabajo horizontal, trabajo vertical) */
const RETIE_C=[[60,0.09,0.10,null,null,null],[75,0.12,0.13,null,null,null],[95,0.16,0.18,null,null,null],[125,0.22,0.24,null,null,null],[170,0.32,0.35,null,null,null],[200,0.38,0.42,null,null,null],[250,0.48,0.53,null,null,null],[325,0.63,0.70,null,null,null],[380,0.75,0.83,3.08,null,null],[450,0.90,1.00,3.25,null,null],[550,1.10,1.21,3.46,2.96,null],[650,1.30,1.43,3.68,3.18,null],[750,1.50,1.65,3.90,3.40,2.90],[850,1.70,1.87,4.12,3.62,3.12],[950,1.90,2.09,4.34,3.84,3.34],[1050,2.10,2.31,4.56,4.06,3.56]];
const RETIE_A=[[52,3.2,"34,5 kV"],[72.5,3.5,"66 kV"],[123,4.0,"115 kV"],[245,4.7,"230 kV"]];
const POL={a:["a · Muy ligera",22.0],b:["b · Ligera",27.8],c:["c · Media",34.7],d:["d · Pesada (alta)",43.3],e:["e · Muy pesada",53.7]};
const AISL={
  p069:{n:"Polimérico Siemens 3FL3-069",tipo:"pol",fuga:3169,lon:1289,liwv:688,sml:100},
  p074:{n:"Polimérico Siemens 3FL3-074",tipo:"pol",fuga:3494,lon:1393,liwv:742,sml:100},
  u120:{n:"Disco de vidrio U120B (146 × 254 mm)",tipo:"disco",fuga:292,lon:146,sml:120}
};
const MAT={blando:{n:"Cobre recocido (blando) 100 %",ar:0.00393,K0:234,Tm:1083,rr:1.72,TC:3.42},duro:{n:"Cobre duro comercial 97 %",ar:0.00381,K0:242,Tm:1084,rr:1.78,TC:3.42},cw40:{n:"Acero recubierto de cobre 40 %",ar:0.00378,K0:245,Tm:1084,rr:4.40,TC:3.85}};
const CONN={exo:{n:"Soldadura exotérmica",lim:Infinity},fuerte:{n:"Soldadura fuerte (≤ 450 °C)",lim:450},mec:{n:"Conectores mecánicos (≤ 250 °C)",lim:250}};
const SIZES={"2/0":["2/0 AWG",67.4,10.5],"4/0":["4/0 AWG",107.2,13.3],"250":["250 kcmil",126.7,14.6],"300":["300 kcmil",152.0,16.0],"350":["350 kcmil",177.3,17.3],"500":["500 kcmil",253.0,20.6]};

/* ============================================================
   Motor 1: coordinación de aislamiento (base: calculador de Daniel)
   ============================================================ */
function calcAis(g,p){
  const o={},c=300;
  o.kmin=1+p.mp/100;
  o.COV=g.um/Math.sqrt(3);o.TOV=p.ke*o.COV;o.Ro=o.COV/p.ko;o.Re=o.TOV/p.kt;o.Rn=Math.max(o.Ro,o.Re);o.okUr=p.ur>=o.Rn;
  o.Ka=g.alt>1000?Math.exp((g.alt-1000)/8150):1;
  o.NPRc=p.npr*o.Ka;o.NPMc=p.npm*o.Ka;
  o.filas=(BIL_IEC[g.um]||[]).map(BIL=>{const K1=BIL/o.NPRc,BSLa=0.75*BIL,KM=BSLa/o.NPMc,dmax=((BIL/o.kmin)-o.NPRc)*c/(2*p.S);
    return {BIL,K1,BSLa,KM,dmax,c1:K1>=o.kmin,c2:KM>1.15,c3:dmax>=p.dist,ok:K1>=o.kmin&&KM>1.15&&dmax>=p.dist}});
  o.sel=o.filas.find(f=>f.ok)||null;
  o.BIL=o.sel?o.sel.BIL:null;
  /* fuga IEC 60815: USCD fase-tierra × Um/√3 × kd */
  o.uscd=POL[p.pol][1];o.Lcalc=o.uscd*g.um/Math.sqrt(3)*p.kd;o.Lreq=Math.ceil(o.Lcalc-1e-9);
  const A=AISL[p.ins];o.A=A;
  if(A.tipo==="disco"){o.n=Math.ceil(o.Lreq/A.fuga)+(+p.extra||0);o.fugaTot=o.n*A.fuga;o.lon=o.n*A.lon;o.okFuga=o.fugaTot>=o.Lreq-1e-9;o.okLiwv=true}
  else{o.n=1;o.fugaTot=A.fuga;o.lon=A.lon;o.okFuga=A.fuga>=o.Lreq-1e-9;o.okLiwv=o.BIL?A.liwv>=o.BIL:false;o.okLiwvKa=o.BIL?A.liwv>=o.BIL*o.Ka:false}
  o.ok=!!o.sel&&o.okUr&&o.okFuga&&o.okLiwv;
  return o;
}

/* ============================================================
   Motor 2: distancias (motor de Óscar, sin cambios de método)
   ============================================================ */
function densidad(mode,h,t,dMan){
  if(mode==="none")return{delta:1};if(mode==="man")return{delta:dMan};
  if(mode==="baro"){const b=Math.pow(10,Math.log10(76)-h/18336);return{delta:3.92*b/(273+t),b}}
  const pk=101.3*Math.exp(-h/8150);return{delta:(pk/101.3)*(293/(273+t)),pk};
}
function retieRow(BIL){
  const ex=RETIE_C.find(r=>r[0]===BIL);if(ex)return{row:ex,exact:true};
  if(BIL<RETIE_C[0][0]||BIL>RETIE_C[RETIE_C.length-1][0])return{row:null,exact:false};
  let i=0;while(RETIE_C[i+1][0]<BIL)i++;const a=RETIE_C[i],b=RETIE_C[i+1],f=(BIL-a[0])/(b[0]-a[0]),row=[BIL];
  for(let k=1;k<6;k++)row.push(a[k]==null||b[k]==null?null:a[k]+f*(b[k]-a[k]));return{row,exact:false};
}
function retieR(Um){const ex=RETIE_A.find(r=>r[0]===Um);if(ex)return{R:ex[1],lab:ex[2]};
  if(Um<RETIE_A[0][0])return{R:RETIE_A[0][1],lab:"bajo la tabla"};if(Um>RETIE_A[RETIE_A.length-1][0])return{R:RETIE_A[RETIE_A.length-1][1],lab:"sobre la tabla"};
  let i=0;while(RETIE_A[i+1][0]<Um)i++;const a=RETIE_A[i],b=RETIE_A[i+1];return{R:a[1]+(Um-a[0])/(b[0]-a[0])*(b[1]-a[1]),lab:"interpolado"}}
function calcDis(g,p){
  const r={p,g},step=p.rnd?0.05:0,RU=x=>step?roundUp(x,step):x,RP=x=>p.rnd?roundUp(x,0.5):x,R10=x=>p.rnd?roundUp(x,0.1):x,RCM=x=>p.rnd?Math.round(x*100-1e-9)/100:x;
  Object.assign(r,densidad(p.dMode,g.alt,g.t,p.dMan));
  const ret=retieRow(p.BIL),Rw=ret.row;r.retie=ret;r.R=Rw;
  r.dft=p.kS*Math.pow(r.delta,-p.nExp)*p.BIL/p.Es;r.dftBase=mx(r.dft,Rw&&Rw[1]);r.dftA=RU(r.dftBase);
  r.dffMin=1.4*r.dftBase;r.dffMax=2*r.dftBase;r.dff=p.fff*r.dftBase;r.dffA=RU(r.dff);
  r.VB=p.kVB*r.dft;r.VBa=mx(r.VB,Rw&&Rw[2]);
  r.Dv=2.25+r.VBa;r.DvA=RU(mx(r.Dv,Rw&&Rw[3]));
  r.Dh=1.75+r.VBa;r.DhA=RU(mx(r.Dh,Rw&&Rw[4]));
  r.Dtv=1.25+r.VBa;r.DtvA=RU(mx(r.Dtv,Rw&&Rw[5]));
  r.Tveh=r.VBa+0.70;r.Hveh=r.VBa+p.galibo+0.70;r.HvehA=R10(r.Hveh);
  r.Rcer=retieR(g.um);
  r.flex=p.barra==="flex";
  r.f_m=!r.flex?0:(p.fMode==="pct"?p.pct/100*p.vano:p.vano*p.vano*p.w/(8*p.Fh));r.f_cm=r.f_m*100;
  r.Kuse=r.flex?p.K:0;r.sway=r.Kuse*Math.sqrt(r.f_cm);
  r.Sf=(r.dffA*100+r.sway)/100;r.SfA=r.flex?RCM(r.Sf):RU(r.Sf);
  r.Dfe=(r.dftA*100+r.sway)/100;r.DfeA=RU(r.Dfe);
  r.WbMin=2*r.SfA+2*r.DfeA;
  r.heqF=2.30+0.0105*g.um;r.heqA=RU(Math.max(r.heqF,r.DvA));
  r.hbF=5+0.0125*g.um;r.hbReq=Math.max(r.hbF,r.heqA+r.dffA);r.hbA=r.flex?r.hbReq:RU(r.hbReq);
  r.amarre=r.hbA+r.f_m;r.amarreA=r.flex?RP(r.amarre):r.hbA;r.hbLow=r.amarreA-r.f_m;
  r.hremF=5+0.006*g.um;r.hremA=RU(Math.max(6,r.hremF));
  r.Wb=p.Wb>0?p.Wb:r.WbMin;
  /* RETIE 2013 Tabla 13.4: 71,5 cm + 1 cm/kV sobre 50 kV, +3 % por cada 300 m sobre 1000 m */
  r.ret134base=(71.5+Math.max(0,g.um-50))/100;r.kAlt134=1+0.03*Math.max(0,(g.alt-1000)/300);r.ret134=r.ret134base*r.kAlt134;
  const ge=(a,b)=>`${fm(a)} m ${a>=b-1e-9?"≥":"<"} ${fm(b)} m`;
  r.checks=[
    {txt:"Fase–tierra: fórmula frente a la mínima de la tabla RETIE",ok:!Rw||r.dft>=Rw[1]-1e-9,cmp:Rw?ge(r.dft,Rw[1]):"BIL fuera de tabla",bad:`Rige la tabla RETIE: se adopta ${fm(r.dftA)} m`,lvl:"info"},
    {txt:"Altura de equipos (fórmula) frente a circulación de personal",ok:r.heqF>=r.DvA-1e-9,cmp:ge(r.heqF,r.DvA),bad:`Rige circulación de personal: ${fm(r.heqA)} m`,lvl:"info"},
    {txt:"Barras sobre equipos: separación ≥ distancia fase–fase",ok:r.hbF-r.heqA>=r.dffA-1e-9,cmp:ge(r.hbF-r.heqA,r.dffA),bad:`Se elevan las barras a ${fm(r.hbA)} m`,lvl:"info"},
    {txt:"Punto más bajo de barras frente a vehículos",ok:r.hbLow>=r.HvehA-1e-9,cmp:ge(r.hbLow,r.HvehA),bad:"No apto para vías bajo barras",lvl:"no"},
    {txt:"Remate de líneas frente a vehículos",ok:r.hremA>=r.HvehA-1e-9,cmp:ge(r.hremA,r.HvehA),bad:`Si hay vías bajo las llegadas, use ${fm(r.HvehA)} m`,lvl:"wa"},
    {txt:"Separación entre fases frente a RETIE 2013 Tabla 13.4 (corregida por altura)",ok:r.SfA>=r.ret134-1e-9,cmp:ge(r.SfA,r.ret134),bad:"Aumentar la separación entre fases",lvl:"no"},
    {txt:"Ancho de bahía de diseño frente al mínimo por fases",ok:!(p.Wb>0)||p.Wb>=r.WbMin-1e-9,cmp:p.Wb>0?ge(p.Wb,r.WbMin):"Sin ancho de diseño",bad:"Ampliar la bahía",lvl:"no"}
  ];
  return r;
}

/* ============================================================
   Motor 3: malla IEEE 80-2013 (motor de Camilo, corregido)
   ============================================================ */
function calcMal(p){
  const o={},capa=p.hs>0&&p.rhos>0,rs=capa?p.rhos:p.rho,ts=p.ts>0?p.ts:p.tf,tc=p.tc>0?p.tc:p.tf;o.capa=capa;o.ts=ts;o.tc=tc;
  o.Cs=capa?1-0.09*(1-p.rho/p.rhos)/(2*p.hs+0.09):1;
  o.kb=p.peso===50?0.116:0.157;
  o.Etouch=(1000+1.5*o.Cs*rs)*o.kb/Math.sqrt(ts);o.Estep=(1000+6*o.Cs*rs)*o.kb/Math.sqrt(ts);
  o.Tdc=p.XR/(2*Math.PI*60);
  const dfx=t=>o.Tdc>0?Math.sqrt(1+(o.Tdc/t)*(1-Math.exp(-2*t/o.Tdc))):1;
  o.Df=dfx(p.tf);o.Dfc=dfx(tc);
  o.Ig=p.Sf*p.If*1000;o.IG=o.Df*o.Ig;
  const m=MAT[p.mat];o.Tm=Math.min(m.Tm,CONN[p.conn].lim);
  o.IFc=o.Dfc*p.If; /* corriente asimétrica para el conductor (toda la falla, sin Sf) */
  o.Amin=o.IFc/Math.sqrt((m.TC*1e-4/(tc*m.ar*m.rr))*Math.log((m.K0+o.Tm)/(m.K0+p.Ta)));
  const sz=SIZES[p.size];o.Asec=sz[1];o.dmm=sz[2];o.okCond=o.Asec>=o.Amin;
  const A=p.Lx*p.Ly;o.A=A;
  o.nY=Math.max(1,Math.round(p.Lx/p.D))+1;o.nX=Math.max(1,Math.round(p.Ly/p.D))+1;
  o.LC=o.nY*p.Ly+o.nX*p.Lx;o.Lp=2*(p.Lx+p.Ly);
  o.Deff=(p.Lx/(o.nY-1)+p.Ly/(o.nX-1))/2;
  const D=o.Deff,d=o.dmm/1000,h=p.h;
  o.LRt=p.nR*p.LR;o.LT=o.LC+o.LRt;
  o.Rg=p.rho*(1/o.LT+(1/Math.sqrt(20*A))*(1+1/(1+h*Math.sqrt(20/A))));
  o.GPR=o.IG*o.Rg;
  o.na=2*o.LC/o.Lp;o.nb=Math.sqrt(o.Lp/(4*Math.sqrt(A)));o.n=o.na*o.nb;
  const esq=p.rodPos==="esq"&&p.nR>0;o.esq=esq;
  o.Kii=esq?1:1/Math.pow(2*o.n,2/o.n);o.Kh=Math.sqrt(1+h/1);
  o.Km=(1/(2*Math.PI))*(Math.log(D*D/(16*h*d)+Math.pow(D+2*h,2)/(8*D*d)-h/(4*d))+(o.Kii/o.Kh)*Math.log(8/(Math.PI*(2*o.n-1))));
  o.Ki=0.644+0.148*o.n;
  o.LM=esq?o.LC+(1.55+1.22*(p.LR/Math.sqrt(p.Lx*p.Lx+p.Ly*p.Ly)))*o.LRt:o.LC+o.LRt;
  o.Em=p.rho*o.Km*o.Ki*o.IG/o.LM;
  o.Ks=(1/Math.PI)*(1/(2*h)+1/(D+h)+(1/D)*(1-Math.pow(0.5,o.n-2)));
  o.LS=0.75*o.LC+0.85*o.LRt;o.Es=p.rho*o.Ks*o.Ki*o.IG/o.LS;
  o.safeGPR=o.GPR<=o.Etouch;o.okEm=o.Em<=o.Etouch;o.okEs=o.Es<=o.Estep;o.okMalla=o.safeGPR||(o.okEm&&o.okEs);
  o.fuera=o.n>25||o.Deff<2.5||h<0.25||h>2.5;
  o.ok=o.okCond&&o.okMalla&&!o.fuera;
  o.LMreq=p.rho*o.Km*o.Ki*o.IG/o.Etouch;
  return o;
}
window.SUBE={DEF,KEY:SUBE_KEY,load:SUBE_load,save:SUBE_save,BIL_IEC,RETIE_C,RETIE_A,POL,AISL,MAT,CONN,SIZES,calcAis,calcDis,calcMal};
})();
