(function(global){
'use strict';
const DEFAULT_THRESHOLD=0.58;
const DEFAULT_MARGIN=0.07;
const STOP=new Set(['a','o','as','os','um','uma','uns','umas','de','da','do','das','dos','em','no','na','nos','nas','para','pra','pro','por','com','sem','e','ou','que','qual','quais','voce','voces','eu','me','meu','minha','esse','essa','este','esta','isso','ai','aqui','la','tem']);
const PHRASES=[
  [/\bs\s*\.?\s*p\.?\b/g,'sao paulo'],
  [/\b(?:voces?\s+)?(?:entregam?|enviam?|mandam?)\b/g,'entrega'],
  [/\b(?:manda|envia)\b/g,'entrega'],
  [/\b(?:demora\s+para\s+chegar|tempo\s+para\s+chegar|quanto\s+tempo\s+demora|quando\s+chega)\b/g,'prazo entrega'],
  [/\b(?:demora|demorar|prazo)\b/g,'prazo'],
  [/\b(?:gratuito|gratuita|gratis)\b/g,'gratis'],
  [/\b(?:custa|custar|custo|valor)\b/g,'custo'],
  [/\b(?:todo\s+o\s+brasil|todo\s+brasil|brasil\s+inteiro)\b/g,'brasil']
];
function normalize(value){
  let s=String(value==null?'':value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  s=s.replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  for(const [re,to] of PHRASES)s=s.replace(re,to);
  return s.replace(/\s+/g,' ').trim();
}
function stem(t){
  if(t.length>5){
    t=t.replace(/(mente|coes|cao)$/,'');
    t=t.replace(/(ando|endo|indo)$/,'');
    t=t.replace(/(es|s)$/,'');
  }
  return t;
}
function tokens(value){return normalize(value).split(' ').map(stem).filter(t=>t&&t.length>1&&!STOP.has(t));}
function bigrams(s){s=normalize(s).replace(/\s+/g,' ');const out=[];for(let i=0;i<s.length-1;i++)out.push(s.slice(i,i+2));return out;}
function dice(a,b){if(!a.length&&!b.length)return 1;if(!a.length||!b.length)return 0;const counts=new Map();a.forEach(x=>counts.set(x,(counts.get(x)||0)+1));let hit=0;b.forEach(x=>{const n=counts.get(x)||0;if(n){hit++;counts.set(x,n-1)}});return 2*hit/(a.length+b.length);}
function tokenStats(q,c){
  const qa=tokens(q),ca=tokens(c),used=new Set();let hit=0,soft=0;
  for(const qt of qa){let best=-1,bestScore=0;for(let i=0;i<ca.length;i++){if(used.has(i))continue;const ct=ca[i];const s=qt===ct?1:dice(bigrams(qt),bigrams(ct));if(s>bestScore){bestScore=s;best=i}}if(best>=0&&bestScore>=0.72){used.add(best);hit++;soft+=bestScore}}
  const precision=qa.length?soft/qa.length:0,coverage=ca.length?soft/ca.length:0;
  return{qa,ca,precision,coverage,dice:qa.length+ca.length?2*soft/(qa.length+ca.length):0,hit};
}
function intentTerms(ts){const set=new Set(ts);return ['gratis','custo','prazo','brasil','paulo','tamanho','preco'].filter(x=>set.has(stem(x)));}
function score(query,candidate){
  const nq=normalize(query),nc=normalize(candidate);if(!nq||!nc)return 0;if(nq===nc)return 1;
  const st=tokenStats(nq,nc);if(!st.qa.length||!st.ca.length)return 0;
  const char=dice(bigrams(nq),bigrams(nc));
  let s=.50*st.dice+.25*st.coverage+.15*st.precision+.10*char;
  const qi=intentTerms(st.qa),ci=intentTerms(st.ca);
  if(qi.length&&ci.length&&!qi.some(x=>ci.includes(x)))s*=.62;
  if(st.hit===1&&Math.max(st.qa.length,st.ca.length)>=3)s*=.72;
  if(st.qa.length===1&&st.ca.length>1)s*=.55;
  return Math.max(0,Math.min(1,s));
}
function candidateText(item){return String(item?.question||item?.text||item?.keyword||'');}
function bestMatch(query,candidates,opts={}){
  const threshold=Number.isFinite(opts.threshold)?opts.threshold:DEFAULT_THRESHOLD;
  const margin=Number.isFinite(opts.margin)?opts.margin:DEFAULT_MARGIN;
  const context=opts.context||null;
  const normalized=normalize(query);
  const rows=(Array.isArray(candidates)?candidates:[]).map((item,index)=>({item,index,question:candidateText(item),normalizedQuestion:normalize(candidateText(item)),score:score(query,candidateText(item))})).filter(r=>r.question).sort((a,b)=>b.score-a.score);
  const top=rows[0]||null,second=rows[1]||null;
  const queryTokens=tokens(query);
  let reason='ok',accepted=!!top;
  if(!top){accepted=false;reason='no-candidates';}
  else if(top.normalizedQuestion===normalized){accepted=true;reason='exact';}
  else if(queryTokens.length<2){accepted=false;reason='query-too-generic';}
  else if(top.score<threshold){accepted=false;reason='below-threshold';}
  else if(second&&top.score<.92&&(top.score-second.score)<margin){accepted=false;reason='ambiguous';}
  if(opts.debug!==false&&global.console){
    console.groupCollapsed?.('[ChatShop Q&A] '+String(query));
    console.log('pergunta recebida:',query);
    console.log('pergunta normalizada:',normalized);
    console.log('contexto/produto atual:',context);
    console.table?.(rows.slice(0,3).map(r=>({pergunta:r.question,pontuacao:Number(r.score.toFixed(3))})));
    console.log('resposta escolhida:',accepted?top?.item?.answer||null:null);
    if(!accepted)console.log('motivo do fallback:',reason,'threshold:',threshold);
    console.groupEnd?.();
  }
  return{accepted,match:accepted?top:null,best:top,top3:rows.slice(0,3),threshold,reason,normalized};
}
function selfTest(){
  const q=[
    {question:'Entrega em São Paulo?',answer:'SP'},
    {question:'Entrega em todo o Brasil?',answer:'BR'},
    {question:'Qual o prazo de entrega?',answer:'PRAZO'},
    {question:'Quanto custa o frete?',answer:'CUSTO'},
    {question:'Tem frete grátis?',answer:'GRATIS'}
  ];
  const cases=[['entrega em sp?','SP'],['vocês entregam em são paulo?','SP'],['manda para todo brasil?','BR'],['qual demora para chegar?','PRAZO'],['qual prazo de entrega?','PRAZO'],['quanto é o frete?','CUSTO'],['o frete é grátis?','GRATIS'],['frete',null],['entrega',null]];
  return cases.map(([input,want])=>{const r=bestMatch(input,q,{debug:false});const got=r.accepted?r.match.item.answer:null;return{input,want,got,score:r.best?Number(r.best.score.toFixed(3)):0,reason:r.reason,pass:got===want}});
}
global.ChatShopQnaMatcher={normalize,tokens,score,bestMatch,selfTest,DEFAULT_THRESHOLD};
})(typeof window!=='undefined'?window:globalThis);
