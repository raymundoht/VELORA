document.addEventListener('DOMContentLoaded',()=>{
 const btn=document.getElementById('mobileMenuBtn'),drawer=document.getElementById('mobileDrawer'),icon=document.getElementById('menuIcon');
 function menu(open){drawer.classList.toggle('hidden',!open);btn.setAttribute('aria-expanded',String(open));btn.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');icon.className=open?'fas fa-xmark text-xl':'fas fa-bars text-xl'}
 btn.addEventListener('click',()=>menu(btn.getAttribute('aria-expanded')!=='true'));
 drawer.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>menu(false)));
 matchMedia('(min-width:768px)').addEventListener('change',e=>{if(e.matches)menu(false)});

 /* ── Autocomplete: Tipo de Negocio ── */
 const tipoInput=document.getElementById('tipoNegocio');
 const tipoList=document.getElementById('tipoNegocioList');
 const rubros=[
   {value:'Hotel',label:'Hotel / Hospitalidad'},
   {value:'Restaurante',label:'Restaurante / Bar'},
   {value:'Oficina',label:'Oficina Corporativa'},
   {value:'Boutique',label:'Boutique / Tienda Retail'},
   {value:'Consultorio',label:'Consultorio / Clínica'},
   {value:'Gimnasio',label:'Gimnasio / Wellness'},
   {value:'SalonSpa',label:'Salón de Belleza / Spa'},
   {value:'AgenciaAutomotriz',label:'Agencia Automotriz'},
   {value:'Cafeteria',label:'Cafetería / Panadería'},
   {value:'Inmobiliaria',label:'Inmobiliaria / Showroom'},
   {value:'Escuela',label:'Escuela / Centro Educativo'},
   {value:'Veterinaria',label:'Veterinaria / Pet Shop'},
 ];
 let activeIdx=-1;

 function normalize(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}

 function renderOptions(filter){
   const q=normalize(filter);
   const matches=q?rubros.filter(r=>normalize(r.label).includes(q)):rubros;
   tipoList.innerHTML='';
   activeIdx=-1;
   if(!matches.length && !q){closeList();return}
   matches.forEach((r,i)=>{
     const li=document.createElement('li');
     li.setAttribute('role','option');
     li.setAttribute('id','tipo-opt-'+i);
     li.textContent=r.label;
     li.className='px-4 py-2.5 text-sm text-slate-300 cursor-pointer hover:bg-velora-champagne/15 hover:text-white transition-colors';
     li.addEventListener('mousedown',e=>{e.preventDefault();selectOption(r)});
     tipoList.appendChild(li);
   });
   // If user typed something custom and it doesn't match any option exactly, show a "use custom" hint
   if(q && !matches.some(r=>normalize(r.label)===q)){
     const li=document.createElement('li');
     li.setAttribute('role','option');
     li.setAttribute('id','tipo-opt-custom');
     li.className='px-4 py-2.5 text-sm text-velora-champagne/70 cursor-pointer hover:bg-velora-champagne/15 hover:text-velora-champagne transition-colors border-t border-white/10';
     li.innerHTML='<i class="fas fa-pen-fancy mr-2 text-xs"></i>Usar: "'+filter.trim()+'"';
     li.addEventListener('mousedown',e=>{e.preventDefault();closeList()});
     tipoList.appendChild(li);
   }
   openList();
 }

 function selectOption(r){tipoInput.value=r.label;closeList()}
 function openList(){tipoList.classList.remove('hidden');tipoInput.setAttribute('aria-expanded','true')}
 function closeList(){tipoList.classList.add('hidden');tipoInput.setAttribute('aria-expanded','false');activeIdx=-1}

 function setActive(idx){
   const items=[...tipoList.querySelectorAll('[role="option"]')];
   items.forEach(el=>el.classList.remove('bg-velora-champagne/15','text-white'));
   if(idx>=0&&idx<items.length){items[idx].classList.add('bg-velora-champagne/15','text-white');items[idx].scrollIntoView({block:'nearest'});tipoInput.setAttribute('aria-activedescendant',items[idx].id)}
   activeIdx=idx;
 }

 tipoInput.addEventListener('input',()=>renderOptions(tipoInput.value));
 tipoInput.addEventListener('focus',()=>renderOptions(tipoInput.value));
 tipoInput.addEventListener('keydown',e=>{
   const items=[...tipoList.querySelectorAll('[role="option"]')];
   if(e.key==='ArrowDown'){e.preventDefault();if(tipoList.classList.contains('hidden'))renderOptions(tipoInput.value);else setActive(Math.min(activeIdx+1,items.length-1))}
   else if(e.key==='ArrowUp'){e.preventDefault();setActive(Math.max(activeIdx-1,0))}
   else if(e.key==='Enter'&&activeIdx>=0&&!tipoList.classList.contains('hidden')){e.preventDefault();const match=rubros.find(r=>items[activeIdx].textContent===r.label);if(match)selectOption(match);else closeList()}
   else if(e.key==='Escape'){closeList()}
 });
 document.addEventListener('click',e=>{if(!e.target.closest('#tipoNegocioWrapper'))closeList()});

 /* ── Form submit ── */
 const form=document.getElementById('leadForm'),modal=document.getElementById('successModal'),close=document.getElementById('closeModalBtn'),wa=document.getElementById('continueWhatsapp');let returnFocus;
 function dismiss(){modal.classList.add('hidden');document.body.style.overflow='';returnFocus?.focus()}

 form.addEventListener('submit',e=>{
   e.preventDefault();
   if(!form.reportValidity())return;
   const nombre=document.getElementById('nombre').value.trim();
   const empresa=document.getElementById('empresa').value.trim();
   const telefono=document.getElementById('telefono').value.trim();
   const tipo=document.getElementById('tipoNegocio').value.trim();
   const tamano=document.getElementById('tamano').value.trim();
   // Required: nombre, telefono, tipo, tamano
   if(!nombre||!telefono||!tipo||!tamano){form.querySelector('input:invalid')?.focus();return}
   let lines=[
     `- Nombre: ${nombre}`,
     empresa?`- Empresa: ${empresa}`:null,
     `- Teléfono: ${telefono}`,
     `- Giro: ${tipo}`,
     `- Espacio estimado: ${tamano}`,
   ].filter(Boolean).join('\n');
   const text=`Hola VELORA, quiero solicitar la prueba gratuita de aromatización de 2 días para mi negocio:\n${lines}\n\n¿Cuándo podríamos agendar la visita de instalación?`;
   wa.href='https://wa.me/526145989483?text='+encodeURIComponent(text);
   const formData=new FormData(form);
   fetch(form.action,{method:'POST',body:formData,headers:{'Accept':'application/json'}}).catch(()=>{});
   returnFocus=document.activeElement;modal.classList.remove('hidden');document.body.style.overflow='hidden';wa.focus();
 });

 close.addEventListener('click',dismiss);modal.addEventListener('click',e=>{if(e.target===modal)dismiss()});document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!modal.classList.contains('hidden'))dismiss();else{menu(false);btn.focus()}}if(e.key==='Tab'&&!modal.classList.contains('hidden')){if(e.shiftKey&&document.activeElement===wa){e.preventDefault();close.focus()}else if(!e.shiftKey&&document.activeElement===close){e.preventDefault();wa.focus()}}});
 document.getElementById('telefono').setAttribute('autocomplete','tel');document.getElementById('nombre').setAttribute('autocomplete','name');document.getElementById('empresa').setAttribute('autocomplete','organization');
});

