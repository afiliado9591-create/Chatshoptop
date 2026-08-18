const fs = require('fs');
const path = require('path');

const MATCHER_TAG = '<script src="/qna-matcher.js?v=20260817-similarity-v1" defer></script>';

function patchIndex(html) {
  if (!html.includes('/qna-matcher.js?')) {
    const bodyClose = html.lastIndexOf('</body>');
    if (bodyClose < 0) throw new Error('Fechamento </body> não encontrado no index.html');
    html = html.slice(0, bodyClose) + MATCHER_TAG + '\n' + html.slice(bodyClose);
  }
  const legacyPattern = /\s*\/\/ 1\) Pergunta específica de um produto \(mais prioritária que tudo\).*?const qnaHit=qna\.find\(item=>\(item\.keywords\|\|\[\]\)\.some\(k=>query\.includes\(storeNorm\(k\)\)\)\);\s*if\(qnaHit\)\{ add\('bot',storeEsc\(qnaHit\.answer\)\); return; \}/s;
  const replacement = `
    // Q&A por similaridade de frase completa. O contexto do produto vem primeiro.
    const matcher=window.ChatShopQnaMatcher;
    const explicitProduct=products.find(p=>{
      const fullName=storeNorm(p.name||'');
      if(fullName && query.includes(fullName)) return true;
      const aliases=(p.keywords||[]).map(storeNorm).filter(Boolean);
      return aliases.some(k=>k.length>3 && query.includes(k));
    })||null;
    const contextProduct=lastProduct||explicitProduct||null;
    if(matcher && contextProduct){
      const local=(contextProduct.qna||[]).filter(qa=>qa&&qa.question&&qa.answer);
      const result=matcher.bestMatch(text,local,{threshold:0.58,context:{type:'product',product:contextProduct.name||''},debug:true});
      if(result.accepted){lastProduct=contextProduct;add('bot',storeEsc(result.match.item.answer));return;}
    }
    const generalCandidates=[];
    qna.forEach((item,itemIndex)=>{
      (item.keywords||[]).forEach((keyword,keywordIndex)=>{
        if(keyword)generalCandidates.push({question:keyword,answer:item.answer,_itemIndex:itemIndex,_keywordIndex:keywordIndex});
      });
    });
    if(matcher){
      const result=matcher.bestMatch(text,generalCandidates,{threshold:0.58,context:{type:'store'},debug:true});
      if(result.accepted){add('bot',storeEsc(result.match.item.answer));return;}
    } else {
      const qnaHit=qna.find(item=>(item.keywords||[]).some(k=>query===storeNorm(k)));
      if(qnaHit){add('bot',storeEsc(qnaHit.answer));return;}
    }`;
  const patched = html.replace(legacyPattern, replacement);
  if (patched === html) throw new Error('Bloco legado de Q&A não encontrado no index.html');
  return patched;
}

function patchVirtual(js) {
  const functionsPattern = /function productQna\(text,preferred=-1\)\{.*?(?=function categories\(\)\{)/s;
  const functionsReplacement = `function productQna(text,preferred=-1){
  let index=Number(preferred);
  if(!Number.isInteger(index)||index<0||!products[index]){
    const mentioned=matchProduct(text);index=mentioned?.i??-1;
  }
  if(index<0||!products[index])return null;
  const p=products[index];
  const candidates=(Array.isArray(p.qna)?p.qna:[]).filter(qa=>qa?.question&&qa?.answer);
  const matcher=window.ChatShopQnaMatcher;
  if(!matcher){
    const exact=candidates.find(qa=>norm(qa.question)===norm(text));
    return exact?{answer:String(exact.answer),i:index,p}:null;
  }
  const result=matcher.bestMatch(text,candidates,{threshold:0.58,context:{type:'product',product:p.name||'',index},debug:true});
  if(!result.accepted)return null;
  return{answer:String(result.match.item.answer),i:index,p,match:result.match};
}
function generalQna(text){
  const candidates=[];
  (Array.isArray(store?.qna)?store.qna:[]).forEach((qa,itemIndex)=>{
    const keys=Array.isArray(qa?.keywords)&&qa.keywords.length?qa.keywords:[qa?.question].filter(Boolean);
    keys.forEach((keyword,keywordIndex)=>{if(keyword&&qa?.answer)candidates.push({question:keyword,answer:String(qa.answer),_itemIndex:itemIndex,_keywordIndex:keywordIndex})});
  });
  const matcher=window.ChatShopQnaMatcher;
  if(!matcher){const exact=candidates.find(c=>norm(c.question)===norm(text));return exact?exact.answer:'';}
  const result=matcher.bestMatch(text,candidates,{threshold:0.58,context:{type:'store'},debug:true});
  return result.accepted?String(result.match.item.answer||''):'';
}
`;
  let patched = js.replace(functionsPattern, functionsReplacement);
  if (patched === js) throw new Error('Funções productQna/generalQna não encontradas');
  const productLoopPattern = /\s*for\(const qa of\(Array\.isArray\(p\.qna\)\?p\.qna:\[\]\)\)\{.*?\n\s*\}\n\s*(?=if\(\/preco\|valor\|quanto custa\|custa\/)/s;
  const productLoopReplacement = `
      const localQna=productQna(text,i);
      if(localQna){add('bot',esc(localQna.answer)+productActions(p,i),catalogVoice(localQna.answer));return;}
      `;
  const patched2 = patched.replace(productLoopPattern, productLoopReplacement);
  if (patched2 === patched) throw new Error('Bloco Q&A do contexto do produto não encontrado');
  patched = patched2;
  const oldFallback = "const unavailable='Não encontrei essa informação cadastrada para '+String(p.name||'este produto')+'. Posso responder somente com os dados e perguntas cadastradas para este produto.';";
  const newFallback = "const unavailable='Não encontrei uma resposta exata. Pode reformular ou falar com o vendedor?';";
  if (!patched.includes(oldFallback)) throw new Error('Fallback antigo da Loja Virtual não encontrado');
  return patched.replace(oldFallback, newFallback);
}

function servePatchedSource(request, response, file) {
  const filename = file === 'index' ? 'index.html' : file === 'virtual' ? 'virtual-chat-description-fix.js' : '';
  if (!filename) return false;
  const source = fs.readFileSync(path.join(process.cwd(), filename), 'utf8');
  const output = file === 'index' ? patchIndex(source) : patchVirtual(source);
  response.setHeader('Content-Type', file === 'index' ? 'text/html; charset=utf-8' : 'application/javascript; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.status(200).send(output);
  return true;
}

module.exports={servePatchedSource,patchIndex,patchVirtual};
