const deck = document.querySelector('#deck');
let current = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mark = (cls='') => `<svg class="mark ${cls}" viewBox="0 0 75 75" aria-hidden="true"><path d="M0 18.75C0 8.39 8.39 0 18.75 0H56.25V18.75H0Z"/><path class="fold" d="M56.25 0 75 18.75H56.25Z"/><path d="M56.25 18.75H75V56.25C75 66.61 66.61 75 56.25 75Z"/><path d="M0 53.12C0 41.04 9.79 31.25 21.88 31.25 33.96 31.25 43.75 41.04 43.75 53.12V75H21.88C9.79 75 0 65.21 0 53.12Z"/></svg>`;
const header = () => `<header class="slide-header"><span>Лекторий / СПбГАСУ</span><span class="brand">${mark()}арт.бродский</span></header>`;
const footer = s => `<footer class="slide-footer"><span>${s.block}</span><span>${s.speaker}</span></footer>`;
const AR = {rhino:'16/10'}; // пропорции роликов, остальные 16:9
const playIcon = '<svg viewBox="0 0 24 24"><path d="m9 5 11 7-11 7z"/></svg>';
// Тема живого фона для каждого типа слайда
const THEME = {cover:'dark', chapter:'dark', statement:'dark', video:'video'};
const themeOf = s => THEME[s.type] || 'light';
const REVEAL = '.cover-inner>*,.chapter-inner>*,.statement-inner>*,.video-heading,.video-frame,.embed-wrap,.speakers-map>:not(.sp-arrows),.poll-layout>div>*,.poll-options>button,.task-grid>div,.center-title,.bottom-thought,.qr-layout>div>*,.qr-card,.web-intro>*,.closing-layout>h2,.closing-steps>div,.placeholder-layout>div>*,.placeholder-canvas';
const TILT = '.task-grid>div,.qr-card,.sp-photo,.closing-steps>div,.placeholder-canvas';
function slideContent(s) {
  if (s.html) return s.html;
  if (s.type === 'chapter') return `<div class="chapter-inner"><span class="chapter-number">${s.block.slice(0,2)}</span><h2 data-scramble>${s.title}</h2><p>${s.subtitle}</p></div>`;
  if (s.type === 'placeholder') return `<div class="placeholder-layout"><div><p class="section-label">${s.speaker} / следующий показ</p><h2>${s.title}</h2><p>${s.subtitle}</p><p class="placeholder-caption">Место сохранено в согласованном маршруте.</p></div><div class="placeholder-canvas"><div class="outline-play">${playIcon}</div><h3>Скринкаст ещё не добавлен</h3><p>Содержание уточним по записи</p></div></div>`;
  if (s.type === 'video') return `<div class="video-heading"><h2>${s.title}</h2><p>${s.caption}</p></div><div class="video-stage"><div class="video-frame" data-media="${s.media}" style="--ar:${AR[s.media]||'16/9'}"><video preload="none" controls playsinline poster="assets/posters/${s.media}.jpg" aria-label="${s.title}"></video><div class="media-error"><p>Не удалось загрузить видео.</p><button class="pill" data-retry>Повторить загрузку</button></div></div></div>`;
  if (s.type === 'embed') return `<div class="video-heading"><h2>${s.title}</h2>${link(s.url,'Открыть отдельно','inline-link')}</div><div class="embed-wrap"><div class="embed-start"><h3>${s.title.startsWith('СПб')?'СПбГАСУ':'АРТ.БРОДСКИЙ'}</h3><p>Вращайте, меняйте, экспериментируйте.</p><button class="pill" data-load-embed>Включить 3D-объект ${arrow}</button></div></div>`;
  return '';
}
SLIDES.forEach((s,i) => {
  const el = document.createElement('section');
  el.className = `slide ${s.type} t-${themeOf(s)==='light'?'light':'dark'}${s.type==='video'?' video-slide':''}${s.type==='embed'?' embed-slide':''}${s.type==='web'?' web-slide':''}`;
  el.dataset.index=i;
  el.setAttribute('aria-label',`${i+1}. ${s.title.replace(/<br>/g,' ')}`);
  el.setAttribute('aria-hidden','true');
  el.inert = true;
  el.innerHTML=header()+slideContent(s)+footer(s);
  el.querySelectorAll(REVEAL).forEach((n,k)=>{n.classList.add('rv');n.style.setProperty('--i',k);});
  el.querySelectorAll(TILT).forEach(n=>n.classList.add('tilt'));
  if(s.type==='statement'||s.type==='cover') el.querySelector('h1,h2')?.setAttribute('data-scramble','');
  const wrap=el.querySelector('.embed-wrap');
  if(wrap)wrap.dataset.initialContent=wrap.innerHTML;
  deck.append(el);
});
const sections=[...deck.querySelectorAll('.slide')];
Field.mount(deck);
const progress=document.createElement('div');progress.className='progress';document.querySelector('.toolbar').append(progress);
function videoSource(id) {return 'assets/videos/'+id+'.mp4';}
function ensureVideo(el) {
  const v=el.querySelector('video');
  if (!v||v.dataset.loaded) return;
  v.dataset.loaded='true';
  v.parentElement.classList.remove('has-error');
  v.src=videoSource(el.querySelector('[data-media]').dataset.media);
  v.preload='metadata';
  v.addEventListener('error',()=>v.parentElement.classList.add('has-error'));
}
// Пока идёт видео, фон замирает: не отнимает кадры у ролика
deck.addEventListener('play',e=>{if(e.target.tagName==='VIDEO')Field.pause(true);},true);
deck.addEventListener('pause',e=>{if(e.target.tagName==='VIDEO')Field.pause(false);},true);
// Заголовок «проявляется» из случайных знаков — как будто его собирает ИИ
const GLYPHS='АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789/+×#';
function scramble(h){
  if(reducedMotion)return;
  const nodes=[];const walk=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);
  while(walk.nextNode())nodes.push(walk.currentNode);
  nodes.forEach(n=>n.final??=n.textContent);
  const token=h.dataset.run=String(Math.random());let f=0;
  (function tick(){
    if(h.dataset.run!==token)return;
    let done=true,pos=0;
    nodes.forEach(n=>{n.textContent=[...n.final].map(ch=>{pos++;if(ch===' '||f>pos*1.1+8)return ch;done=false;return GLYPHS[Math.random()*GLYPHS.length|0];}).join('');});
    f++;if(!done)requestAnimationFrame(tick);
  })();
}
// Рамка точно по пропорции ролика (без чёрных полей), заголовок — по ширине видео
function fitVideo(){
  const slide=sections[current],st=slide?.querySelector('.video-stage');if(!st)return;
  if(matchMedia('(max-width:700px)').matches){slide.style.removeProperty('--vw');return;}
  const [a,b]=getComputedStyle(st.firstElementChild).getPropertyValue('--ar').split('/').map(Number);
  slide.style.removeProperty('--vw');
  for(let k=0;k<2;k++){const r=st.getBoundingClientRect();slide.style.setProperty('--vw',Math.min(r.width,r.height*a/b)+'px');} // 2-й проход: подпись могла перенестись
}
addEventListener('resize',fitVideo);document.fonts.ready.then(fitVideo);
function show(index, updateHash=true) {
  const next=Math.max(0,Math.min(SLIDES.length-1,index));
  const previousVideo=sections[current]?.querySelector('video');
  previousVideo?.pause();
  if(next!==current&&previousVideo){previousVideo.removeAttribute('src');previousVideo.load();delete previousVideo.dataset.loaded;}
  if(next!==current){const wrap=sections[current]?.querySelector('.embed-wrap');if(wrap?.querySelector('iframe'))wrap.innerHTML=wrap.dataset.initialContent;}
  sections.forEach((el,i)=>{el.classList.toggle('active',i===next);el.setAttribute('aria-hidden',i===next?'false':'true');el.inert=i!==next;});
  if(next!==current&&current>=0)Field.pulse(undefined,undefined,4);
  current=next;
  Field.pause(false);
  Field.mode(themeOf(SLIDES[current]),current);
  sections[current].querySelectorAll('[data-scramble]').forEach(scramble);
  sections[current].scrollTop=0;
  ensureVideo(sections[current]);
  fitVideo();
  document.querySelector('#counter').textContent=`${String(current+1).padStart(2,'0')} / ${SLIDES.length}`;
  document.querySelector('#prev').disabled=current===0;
  document.querySelector('#next').disabled=current===SLIDES.length-1;
  progress.style.width=((current+1)/SLIDES.length*100)+'%';
  document.querySelector('#announcement').textContent=`Слайд ${current+1}: ${SLIDES[current].title.replace(/<br>/g,' ')}`;
  if(updateHash) history.replaceState(null,'',`#slide-${String(current+1).padStart(2,'0')}`);
  document.title=`${SLIDES[current].title.replace(/<br>/g,' ')} — ИИ, сделай красиво`;
  if(document.querySelector('#notes').open) fillNotes();
}
// Карточки слегка наклоняются за курсором, градиентный свет следует за ним
deck.addEventListener('pointermove',e=>{
  const c=e.target.closest('.tilt');if(!c||reducedMotion)return;
  const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
  c.style.transform=`perspective(900px) rotateX(${(.5-y)*7}deg) rotateY(${(x-.5)*9}deg)`;
  c.style.setProperty('--mx',x*100+'%');c.style.setProperty('--my',y*100+'%');
});
deck.addEventListener('pointerout',e=>{const c=e.target.closest('.tilt');if(c&&!c.contains(e.relatedTarget))c.style.transform='';});
// Промокод: копирование по клику и обратный отсчёт до конца акции
deck.addEventListener('click',e=>{const b=e.target.closest('[data-copy]');if(!b)return;navigator.clipboard?.writeText(b.dataset.copy).then(()=>{b.querySelector('em').textContent='Скопировано ✓';setTimeout(()=>b.querySelector('em').textContent='Скопировать',1800);}).catch(()=>{});Field.pulseAt(e.clientX,e.clientY,7);});
function tickDeadlines(){document.querySelectorAll('[data-deadline]').forEach(el=>{const left=new Date(el.dataset.deadline)-Date.now();if(left<=0){el.textContent='Акция завершилась в полночь 5 октября';return;}const h=Math.floor(left/36e5),m=Math.floor(left/6e4)%60,sec=Math.floor(left/1e3)%60,pad=n=>String(n).padStart(2,'0');el.innerHTML=`До конца акции: <b>${pad(h)}:${pad(m)}:${pad(sec)}</b>`;});}
tickDeadlines();setInterval(tickDeadlines,1000);
const parseHash=()=>{const m=location.hash.match(/^#slide-(\d+)$/);return m?Number(m[1])-1:0;};
document.querySelector('#prev').addEventListener('click',()=>show(current-1));
document.querySelector('#next').addEventListener('click',()=>show(current+1));
deck.addEventListener('click',e=>{
  if(e.target.closest('[data-next]')) show(current+1);
  const load=e.target.closest('[data-load-embed]');
  if(load){const s=SLIDES[current];const wrap=sections[current].querySelector('.embed-wrap');const iframe=document.createElement('iframe');iframe.title=s.title;iframe.src=s.url;iframe.allow='fullscreen; clipboard-write';iframe.referrerPolicy='strict-origin-when-cross-origin';wrap.replaceChildren(iframe);}
  const retry=e.target.closest('[data-retry]');if(retry){const v=retry.closest('.video-frame').querySelector('video');v.parentElement.classList.remove('has-error');v.load();}
  const answer=e.target.closest('[data-answer]');
  if(answer){sections[current].querySelectorAll('[data-answer]').forEach(b=>b.setAttribute('aria-pressed',String(b===answer)));document.querySelector('#poll-feedback').textContent=['Начнём с небольшой задачи и понятного результата.','Посмотрим, чем можно управлять и что выбирать самому.','Иногда так и есть. Сравним способы на реальных задачах.','Разберём варианты работы в привычном софте.','Тогда ищите в показах новые способы для своей практики.'][Number(answer.dataset.answer)];Field.pulseAt(e.clientX,e.clientY,7);}
});
function fillNotes(){const s=SLIDES[current];document.querySelector('#notes-content').innerHTML=`<h3>${s.title.replace(/<br>/g,' ')}</h3><p>${s.notes}</p><small>Слайд ${current+1} / ${SLIDES.length} · ${s.speaker}<br>Текст черновика и позиции, не закреплённые автором, доступны для правок.</small>`;}
// Заметки спикера видны только по ссылке с ?presenter — зрителям кнопка не показывается
const presenter=new URLSearchParams(location.search).has('presenter');
document.querySelector('#notes-open').hidden=!presenter;
function openNotes(){if(!presenter)return;fillNotes();document.querySelector('#notes').showModal();}
document.querySelector('#notes-open').addEventListener('click',openNotes);
document.querySelector('#overview-open').addEventListener('click',()=>{const list=document.querySelector('#overview-list');list.replaceChildren();SLIDES.forEach((s,i)=>{const b=document.createElement('button');b.className=i===current?'current':'';b.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><span><small>${s.block}${s.status?' / '+s.status:''}</small>${s.title.replace(/<br>/g,' ')}</span>`;b.addEventListener('click',()=>{show(i);document.querySelector('#overview').close();});list.append(b);});document.querySelector('#overview').showModal();});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
async function fullscreen(){if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
document.querySelector('#fullscreen').addEventListener('click',()=>fullscreen().catch(()=>{}));
document.addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]'))return;
  if(e.target.closest('input,textarea,video,select,[contenteditable]'))return;
  if(['ArrowRight','PageDown'].includes(e.key)){e.preventDefault();show(current+1);}
  if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();show(current-1);}
  if(e.key==='Home'){e.preventDefault();show(0);}
  if(e.key==='End'){e.preventDefault();show(SLIDES.length-1);}
  if(e.key.toLowerCase()==='n'||e.key.toLowerCase()==='т')openNotes();
  if(e.key.toLowerCase()==='f'||e.key.toLowerCase()==='а')fullscreen().catch(()=>{});
});
window.addEventListener('hashchange',()=>show(parseHash(),false));
current=-1;show(parseHash());