// Progressive enhancement: content stays visible if motion APIs are unavailable.
document.addEventListener('DOMContentLoaded',()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const sections=[...document.querySelectorAll('main > section:not(#inicio) > div')];let observer;
 function stopReveals(){observer?.disconnect();sections.forEach(el=>el.classList.remove('reveal-ready','is-visible'))}
 if(!reduced.matches && 'IntersectionObserver' in window){
  observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}})},{threshold:0,rootMargin:'0px 0px -35px 0px'});
  sections.forEach(el=>{el.classList.add('reveal-ready');observer.observe(el)});
 }
 const art=document.querySelector('.hero-art');if(!art)return;
 let x=0,y=0,frame=0;
 function draw(){frame=0;art.style.setProperty('--hero-rx',(-y*2.5).toFixed(2)+'deg');art.style.setProperty('--hero-ry',(x*3.5).toFixed(2)+'deg')}
 function queue(){if(!frame)frame=requestAnimationFrame(draw)}
 function reset(){x=0;y=0;art.classList.remove('is-moving');queue()}
 function move(e){if(reduced.matches || (e.pointerType==='touch' && !e.buttons))return;const r=art.getBoundingClientRect();x=Math.max(-1,Math.min(1,((e.clientX-r.left)/r.width-.5)*2));y=Math.max(-1,Math.min(1,((e.clientY-r.top)/r.height-.5)*2));art.classList.add('is-moving');queue()}
 art.addEventListener('pointermove',move,{passive:true});art.addEventListener('pointerdown',move,{passive:true});
 ['pointerleave','pointerup','pointercancel','blur'].forEach(type=>art.addEventListener(type,reset));
 art.addEventListener('keydown',e=>{if(reduced.matches)return;const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Escape'];if(!keys.includes(e.key))return;e.preventDefault();if(e.key==='Home'||e.key==='Escape'){reset();return}art.classList.add('is-moving');if(e.key==='ArrowLeft')x=Math.max(-1,x-.25);if(e.key==='ArrowRight')x=Math.min(1,x+.25);if(e.key==='ArrowUp')y=Math.max(-1,y-.25);if(e.key==='ArrowDown')y=Math.min(1,y+.25);queue()});
 reduced.addEventListener('change',()=>{reset();if(reduced.matches)stopReveals()});
});
