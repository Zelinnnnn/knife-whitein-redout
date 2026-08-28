<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>血与刃的白蔷薇</title>
<style>
:root{
  --ink:#12101A; --crypt:#1B1725; --crypt2:#231D30; --edge:#332A43;
  --bone:#EDE7DC; --ash:#8C8496; --dim:#5E5670;
  --blood:#C4303E; --blood-d:#7C1723;
  --rose:#F4E9EE; --gold:#C9A45C; --sanct:#7FA8C9;
  --serif:"Songti SC","STSong","Noto Serif CJK SC","Source Han Serif SC",Georgia,serif;
  --sans:-apple-system,"PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,monospace;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;padding:0;background:var(--ink);color:var(--bone);font-family:var(--sans);
  -webkit-user-select:none;user-select:none;overscroll-behavior:none}
body{background:
  radial-gradient(120% 70% at 50% -10%, #2A1F33 0%, transparent 60%),
  radial-gradient(90% 50% at 50% 110%, #24121A 0%, transparent 60%), var(--ink);
  min-height:100dvh}
#app{max-width:460px;margin:0 auto;padding:18px 16px 40px}
h1,h2,h3{font-family:var(--serif);font-weight:600;margin:0}
.eyebrow{font-size:11px;letter-spacing:.32em;color:var(--dim);text-transform:uppercase;margin-bottom:8px}
.title{font-family:var(--serif);font-size:30px;letter-spacing:.14em;line-height:1.3}
.title .b{color:var(--blood)}
.sub{color:var(--ash);font-size:13px;line-height:1.7;margin-top:10px}
.panel{background:linear-gradient(180deg,var(--crypt2),var(--crypt));border:1px solid var(--edge);
  border-radius:14px;padding:16px;margin:14px 0}
.rule{height:1px;background:linear-gradient(90deg,transparent,var(--edge),transparent);margin:18px 0}
label{display:block;font-size:12px;letter-spacing:.18em;color:var(--dim);margin:0 0 7px}
input{width:100%;background:#0E0C15;border:1px solid var(--edge);color:var(--bone);border-radius:10px;
  padding:13px 14px;font-size:16px;font-family:var(--sans);outline:none}
input:focus{border-color:var(--gold)}
input.code{font-family:var(--mono);letter-spacing:.4em;text-transform:uppercase;text-align:center;font-size:22px}
button{font-family:var(--sans);font-size:15px;border-radius:10px;border:1px solid var(--edge);
  background:var(--crypt2);color:var(--bone);padding:13px 16px;width:100%;margin-top:10px;cursor:pointer;
  transition:transform .08s,background .15s}
button:active{transform:scale(.985)}
button:disabled{opacity:.35}
button.primary{background:linear-gradient(180deg,#A32330,#7C1723);border-color:#93202C;font-weight:600;letter-spacing:.08em}
button.ghost{background:transparent}
button.gold{background:linear-gradient(180deg,#B08A3F,#8A6A2B);border-color:#A17F38;color:#1A1410;font-weight:700}
button.small{width:auto;padding:8px 14px;font-size:13px;margin:0}
.row{display:flex;gap:8px}
.row>button{margin-top:0}
.err{color:var(--blood);font-size:13px;min-height:18px;margin-top:8px}
.code-big{font-family:var(--mono);font-size:36px;letter-spacing:.28em;color:var(--gold);text-align:center;
  padding:6px 0 2px}
.plist{display:flex;flex-direction:column;gap:8px;margin-top:6px}
.pl{display:flex;align-items:center;gap:10px;background:#0E0C15;border:1px solid var(--edge);
  border-radius:10px;padding:11px 13px;font-size:14px}
.pl .seat{font-family:var(--mono);font-size:11px;color:var(--dim);width:18px}
.pl .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tag{font-size:10px;letter-spacing:.1em;padding:3px 7px;border-radius:99px;border:1px solid var(--edge);color:var(--ash)}
.tag.coin{color:#1A1410;background:var(--gold);border-color:var(--gold);font-weight:700}
.tag.done{color:var(--dim)}
.tag.turn{color:var(--blood);border-color:var(--blood-d)}
.tag.ok{color:#7FBF8F;border-color:#2F5238}

/* altar */
.altar{display:flex;gap:10px;margin:14px 0}
.track{flex:1;background:#0E0C15;border:1px solid var(--edge);border-radius:12px;padding:12px}
.track .k{font-size:11px;letter-spacing:.2em;color:var(--dim)}
.track .v{font-family:var(--serif);font-size:26px;margin-top:2px}
.track.w .v{color:var(--rose)} .track.r .v{color:var(--blood)}
.track .v small{font-size:13px;color:var(--dim);letter-spacing:.05em}
.pips{display:flex;flex-wrap:wrap;gap:4px;margin-top:9px}
.pip{width:8px;height:8px;border-radius:99px;border:1px solid var(--edge)}
.pip.on{background:var(--rose);border-color:var(--rose)}
.track.r .pip.on{background:var(--blood);border-color:var(--blood)}

/* identity card */
.idcard{position:relative;border-radius:16px;border:1px solid var(--edge);
  background:linear-gradient(160deg,#241D2F,#15111E);padding:26px 18px;text-align:center;overflow:hidden}
.idcard .veil{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:linear-gradient(160deg,#241D2F,#15111E);gap:8px;transition:opacity .18s}
.idcard.open .veil{opacity:0;pointer-events:none}
.idcard .veil .lock{font-size:13px;letter-spacing:.28em;color:var(--dim)}
.idcard .veil .hint{font-size:11px;color:#463E58;letter-spacing:.1em}
.idname{font-family:var(--serif);font-size:34px;letter-spacing:.16em}
.idcamp{font-size:12px;letter-spacing:.3em;margin-top:8px}
.idcard .desc{font-size:12.5px;color:var(--ash);line-height:1.75;margin-top:14px}
.w-txt{color:var(--rose)} .r-txt{color:var(--blood)}

/* cards in hand */
.hand{display:flex;gap:8px;margin-top:12px}
.card{flex:1;aspect-ratio:.68;border-radius:12px;border:1px solid var(--edge);display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:6px;background:linear-gradient(165deg,#241D2F,#15111E);
  font-family:var(--serif);font-size:17px;letter-spacing:.1em;position:relative}
.card.sel{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold) inset}
.card .mk{font-size:20px;line-height:1}
.card.w{color:var(--rose)} .card.r{color:var(--blood)} .card.g{color:var(--ash)}
.card .cap{font-size:9.5px;letter-spacing:.18em;color:var(--dim);font-family:var(--sans)}

/* crystal */
.crystal{text-align:center;padding:20px 14px;border-radius:16px;border:1px solid var(--edge);
  background:radial-gradient(80% 90% at 50% 0%,#2C2440,#15111E)}
.crystal .num{font-family:var(--serif);font-size:56px;color:var(--sanct);line-height:1;letter-spacing:.06em}
.crystal .nm{font-family:var(--serif);font-size:20px;letter-spacing:.16em;margin-top:10px}
.crystal .ds{font-size:12.5px;color:var(--ash);line-height:1.75;margin-top:8px}

.note{background:#0E0C15;border-left:2px solid var(--sanct);border-radius:0 10px 10px 0;padding:11px 13px;
  font-size:13px;line-height:1.65;margin-top:8px;color:#CFC7D8}
.note b{color:var(--bone)}
.logbox{max-height:190px;overflow-y:auto;font-size:12.5px;color:var(--ash);line-height:1.85}
.logbox div{padding:3px 0;border-bottom:1px dashed #241E32}
.pick{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.pick button{margin-top:0;font-size:14px;padding:12px 8px}
.reveal{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:14px 0}
.rc{width:62px;aspect-ratio:.68;border-radius:10px;border:1px solid var(--edge);display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:4px;font-family:var(--serif);font-size:14px;letter-spacing:.08em;
  background:linear-gradient(165deg,#241D2F,#15111E);animation:flip .45s backwards}
@keyframes flip{from{opacity:0;transform:rotateY(90deg)}to{opacity:1;transform:none}}
.verdict{text-align:center;font-family:var(--serif);font-size:24px;letter-spacing:.18em;margin:8px 0}
.center{text-align:center}
.muted{color:var(--ash);font-size:13px;line-height:1.7}
.tiny{color:var(--dim);font-size:11.5px;line-height:1.7}
.sheet{position:fixed;inset:0;background:rgba(8,6,12,.86);backdrop-filter:blur(6px);z-index:50;
  overflow-y:auto;padding:26px 16px 60px;-webkit-user-select:text;user-select:text}
.sheet .inner{max-width:460px;margin:0 auto}
.sheet h3{font-size:18px;letter-spacing:.16em;margin:20px 0 8px;color:var(--gold)}
.sheet p,.sheet li{font-size:13.5px;color:#CFC7D8;line-height:1.85}
.sheet ul{padding-left:18px;margin:6px 0}
.link{color:var(--gold);font-size:12px;letter-spacing:.14em;text-align:center;margin-top:16px;cursor:pointer}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>

<div id="app"></div>
<div id="sheet"></div>

<script>
/* ============ 数据 ============ */
const ROLES={
 rose:{n:'白蔷薇',camp:'w',mk:'✿',d:'你是仪式的核心。你的身份牌必须被安全献祭，白蔷薇阵营才可能获胜；一旦它被血刃命中，本局立刻落败。'},
 bishop:{n:'司教',camp:'w',mk:'✞',d:'你引导信者走向祭坛。夜晚你与另外三人相认，但不知谁是同伴、谁是刀刃。'},
 flower:{n:'信者',camp:'w',mk:'❀',d:'你什么也不知道。用花苞填满祭坛，并想办法让白蔷薇活着走完仪式。'},
 greatblade:{n:'巨刃',camp:'r',mk:'†',d:'你混在相认的四人之中。只要有一张血刃牌落桌，当轮所有花苞都会被斩杀。'},
 twinblade:{n:'双刃',camp:'r',mk:'‡',d:'你与巨刃在夜里彼此确认，也同时暴露在白蔷薇与司教眼前——四个人，两白两红。'},
 darkblade:{n:'暗刃',camp:'r',mk:'☠',d:'你独自潜伏，夜晚不睁眼，谁也不认识你。你的牌同样能让整轮献祭化为血泊。'}
};
const CARDS={
 rose:{n:'白蔷薇',camp:'w',mk:'✿',cap:'花苞'},
 bishop:{n:'司教',camp:'w',mk:'✞',cap:'花苞'},
 flower:{n:'信者',camp:'w',mk:'❀',cap:'花苞'},
 greatblade:{n:'巨刃',camp:'r',mk:'†',cap:'血刃'},
 twinblade:{n:'双刃',camp:'r',mk:'‡',cap:'血刃'},
 darkblade:{n:'暗刃',camp:'r',mk:'☠',cap:'血刃'},
 ghost:{n:'幽魂',camp:'g',mk:'☾',cap:'无效果'}
};
const EFF={
 1:{n:'净化之光',d:'本回合若没有血刃牌出现，献祭的花苞额外 +1。',t:0},
 2:{n:'亡魂低语',d:'指定 1 名玩家，他获得 1 张幽魂牌。',t:1},
 3:{n:'窥探之眼',d:'指定 1 名玩家，你私下看到他手中的 1 张随机牌。',t:1},
 4:{n:'圣光庇护',d:'你本回合必须出牌；你打出的牌不会被斩杀，被血刃命中时直接弃置。',t:0},
 5:{n:'加倍献祭',d:'本回合献祭成功的花苞数量翻倍。',t:0},
 6:{n:'血色标记',d:'指定 1 名玩家，公开他手中的 1 张随机牌，全场可见。',t:1},
 7:{n:'暗刃启示',d:'暗刃私下得知白蔷薇与司教两人的名字，但不知谁是谁。',t:0},
 8:{n:'信仰试炼',d:'指定 1 名玩家，他本回合必须出牌，不能停手。',t:1},
 9:{n:'圣鉴',d:'指定 1 名玩家，司教私下得知他属于哪个阵营。',t:1},
 10:{n:'净化仪式',d:'所有玩家各弃掉 1 张幽魂牌（若手中有）。',t:0},
 11:{n:'血刃狂宴',d:'本回合若出现血刃牌，斩杀的花苞额外 +1。',t:0},
 12:{n:'蔷薇预言',d:'白蔷薇私下得知 1 名随机血刃阵营玩家。',t:0}
};
const SETUP={
 5:['rose','bishop','flower','greatblade','twinblade'],
 6:['rose','bishop','flower','flower','greatblade','twinblade'],
 7:['rose','bishop','flower','flower','greatblade','twinblade','darkblade'],
 8:['rose','bishop','flower','flower','flower','greatblade','twinblade','darkblade'],
 9:['rose','bishop','flower','flower','flower','flower','greatblade','twinblade','darkblade'],
 10:['rose','bishop','flower','flower','flower','flower','greatblade','twinblade','darkblade','darkblade']
};
const defTargets=n=>({sac:n-2,kill:Math.ceil(n/2)});

/* ============ 存储 ============ */
const has=()=>!!(window.storage&&window.storage.get);
async function sget(k,sh=true){try{const r=await window.storage.get(k,sh);return r?JSON.parse(r.value):null}catch(e){return null}}
async function sset(k,v,sh=true){try{const r=await window.storage.set(k,JSON.stringify(v),sh);return !!r}catch(e){return false}}
async function slist(p,sh=true){try{const r=await window.storage.list(p,sh);return (r&&r.keys)||[]}catch(e){return []}}
const K={st:c=>`br:${c}:state`,p:(c,i)=>`br:${c}:p:${i}`,s:(c,i)=>`br:${c}:s:${i}`,z:c=>`br:${c}:z`,me:c=>`br:me:${c}`};

/* ============ 工具 ============ */
const rid=()=>Math.random().toString(36).slice(2,10);
const rcode=()=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ';let s='';for(let i=0;i<4;i++)s+=A[Math.floor(Math.random()*A.length)];return s};
function shuf(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nameOf=(st,id)=>{const p=st.players.find(x=>x.id===id);return p?p.name:'？'};

/* ============ 客户端状态 ============ */
const S={code:null,pid:null,name:'',isHost:false,st:null,sec:null,secV:-1,seq:0,timer:null,lastSig:'',busy:false,pile:null};
const UI={screen:'home',err:'',sel:null,confirm:null,sheet:null,hold:false};
const el=()=>document.getElementById('app');

/* ============ 渲染 ============ */
function render(){
  const st=S.st;
  let h='';
  if(UI.screen==='home') h=vHome();
  else if(!st) h=`<div class="panel center"><div class="muted">正在连接房间…</div></div>`;
  else if(st.phase==='lobby') h=vLobby(st);
  else if(st.phase==='night') h=vNight(st);
  else if(st.phase==='over') h=vOver(st);
  else h=vDay(st);
  el().innerHTML=h;
  document.getElementById('sheet').innerHTML=UI.sheet?vSheet():'';
  bind();
}
function head(st){
  return `<div class="eyebrow">房间 ${st.code} · ${st.players.length}人 · 第 ${st.round}/${st.maxRound} 轮</div>`;
}
function altar(st){
  const P=(n,t,c)=>{let s='';for(let i=0;i<t;i++)s+=`<span class="pip ${i<n?'on':''}"></span>`;return s};
  return `<div class="altar">
   <div class="track w"><div class="k">祭坛 · 献祭</div><div class="v">${st.b.sac}<small> / ${st.cfg.sac}</small></div>
     <div class="pips">${P(st.b.sac,st.cfg.sac)}</div></div>
   <div class="track r"><div class="k">血池 · 斩杀</div><div class="v">${st.b.kill}<small> / ${st.cfg.kill}</small></div>
     <div class="pips">${P(st.b.kill,st.cfg.kill)}</div></div></div>
   <div class="tiny center">${st.b.roseSac?'✿ 白蔷薇已安全献祭':'白蔷薇尚未安全献祭 — 献祭数达标也无法获胜'}</div>`;
}
function vHome(){
  return `<div class="eyebrow">隐藏身份 · 阵营推理 · 5–10 人</div>
  <h1 class="title">血与刃的<br><span class="b">白蔷薇</span></h1>
  <div class="sub">一人开房，其余人输入房号加入。身份、手牌、私密情报只出现在各自的手机上，桌面上永远只看得到「谁出了牌」。</div>
  <div class="panel">
    <label>你的名字</label><input id="nm" maxlength="8" placeholder="桌上叫你什么" value="${esc(S.name)}">
    <button class="primary" data-a="create">开一间新房</button>
    <div class="rule"></div>
    <label>房间号</label><input id="cd" class="code" maxlength="4" placeholder="ABCD">
    <button data-a="join">加入房间</button>
    <div class="err">${esc(UI.err)}</div>
  </div>
  <div class="link" data-a="rules">查看规则</div>`;
}
function vLobby(st){
  const me=st.players.find(p=>p.id===S.pid);
  const n=st.players.length, ok=n>=5&&n<=10;
  return `${head(st)}<h1 class="title">聚 集</h1>
  <div class="panel"><div class="tiny center">把这个房间号念给大家</div><div class="code-big">${st.code}</div></div>
  <div class="panel">
    <div class="eyebrow">在场 ${n} 人</div>
    <div class="plist">${st.players.map((p,i)=>`<div class="pl"><span class="seat">${i+1}</span>
      <span class="nm">${esc(p.name)}${p.id===S.pid?' · 你':''}</span>
      ${p.id===st.host?'<span class="tag">房主</span>':''}</div>`).join('')}</div>
    ${!me?'<div class="muted" style="margin-top:10px">正在入座…</div>':''}
  </div>
  ${S.isHost?`<div class="panel">
    <div class="eyebrow">本局配置</div>
    <div class="muted">${ok?`${n} 人：${campLine(n)}<br>白方需献祭 <b>${defTargets(n).sac}</b> 朵花苞并让白蔷薇安全落桌；红方斩杀 <b>${defTargets(n).kill}</b> 朵花苞即胜。共 ${n} 轮。`:'需要 5–10 人才能开始。'}</div>
    <button class="primary" data-a="start" ${ok?'':'disabled'}>开始仪式</button></div>`
   :`<div class="panel center muted">等房主开始</div>`}
  <div class="link" data-a="rules">查看规则</div>`;
}
function campLine(n){
  const c={};SETUP[n].forEach(r=>c[r]=(c[r]||0)+1);
  return Object.keys(c).map(k=>`${ROLES[k].n}${c[k]>1?'×'+c[k]:''}`).join('、');
}
function idCard(role){
  const R=ROLES[role];
  return `<div class="idcard ${UI.hold?'open':''}" id="idc">
    <div class="idname ${R.camp==='w'?'w-txt':'r-txt'}">${R.mk} ${R.n}</div>
    <div class="idcamp ${R.camp==='w'?'w-txt':'r-txt'}">${R.camp==='w'?'白蔷薇阵营':'血刃阵营'}</div>
    <div class="desc">${R.d}</div>
    <div class="veil"><div class="lock">按 住 显 形</div><div class="hint">松手即隐去</div></div>
  </div>`;
}
function vNight(st){
  if(!S.sec) return `${head(st)}<div class="panel center muted">正在发牌…</div>`;
  const R=ROLES[S.sec.role];
  const ready=st.ready&&st.ready[S.pid];
  const cnt=Object.keys(st.ready||{}).length;
  return `${head(st)}<h1 class="title">入 夜</h1>
  <div class="sub">四个人在黑暗里睁开了眼——两朵蔷薇，两把刀。</div>
  ${idCard(S.sec.role)}
  ${S.sec.night?`<div class="note"><b>相认名单</b><br>${S.sec.night.map(esc).join('、')}<br>
    <span style="color:var(--ash)">这四人中两人属白、两人属红，包括你在内。谁是谁，得靠今晚剩下的时间去猜。</span></div>`
   :`<div class="note">你没有睁眼。除了自己的手牌，你一无所知。</div>`}
  <div class="panel"><div class="eyebrow">你的白水晶</div>
    <div class="muted">编号 <b style="color:var(--sanct);font-size:18px">${S.sec.crystal}</b> — <b>${EFF[S.sec.crystal].n}</b><br>${EFF[S.sec.crystal].d}</div>
    <div class="tiny" style="margin-top:8px">被奉献硬币持有者选中时，这枚水晶会公开并强制发动。</div></div>
  <div class="panel"><div class="eyebrow">手牌 3 张</div>${hand(S.sec.hand,false)}</div>
  <button class="primary" data-a="ready" ${ready?'disabled':''}>${ready?`已就绪（${cnt}/${st.players.length}）`:'我记住了'}</button>
  <div class="link" data-a="rules">查看规则</div>`;
}
function hand(h,pick){
  return `<div class="hand">${h.map((c,i)=>{const C=CARDS[c];
    return `<div class="card ${C.camp} ${UI.sel===i?'sel':''}" ${pick?`data-a="pickcard" data-i="${i}"`:''}>
      <div class="mk">${C.mk}</div><div>${C.n}</div><div class="cap">${C.cap}</div></div>`}).join('')}
    ${h.length===0?'<div class="muted" style="padding:20px 0">手牌已空</div>':''}</div>`;
}
function vDay(st){
  let h=head(st)+altar(st);
  const coinN=nameOf(st,st.coin);
  h+=`<div class="panel"><div class="eyebrow">奉献硬币</div><div class="muted">${esc(coinN)}${st.coin===S.pid?' · 你':''} 持有硬币，由他开启本回合。</div></div>`;

  if(st.phase==='pick'){
    h+=`<h2 class="title" style="font-size:22px">翻 开 水 晶</h2>`;
    if(st.coin===S.pid){
      const cand=st.players.filter(p=>!st.used.includes(p.id));
      h+=`<div class="muted" style="margin-top:8px">选 1 名尚未用过水晶的玩家，强制翻开他的白水晶。</div>
      <div class="pick">${cand.map(p=>`<button data-a="pick" data-id="${p.id}">${esc(p.name)}${p.id===S.pid?'（你）':''}</button>`).join('')}</div>`;
    } else h+=`<div class="panel center muted">等待 ${esc(coinN)} 选人…</div>`;
  }

  if(st.phase==='effect'||st.phase==='play'||st.phase==='reveal'){
    const E=EFF[st.cry.num];
    h+=`<div class="crystal"><div class="num">${st.cry.num}</div><div class="nm">${E.n}</div>
      <div class="ds">${E.d}</div><div class="tiny" style="margin-top:8px">来自 ${esc(nameOf(st,st.cry.owner))} 的白水晶</div></div>`;
  }
  if(st.phase==='effect'){
    if(st.cry.owner===S.pid){
      h+=`<div class="muted" style="margin-top:12px">选择目标：</div>
      <div class="pick">${st.players.map(p=>`<button data-a="target" data-id="${p.id}">${esc(p.name)}${p.id===S.pid?'（你）':''}</button>`).join('')}</div>`;
    } else h+=`<div class="panel center muted">等待 ${esc(nameOf(st,st.cry.owner))} 指定目标…</div>`;
  }

  if(st.phase==='play'){
    const cur=st.order[st.turn];
    h+=`<div class="panel"><div class="eyebrow">出牌 · 顺时针</div><div class="plist">${st.order.map(id=>{
      const a=st.acted[id];
      const t=a==='play'?'<span class="tag ok">已出牌</span>':a==='pass'?'<span class="tag done">停手</span>':
        id===cur?'<span class="tag turn">思考中</span>':'<span class="tag">等待</span>';
      return `<div class="pl"><span class="nm">${esc(nameOf(st,id))}${id===S.pid?' · 你':''}</span>
        <span class="tag">${st.hc[id]}张</span>${t}</div>`}).join('')}</div></div>`;
    if(cur===S.pid&&S.sec){
      const must=st.force===S.pid||st.cry.num===4&&st.cry.owner===S.pid;
      h+=`<div class="panel"><div class="eyebrow">轮到你${must?' · 必须出牌':''}</div>
        ${hand(S.sec.hand,true)}
        <div class="tiny" style="margin-top:10px">打出的牌会与其他人的牌混洗后一起翻开，没人知道哪张是谁的。</div>
        ${must?'':'<button class="ghost" data-a="pass">停手（不出牌）</button>'}</div>`;
    } else h+=`<div class="panel center muted">等待 ${esc(nameOf(st,cur))} 出牌…</div>`;
  }

  if(st.phase==='reveal'){
    const r=st.lastR;
    h+=`<div class="verdict ${r.blades>0?'r-txt':'w-txt'}">${r.blades>0?'刀 光 落 下':'花 苞 升 天'}</div>
    <div class="reveal">${r.cards.map((c,i)=>{const C=CARDS[c];
      return `<div class="rc ${C.camp}" style="animation-delay:${i*90}ms"><div style="font-size:19px">${C.mk}</div>${C.n}</div>`}).join('')||'<div class="muted">无人出牌</div>'}</div>
    <div class="center muted">${esc(r.text)}</div>
    <button class="primary" data-a="next">继续</button>`;
  }

  h+=notes()+logbox(st);
  h+=`<div class="link" data-a="rules">查看规则</div>`;
  if(UI.confirm!==null&&S.sec){
    const C=CARDS[S.sec.hand[UI.confirm]];
    h+=`<div class="panel" style="border-color:var(--gold)"><div class="center" style="font-family:var(--serif);font-size:19px;letter-spacing:.12em">打出「${C.n}」？</div>
    <div class="row" style="margin-top:12px"><button data-a="cancel" class="ghost">再想想</button><button class="gold" data-a="playcard">确认打出</button></div></div>`;
  }
  return h;
}
function notes(){
  if(!S.sec||!S.sec.notes||!S.sec.notes.length) return '';
  return `<div class="panel"><div class="eyebrow">只有你能看到的情报</div>
   ${S.sec.notes.slice().reverse().map(n=>`<div class="note">${n}</div>`).join('')}</div>`;
}
function logbox(st){
  if(!st.log||!st.log.length) return '';
  return `<div class="panel"><div class="eyebrow">祭典记录</div>
   <div class="logbox">${st.log.slice().reverse().map(l=>`<div>${l}</div>`).join('')}</div></div>`;
}
function vOver(st){
  const w=st.winner==='w';
  return `${head(st)}<h1 class="title" style="font-size:26px">${w?'<span class="w-txt">白蔷薇阵营获胜</span>':'<span class="b">血刃阵营获胜</span>'}</h1>
  <div class="sub">${esc(st.reason)}</div>${altar(st)}
  <div class="panel"><div class="eyebrow">身份公开</div><div class="plist">${st.players.map(p=>{
    const r=ROLES[(st.reveal||{})[p.id]]||{n:'？',camp:'g',mk:'?'};
    return `<div class="pl"><span class="nm">${esc(p.name)}</span>
      <span class="tag ${r.camp==='w'?'ok':''}" style="${r.camp==='r'?'color:var(--blood);border-color:var(--blood-d)':''}">${r.mk} ${r.n}</span></div>`}).join('')}</div></div>
  ${logbox(st)}
  ${S.isHost?'<button class="primary" data-a="again">再来一局（同样的人）</button>':'<div class="panel center muted">等房主再开一局</div>'}
  <div class="link" data-a="rules">查看规则</div>`;
}
function vSheet(){
  return `<div class="sheet"><div class="inner">
  <h1 class="title" style="font-size:24px">规 则</h1>
  <h3>阵营与胜利</h3>
  <p><b>白蔷薇阵营</b>（白蔷薇 / 司教 / 信者）：让白蔷薇的身份牌被<b>安全献祭</b>，并把足够数量的花苞送上祭坛。</p>
  <p><b>血刃阵营</b>（巨刃 / 双刃 / 暗刃）：斩杀白蔷薇牌立刻获胜；或斩杀足够数量的花苞；或撑到仪式结束时白方仍未达标。</p>
  <h3>夜晚</h3>
  <p>白蔷薇、司教、巨刃、双刃互相确认——四个人彼此看见，但不知道谁是谁。暗刃与信者不睁眼。</p>
  <h3>每一回合</h3>
  <ul><li>奉献硬币的持有者，指定一名尚未用过水晶的玩家。</li>
  <li>那枚白水晶公开翻开，强制发动对应编号的魔法，不能放弃。</li>
  <li>从硬币持有者开始，顺时针依次决定：打出 1 张牌，或停手。所有人都看得见谁出了牌、谁没出，但看不见出的是什么。</li>
  <li>所有打出的牌混洗后一起翻开。只要出现<b>任意一张血刃牌</b>，本轮所有花苞被斩杀；一张血刃牌都没有，则全部献祭成功。幽魂牌不产生任何效果，只是烟雾。</li>
  <li>硬币传给下一位还有水晶的玩家。所有水晶用完，仪式结束。</li></ul>
  <h3>手牌</h3>
  <p>每人 3 张：你的<b>身份牌</b>、1 张<b>信者牌</b>、1 张<b>幽魂牌</b>。红方手里也有信者牌——打出去能博取信任，但真的会帮白方填满祭坛。</p>
  <h3>白水晶魔法书</h3>
  <p>${Object.keys(EFF).map(k=>`<b>${k} ${EFF[k].n}</b>　${EFF[k].d}`).join('<br>')}</p>
  <h3>与实体版的差异</h3>
  <p>这个版本省略了双刃的换牌动作与骰子，胜利数值由房主可见的配置表给出，用于替代实体版的图板刻度。规则骨架与实体版一致，具体数值可按你们的手感调整。</p>
  <button data-a="closesheet">关闭</button>
  </div></div>`;
}

/* ============ 交互 ============ */
function bind(){
  document.querySelectorAll('[data-a]').forEach(n=>n.onclick=()=>go(n.dataset.a,n.dataset));
  const c=document.getElementById('idc');
  if(c){
    const on=()=>{UI.hold=true;c.classList.add('open')},off=()=>{UI.hold=false;c.classList.remove('open')};
    c.addEventListener('pointerdown',e=>{e.preventDefault();on()});
    ['pointerup','pointercancel','pointerleave'].forEach(t=>c.addEventListener(t,off));
  }
}
async function go(a,d){
  if(S.busy&&['create','join','start'].includes(a))return;
  if(a==='rules'){UI.sheet=1;render();return}
  if(a==='closesheet'){UI.sheet=null;render();return}
  if(a==='cancel'){UI.confirm=null;UI.sel=null;render();return}
  if(a==='pickcard'){UI.sel=+d.i;UI.confirm=+d.i;render();return}
  if(a==='create')return createRoom();
  if(a==='join')return joinRoom();
  if(a==='ready')return act('ready',{});
  if(a==='start')return act('start',{});
  if(a==='pick')return act('pick',{id:d.id});
  if(a==='target')return act('target',{id:d.id});
  if(a==='pass')return act('play',{i:-1});
  if(a==='playcard'){const i=UI.confirm;UI.confirm=null;UI.sel=null;render();return act('play',{i})}
  if(a==='next')return act('next',{});
  if(a==='again')return act('again',{});
}
async function act(type,payload){
  if(!S.st)return;
  S.seq++;
  await sset(K.p(S.code,S.pid),{name:S.name,seq:S.seq,act:{type,payload,round:S.st.round}});
  if(S.isHost){await hostTick();await pullSecret(true)}
  render();
}

/* ============ 建/入房 ============ */
function readName(){const v=(document.getElementById('nm')||{}).value||'';return v.trim().slice(0,8)}
async function createRoom(){
  if(!has()){UI.err='这个环境不支持联机存储，无法开房。';render();return}
  const nm=readName(); if(!nm){UI.err='先写个名字。';render();return}
  S.busy=true;S.name=nm;
  let code=rcode();
  for(let i=0;i<5;i++){if(!(await sget(K.st(code))))break;code=rcode()}
  S.code=code;S.pid=rid();S.isHost=true;
  const st={code,host:S.pid,phase:'lobby',players:[{id:S.pid,name:nm}],round:0,maxRound:0,
    cfg:defTargets(5),b:{sac:0,kill:0,roseSac:false},log:[],seen:{},ready:{},sv:{},hc:{},
    used:[],order:[],turn:0,acted:{},coin:null,cry:null,force:null,lastR:null,winner:null,reason:'',reveal:null,beat:Date.now()};
  S.st=st;
  await sset(K.p(code,S.pid),{name:nm,seq:0,act:null});
  await sset(K.st(code),st);
  await sset(K.me(code),{pid:S.pid,name:nm},false);
  UI.screen='room';S.busy=false;startPoll();render();
}
async function joinRoom(){
  if(!has()){UI.err='这个环境不支持联机存储，无法加入。';render();return}
  const nm=readName(); const cd=((document.getElementById('cd')||{}).value||'').trim().toUpperCase();
  if(!nm){UI.err='先写个名字。';render();return}
  if(cd.length!==4){UI.err='房间号是 4 个字母。';render();return}
  S.busy=true;
  const st=await sget(K.st(cd));
  if(!st){UI.err='找不到这个房间，检查一下房号。';S.busy=false;render();return}
  const mine=await sget(K.me(cd),false);
  S.code=cd;S.name=nm;
  if(mine&&st.players.some(p=>p.id===mine.pid)){S.pid=mine.pid}
  else{
    if(st.phase!=='lobby'){UI.err='这局已经开始了，等下一局吧。';S.busy=false;render();return}
    if(st.players.length>=10){UI.err='房间已满（10 人）。';S.busy=false;render();return}
    S.pid=rid();
  }
  S.isHost=(st.host===S.pid);
  await sset(K.p(cd,S.pid),{name:nm,seq:0,act:null});
  await sset(K.me(cd),{pid:S.pid,name:nm},false);
  S.st=st;UI.screen='room';S.busy=false;startPoll();render();
}

/* ============ 轮询 ============ */
function startPoll(){clearInterval(S.timer);S.timer=setInterval(tick,1800);tick()}
async function tick(){
  if(S.isHost) await hostTick();
  else{const st=await sget(K.st(S.code)); if(st) S.st=st}
  await pullSecret(false);
  const sig=JSON.stringify(S.st)+JSON.stringify(S.sec)+UI.confirm+UI.sel;
  if(sig!==S.lastSig){S.lastSig=sig;render()}
}
async function pullSecret(force){
  if(!S.st||!S.st.sv)return;
  const v=S.st.sv[S.pid];
  if(v===undefined)return;
  if(force||v!==S.secV){const s=await sget(K.s(S.code,S.pid));if(s){S.sec=s;S.secV=v}}
}

/* ============ 房主逻辑 ============ */
async function hostTick(){
  const st=S.st; if(!st)return;
  st.beat=Date.now();
  let ch=false;
  if(['lobby','night','reveal','over'].includes(st.phase)){ch=await scanAll()||ch}
  else{
    const actor=st.phase==='pick'?st.coin:st.phase==='effect'?st.cry.owner:st.order[st.turn];
    if(actor)ch=await pull(actor)||ch;
  }
  if(ch||Date.now()-(S._lw||0)>5000){await sset(K.st(S.code),st);S._lw=Date.now()}
}
async function scanAll(){
  const keys=await slist(`br:${S.code}:p:`);let ch=false;
  for(const k of keys){
    const pid=k.split(':').pop();
    const d=await sget(k); if(!d)continue;
    if(S.st.phase==='lobby'&&!S.st.players.some(p=>p.id===pid)&&S.st.players.length<10){
      S.st.players.push({id:pid,name:d.name||'玩家'});ch=true;
    }
    if(await handle(pid,d))ch=true;
  }
  return ch;
}
async function pull(pid){const d=await sget(K.p(S.code,pid));return d?await handle(pid,d):false}
async function handle(pid,d){
  const st=S.st;
  if(!d.act||!d.seq)return false;
  if((st.seen[pid]||0)>=d.seq)return false;
  st.seen[pid]=d.seq;
  const {type,payload}=d.act;
  try{
    if(type==='ready'&&st.phase==='night'){st.ready[pid]=true;
      if(st.players.every(p=>st.ready[p.id]))await beginRound();}
    else if(type==='start'&&st.phase==='lobby'&&pid===st.host)await deal();
    else if(type==='pick'&&st.phase==='pick'&&pid===st.coin)await revealCrystal(payload.id);
    else if(type==='target'&&st.phase==='effect'&&pid===st.cry.owner)await applyEffect(payload.id);
    else if(type==='play'&&st.phase==='play'&&st.order[st.turn]===pid)await doPlay(pid,payload.i);
    else if(type==='next'&&st.phase==='reveal')await afterReveal();
    else if(type==='again'&&st.phase==='over'&&pid===st.host)await reset();
  }catch(e){console.error(e)}
  return true;
}
async function setSec(pid,fn){
  const s=await sget(K.s(S.code,pid))||{};fn(s);
  await sset(K.s(S.code,pid),s);
  S.st.sv[pid]=(S.st.sv[pid]||0)+1;
  S.st.hc[pid]=(s.hand||[]).length;
  if(pid===S.pid){S.sec=s;S.secV=S.st.sv[pid]}
}
async function note(pid,txt){await setSec(pid,s=>{s.notes=s.notes||[];s.notes.push(`第${S.st.round}轮 · ${txt}`)})}
function log(t){S.st.log.push(`第${S.st.round}轮　${t}`)}

async function deal(){
  const st=S.st,n=st.players.length;
  if(n<5||n>10)return;
  const roles=shuf(SETUP[n]),nums=shuf([1,2,3,4,5,6,7,8,9,10,11,12]).slice(0,n);
  st.assign={};st.players.forEach((p,i)=>st.assign[p.id]=roles[i]);
  const four=st.players.filter(p=>['rose','bishop','greatblade','twinblade'].includes(st.assign[p.id]));
  const fourNames=shuf(four.map(p=>p.name));
  for(let i=0;i<n;i++){
    const p=st.players[i],r=roles[i];
    const sec={role:r,hand:[r,'flower','ghost'],crystal:nums[i],notes:[],
      night:['rose','bishop','greatblade','twinblade'].includes(r)?fourNames:null};
    await sset(K.s(S.code,p.id),sec);
    st.sv[p.id]=1;st.hc[p.id]=3;
    if(p.id===S.pid){S.sec=sec;S.secV=1}
  }
  st.crystals={};st.players.forEach((p,i)=>st.crystals[p.id]=nums[i]);
  st.cfg=defTargets(n);st.maxRound=n;st.round=0;st.used=[];st.ready={};
  st.b={sac:0,kill:0,roseSac:false};st.log=[];st.phase='night';
  st.coin=st.players[Math.floor(Math.random()*n)].id;
  await sset(K.z(S.code),{pile:[]});
}
async function beginRound(){
  const st=S.st;
  st.round++;st.phase='pick';st.acted={};st.force=null;st.turn=0;st.lastR=null;
  await sset(K.z(S.code),{pile:[]});
}
async function revealCrystal(target){
  const st=S.st;
  if(!st.players.some(p=>p.id===target)||st.used.includes(target))return;
  const num=st.crystals[target];
  st.cry={owner:target,num};st.used.push(target);
  log(`${nameOf(st,st.coin)} 选中 ${nameOf(st,target)}，翻开白水晶 ${num}「${EFF[num].n}」`);
  if(EFF[num].t){st.phase='effect'}else{await applyEffect(null)}
}
async function applyEffect(target){
  const st=S.st,num=st.cry.num,owner=st.cry.owner;
  const roleOf=id=>st.assign[id];
  const pickRandCard=async id=>{const s=await sget(K.s(S.code,id));const h=(s&&s.hand)||[];
    return h.length?h[Math.floor(Math.random()*h.length)]:null};
  if(num===2&&target){await setSec(target,s=>s.hand.push('ghost'));log(`${nameOf(st,target)} 获得 1 张幽魂牌`)}
  if(num===3&&target){const c=await pickRandCard(target);
    await note(owner,c?`你窥探到 <b>${nameOf(st,target)}</b> 手中有一张 <b>${CARDS[c].n}</b>。`:`<b>${nameOf(st,target)}</b> 手中已无牌。`);
    log(`${nameOf(st,owner)} 窥探了 ${nameOf(st,target)}`)}
  if(num===6&&target){const c=await pickRandCard(target);
    log(c?`公开：${nameOf(st,target)} 手中有一张「${CARDS[c].n}」`:`${nameOf(st,target)} 手中已无牌`)}
  if(num===7){const d=st.players.find(p=>roleOf(p.id)==='darkblade');
    if(d){const two=shuf(st.players.filter(p=>['rose','bishop'].includes(roleOf(p.id))).map(p=>p.name));
      await note(d.id,`启示：<b>${two.join('</b> 与 <b>')}</b> 分别是白蔷薇与司教（次序随机）。`);
      log('暗刃收到了启示')}else log('场上没有暗刃，启示落空')}
  if(num===8&&target){st.force=target;log(`${nameOf(st,target)} 本回合必须出牌`)}
  if(num===9&&target){const b=st.players.find(p=>roleOf(p.id)==='bishop');
    if(b){await note(b.id,`圣鉴：<b>${nameOf(st,target)}</b> 属于 <b>${ROLES[roleOf(target)].camp==='w'?'白蔷薇阵营':'血刃阵营'}</b>。`);
      log(`司教圣鉴了 ${nameOf(st,target)}`)}else log('场上没有司教，圣鉴落空')}
  if(num===10){let c=0;for(const p of st.players){const s=await sget(K.s(S.code,p.id));
      if(s&&s.hand.includes('ghost')){await setSec(p.id,x=>{x.hand.splice(x.hand.indexOf('ghost'),1)});c++}}
    log(`净化仪式：${c} 张幽魂牌被弃置`)}
  if(num===12){const w=st.players.find(p=>roleOf(p.id)==='rose');
    const reds=st.players.filter(p=>ROLES[roleOf(p.id)].camp==='r');
    if(w&&reds.length){const r=reds[Math.floor(Math.random()*reds.length)];
      await note(w.id,`预言：<b>${r.name}</b> 属于血刃阵营。`);log('白蔷薇得到了预言')}}
  if(num===4)st.force=owner;
  st.phase='play';
  const idx=st.players.findIndex(p=>p.id===st.coin);
  st.order=st.players.map((_,i)=>st.players[(idx+i)%st.players.length].id);
  st.turn=0;st.acted={};
  await advance();
}
async function advance(){
  const st=S.st;
  while(st.turn<st.order.length){
    const id=st.order[st.turn];
    if((st.hc[id]||0)===0&&st.force!==id){st.acted[id]='pass';st.turn++;continue}
    return;
  }
  await doReveal();
}
async function doPlay(pid,i){
  const st=S.st;
  const s=await sget(K.s(S.code,pid));if(!s)return;
  const must=st.force===pid;
  if(i<0){if(must&&s.hand.length)return;st.acted[pid]='pass'}
  else{
    if(i>=s.hand.length)return;
    const card=s.hand[i];
    const z=await sget(K.z(S.code))||{pile:[]};
    z.pile.push({o:pid,c:card});await sset(K.z(S.code),z);
    await setSec(pid,x=>x.hand.splice(i,1));
    st.acted[pid]='play';
  }
  st.turn++;await advance();
}
async function doReveal(){
  const st=S.st;
  const z=await sget(K.z(S.code))||{pile:[]};
  const pile=shuf(z.pile);
  const blades=pile.filter(x=>CARDS[x.c].camp==='r').length;
  const prot=st.cry.num===4?st.cry.owner:null;
  let buds=0,roseHit=false,roseSafe=false,discarded=0;
  for(const x of pile){
    if(CARDS[x.c].camp!=='w')continue;
    const shielded=(x.o===prot);
    if(blades>0){ if(shielded){discarded++;continue} buds++; if(x.c==='rose')roseHit=true }
    else{ buds++; if(x.c==='rose')roseSafe=true }
  }
  let bonus=0,text='';
  if(blades>0){
    if(st.cry.num===11&&buds>0)bonus=1;
    st.b.kill+=buds+bonus;
    text=`${blades} 张血刃落桌，${buds+bonus} 朵花苞被斩杀。`+(bonus?'（血刃狂宴 +1）':'')+(discarded?`圣光庇护了 ${discarded} 张牌。`:'');
  }else{
    let g=buds; if(st.cry.num===1&&buds>0)g=buds+1; if(st.cry.num===5)g=g*2;
    st.b.sac+=g;
    text=`没有血刃。${g} 朵花苞升上祭坛。`+(st.cry.num===1&&buds>0?'（净化之光 +1）':'')+(st.cry.num===5?'（加倍献祭）':'');
    if(roseSafe)st.b.roseSac=true;
  }
  if(roseSafe)text+=' 白蔷薇安全落桌。';
  if(roseHit)text+=' 白蔷薇被刀刃命中。';
  st.lastR={cards:pile.map(x=>x.c),blades,text};
  log(text);
  st.phase='reveal';
  await sset(K.z(S.code),{pile:[]});
  if(roseHit)return end('r','刀刃在混乱中命中了白蔷薇，仪式在血泊里中止。');
  if(st.b.kill>=st.cfg.kill)return end('r',`血池已满 —— ${st.b.kill} 朵花苞被斩杀，祭典无以为继。`);
  if(st.b.roseSac&&st.b.sac>=st.cfg.sac)return end('w',`白蔷薇安然献出，${st.b.sac} 朵花苞点亮祭坛，母亲苏醒。`);
}
async function afterReveal(){
  const st=S.st;
  if(st.winner)return;
  if(st.used.length>=st.players.length){
    if(st.b.roseSac&&st.b.sac>=st.cfg.sac)return end('w','仪式在最后一刻完成。');
    return end('r',`水晶耗尽，白蔷薇阵营只献祭了 ${st.b.sac} 朵花苞${st.b.roseSac?'':'，且白蔷薇始终未能安全落桌'}。`);
  }
  const idx=st.players.findIndex(p=>p.id===st.coin);
  for(let i=1;i<=st.players.length;i++){
    const c=st.players[(idx+i)%st.players.length];
    if(!st.used.includes(c.id)){st.coin=c.id;break}
  }
  await beginRound();
}
function end(w,reason){
  const st=S.st;st.winner=w;st.reason=reason;st.phase='over';st.reveal=st.assign;
  st.log.push(`—— ${w==='w'?'白蔷薇阵营获胜':'血刃阵营获胜'} ——`);
}
async function reset(){
  const st=S.st;
  st.phase='lobby';st.round=0;st.b={sac:0,kill:0,roseSac:false};st.log=[];st.used=[];
  st.acted={};st.ready={};st.cry=null;st.lastR=null;st.winner=null;st.reason='';st.reveal=null;st.assign=null;
  st.sv={};st.hc={};S.sec=null;S.secV=-1;
}

/* ============ 启动 ============ */
render();
</script>
