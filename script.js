// ===== Datos de contacto dinámicos (editados desde /admin) =====
// Si el archivo no existe o falla la carga (por ejemplo, al abrir el HTML
// directo con doble clic en vez de por un servidor), el sitio simplemente
// conserva los valores que ya están escritos en el HTML.
async function loadSiteData() {
  try {
    const res = await fetch('data/site-data.json', { cache: 'no-store' });
    if (!res.ok) return;
    const d = await res.json();

    const setText = (id, value) => { const el = document.getElementById(id); if (el && value) el.textContent = value; };
    const setHref = (id, value) => { const el = document.getElementById(id); if (el && value) el.href = value; };

    // Teléfono
    setText('navPhoneText', d.phone_display);
    if (d.phone_tel) {
      setHref('navPhoneLink', `tel:${d.phone_tel}`);
      setHref('ubicPhoneLink', `tel:${d.phone_tel}`);
      setHref('footerPhoneLink', `tel:${d.phone_tel}`);
    }
    setText('ubicPhoneLink', d.phone_display);
    setText('footerPhoneLink', d.phone_display);

    // WhatsApp
    if (d.whatsapp_number) {
      setHref('empresasWhatsappLink', `https://wa.me/${d.whatsapp_number}`);
      setHref('floatWhatsappLink', `https://wa.me/${d.whatsapp_number}`);
    }

    // Correo
    if (d.email) {
      setHref('ubicEmailLink', `mailto:${d.email}`);
      setHref('footerEmailLink', `mailto:${d.email}`);
    }
    setText('ubicEmailLink', d.email);
    setText('footerEmailLink', d.email);
    if (d.email) { const pe = document.getElementById('privEmail'); if (pe) { pe.textContent = d.email; pe.href = 'mailto:' + d.email; } }

    // Dirección
    const ubicAddress = document.getElementById('ubicAddress');
    if (ubicAddress && (d.address_line1 || d.address_line2)) {
      const mapsHref = d.maps_link || '#';
      ubicAddress.innerHTML =
        `${d.address_line1 || ''}<br>${d.address_line2 || ''}<br>` +
        `<a class="dd-link" href="${mapsHref}" target="_blank" rel="noopener" id="ubicMapsLink">Ver ruta en Google Maps →</a>`;
    }

    // Horario
    const ubicHours = document.getElementById('ubicHours');
    if (ubicHours && (d.hours_weekday || d.hours_sunday)) {
      ubicHours.innerHTML = `${d.hours_weekday || ''}<br>${d.hours_sunday || ''}`;
    }

    // Mapa embebido
    const mapEmbed = document.getElementById('ubicMapEmbed');
    if (mapEmbed && d.maps_embed_query) {
      mapEmbed.src = `https://www.google.com/maps?q=${encodeURIComponent(d.maps_embed_query)}&output=embed`;
    }
  } catch (err) {
    // Silencioso: el sitio sigue funcionando con los valores por defecto del HTML.
  }
}
loadSiteData();

// ===== Bolsa de trabajo: formulario público =====
// El formulario ahora se envía de forma 100% nativa (sin fetch ni JavaScript
// interceptando el envío) porque algunos antivirus/software de seguridad
// bloquean en silencio los envíos hechos por JavaScript cuando detectan un
// formulario que junta datos personales + un archivo adjunto. Con un envío
// nativo de HTML, el navegador maneja todo directamente — es el mecanismo
// más básico y compatible que existe en la web.
const formEmpleo = document.getElementById('formEmpleo');
if (formEmpleo) {
  const cvDrop = document.getElementById('cvDrop');
  const cvInput = document.getElementById('cvInput');
  const cvFileName = document.getElementById('cvFileName');
  const empleoStatus = document.getElementById('empleoStatus');

  // Esto SOLO controla la selección bonita del archivo (arrastrar/soltar,
  // mostrar el nombre). El envío en sí lo hace el navegador de forma normal.
  cvDrop.addEventListener('click', () => cvInput.click());
  cvInput.addEventListener('change', () => {
    if (cvInput.files && cvInput.files[0]) setCvFile(cvInput.files[0]);
  });

  ['dragenter', 'dragover'].forEach(evt =>
    cvDrop.addEventListener(evt, (e) => { e.preventDefault(); cvDrop.classList.add('dragover'); })
  );
  ['dragleave', 'drop'].forEach(evt =>
    cvDrop.addEventListener(evt, (e) => { e.preventDefault(); cvDrop.classList.remove('dragover'); })
  );
  cvDrop.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      cvInput.files = dt.files;
      setCvFile(file);
    }
  });

  function setCvFile(file) {
    const okTypes = ['application/pdf'];
    if (!okTypes.includes(file.type) && !/\.pdf$/i.test(file.name)) {
      showEmpleoStatus('Solo se aceptan archivos PDF.', true);
      cvInput.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showEmpleoStatus('El archivo pesa demasiado (máximo 5MB).', true);
      cvInput.value = '';
      return;
    }
    cvFileName.textContent = file.name;
    cvDrop.classList.add('has-file');
  }

  function showEmpleoStatus(msg, isError) {
    empleoStatus.textContent = msg;
    empleoStatus.classList.remove('ok', 'error');
    empleoStatus.classList.add('show', isError ? 'error' : 'ok');
  }

  // Después de que el navegador envía el formulario, api/submit-application.php
  // redirige de vuelta aquí con ?empleo_ok=1 o ?empleo_error=mensaje en la URL.
  // Leemos eso al cargar la página para mostrar el mensaje correspondiente,
  // y luego limpiamos la URL para que un refresh no repita el mensaje.
  const params = new URLSearchParams(window.location.search);
  if (params.has('empleo_ok')) {
    showEmpleoStatus('¡Listo! Recibimos tu solicitud. Te contactaremos si tu perfil encaja.', false);
  } else if (params.has('empleo_error')) {
    showEmpleoStatus(params.get('empleo_error') || 'Ocurrió un error. Intenta de nuevo.', true);
  }
  if (params.has('empleo_ok') || params.has('empleo_error')) {
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState(null, '', cleanUrl);
  }
}

// ===== Vacantes activas (editadas desde /admin) =====
// Igual que loadSiteData: si falla la carga, el formulario simplemente se
// queda con la única opción "Otro" en vez de romperse.
async function loadVacancies() {
  const tagsContainer = document.getElementById('empleoPuestosTags');
  const select = document.getElementById('empleoPositionSelect');
  const otroOption = document.getElementById('otroOption');
  const detalle = document.getElementById('vacanteDetalle');
  const detalleTitle = document.getElementById('vacanteDetalleTitle');
  const detalleDesc = document.getElementById('vacanteDetalleDesc');
  const detalleClose = document.getElementById('vacanteDetalleClose');
  const detallePostular = document.getElementById('vacanteDetallePostular');
  if (!tagsContainer || !select) return;

  // La vacante elegida viaja en un campo oculto para que el panel sepa a qué sucursal pertenece.
  let vidInput = document.getElementById('empleoVacancyId');
  if (!vidInput) {
    vidInput = document.createElement('input');
    vidInput.type = 'hidden'; vidInput.name = 'vacancy_id'; vidInput.id = 'empleoVacancyId';
    select.form.appendChild(vidInput);
  }
  select.addEventListener('change', () => {
    const o = select.options[select.selectedIndex];
    vidInput.value = (o && o.dataset.vid) || '';
  });

  function closeDetalle() {
    detalle.hidden = true;
    tagsContainer.querySelectorAll('.puesto-tag').forEach(t => t.classList.remove('active'));
  }

  function openDetalle(vacancy, tagEl) {
    tagsContainer.querySelectorAll('.puesto-tag').forEach(t => t.classList.remove('active'));
    tagEl.classList.add('active');
    detalleTitle.textContent = vacancy.title;
    detalleDesc.textContent = vacancy.description && vacancy.description.trim()
      ? vacancy.description
      : 'Escríbenos y con gusto te damos más detalles sobre horarios y requisitos de este puesto.';
    detallePostular.dataset.title = vacancy.title + (vacancy.branchName ? ' — ' + vacancy.branchName : '');
    detalle.hidden = false;
  }

  try {
    const res = await fetch('data/vacancies.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar');
    const vacancies = await res.json();
    let bmap = {};
    try { const rb = await fetch('data/branches.json', { cache: 'no-store' }); if (rb.ok) (await rb.json()).forEach(b => { bmap[b.id] = b.name; }); } catch (e) {}
    vacancies.forEach(v => { v.branchName = v.branch_id ? (bmap[v.branch_id] || '') : ''; });
    const activas = vacancies.filter(v => v.active);

    if (activas.length === 0) {
      tagsContainer.innerHTML = '<span>Por el momento no tenemos vacantes abiertas, pero puedes enviarnos tu CV de todos modos.</span>';
    } else {
      tagsContainer.innerHTML = activas.map((v, i) => `
        <button type="button" class="puesto-tag" data-index="${i}">
          ${escapeHtmlPublic(v.title)}${v.branchName ? ' <small class="puesto-suc">· ' + escapeHtmlPublic(v.branchName) + '</small>' : ''}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        </button>
      `).join('');

      activas.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.title + (v.branchName ? ' — ' + v.branchName : '');
        opt.textContent = opt.value;
        opt.dataset.vid = v.id || '';
        select.insertBefore(opt, otroOption);
      });

      tagsContainer.querySelectorAll('.puesto-tag').forEach(tagEl => {
        tagEl.addEventListener('click', () => {
          const vacancy = activas[parseInt(tagEl.dataset.index, 10)];
          if (tagEl.classList.contains('active')) {
            closeDetalle();
          } else {
            openDetalle(vacancy, tagEl);
          }
        });
      });
    }
  } catch (err) {
    tagsContainer.innerHTML = '<span>Escríbenos y cuéntanos en qué te gustaría trabajar.</span>';
  }

  if (detalleClose) detalleClose.addEventListener('click', closeDetalle);
  if (detallePostular) {
    detallePostular.addEventListener('click', () => {
      select.value = detallePostular.dataset.title || '';
      select.dispatchEvent(new Event('change'));
      closeDetalle();
      document.getElementById('formEmpleo').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}
function escapeHtmlPublic(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
loadVacancies();

// ===== Misión / Visión / Valores: escenario animado =====
(function () {
  const sec = document.querySelector('.mvv-section');
  if (!sec) return;
  const tabs = [...sec.querySelectorAll('.mvv-tab')], panels = [...sec.querySelectorAll('.mvv-panel')];
  const big = document.getElementById('mvvBigNum'), glow = sec.querySelector('.mvv-glow');
  const DUR = 9000, reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  let cur = 0, timer = null, started = false;
  sec.style.setProperty('--mvv-dur', DUR + 'ms');

  // Texto palabra por palabra
  sec.querySelectorAll('.mvv-words').forEach(p => {
    p.innerHTML = p.textContent.trim().split(/\s+/).map((w, i) => `<span class="w" style="--wi:${i}">${w}</span>`).join(' ');
  });
  sec.querySelectorAll('.mvv-val').forEach((v, i) => v.style.setProperty('--vi', i));

  // Brasas
  const em = sec.querySelector('.mvv-embers');
  if (em && !reduce) {
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('i');
      s.style.cssText = `--x:${Math.random() * 100}%;--s:${(2 + Math.random() * 5).toFixed(1)}px;--d:${(7 + Math.random() * 9).toFixed(1)}s;--dl:${(-Math.random() * 14).toFixed(1)}s;--dx:${(Math.random() * 120 - 60).toFixed(0)}px`;
      em.appendChild(s);
    }
  }

  function go(i) {
    cur = (i + tabs.length) % tabs.length;
    tabs.forEach((t, k) => { t.classList.toggle('active', k === cur); t.setAttribute('aria-selected', k === cur ? 'true' : 'false'); });
    // reinicia animación de la barra
    const bar = tabs[cur].querySelector('.mvv-tab-bar i'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    panels.forEach((p, k) => {
      p.classList.remove('active');
      if (k === cur) { void p.offsetWidth; p.classList.add('active'); }
    });
    big.classList.add('swap');
    setTimeout(() => { big.classList.remove('swap'); }, 220);
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (reduce || sec.classList.contains('paused') || !started) return;
    timer = setTimeout(() => go(cur + 1), DUR);
  }

  tabs.forEach((t, i) => t.addEventListener('click', () => go(i)));
  sec.querySelector('.mvv-stage').addEventListener('mouseenter', () => { sec.classList.add('paused'); clearTimeout(timer); });
  sec.querySelector('.mvv-stage').addEventListener('mouseleave', () => { sec.classList.remove('paused'); go(cur); });

  // Resplandor que sigue al cursor
  sec.addEventListener('mousemove', e => {
    const r = sec.getBoundingClientRect();
    sec.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    sec.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });

  // Deslizar en móvil
  let sx = null; const stage = sec.querySelector('.mvv-stage');
  stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // Contador de años (desde 1987)
  const yEl = document.getElementById('mvvYears');
  const years = new Date().getFullYear() - 1987;
  function countUp() {
    if (reduce) { yEl.textContent = years; return; }
    const t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / 1600);
      yEl.textContent = Math.round(years * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  // Arranca cuando la sección entra en pantalla (y pausa fuera de ella)
  new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) {
      if (!started) { started = true; countUp(); go(0); } else schedule();
    } else clearTimeout(timer);
  }), { threshold: 0.35 }).observe(sec);
})();

// Nav solid on scroll
const header = document.getElementById('siteHeader');
window.addEventListener('scroll',()=>{
  header.classList.toggle('solid', window.scrollY > 60);
},{passive:true});

// Scroll reveal
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add('in-view'); io.unobserve(e.target); }
  });
},{threshold:.15});
document.querySelectorAll('.reveal, .reveal-stagger').forEach(el=>io.observe(el));

// Cut map interactivity
const cuts = {};
document.querySelectorAll('.zone').forEach(z=>{
  z.setAttribute('tabindex','0');
  z.setAttribute('role','button');
  z.setAttribute('aria-label', z.dataset.name);
});
const cutName = document.getElementById('cutName');
const cutDesc = document.getElementById('cutDesc');
let activeZone = null;

function selectZone(zone){
  if(activeZone) activeZone.classList.remove('active');
  zone.classList.add('active');
  activeZone = zone;
  cutName.textContent = zone.dataset.name;
  cutDesc.textContent = zone.dataset.desc;
  cutName.classList.remove('cut-fade'); cutDesc.classList.remove('cut-fade');
  void cutName.offsetWidth;
  cutName.classList.add('cut-fade'); cutDesc.classList.add('cut-fade');
}

document.querySelectorAll('.zone').forEach(zone=>{
  zone.addEventListener('mouseenter',()=>selectZone(zone));
  zone.addEventListener('click',()=>selectZone(zone));
  zone.addEventListener('keydown',(e)=>{
    if(e.key==='Enter' || e.key===' '){ e.preventDefault(); selectZone(zone); }
  });
});

// Selector de animal (Res / Cerdo) en el mapa de cortes
const animalTabs = document.querySelectorAll('.animal-tab');
const animalSvgs = document.querySelectorAll('.animal-svg');

animalTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const animal = tab.dataset.animal;
    animalTabs.forEach(t => t.classList.toggle('active', t === tab));
    animalSvgs.forEach(svg => {
      // Nota: la propiedad .hidden no es confiable en elementos <svg> en
      // todos los navegadores, así que controlamos la visibilidad con una
      // clase CSS en su lugar.
      svg.classList.toggle('animal-svg-hidden', svg.dataset.animal !== animal);
    });
    // Selecciona automáticamente la primera zona del animal recién mostrado,
    // para que el panel de la derecha nunca se quede con datos del otro animal.
    const visibleSvg = document.querySelector(`.animal-svg[data-animal="${animal}"]`);
    const firstZone = visibleSvg ? visibleSvg.querySelector('.zone') : null;
    if (firstZone) selectZone(firstZone);
  });
});

// Gallery lightbox
const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
const lightbox = document.getElementById('lightbox');
const lightboxContent = document.getElementById('lightboxContent');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
let currentIndex = 0;

function renderLightbox(index){
  currentIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[currentIndex];
  const img = item.querySelector('img');
  const placeholder = item.querySelector('.gallery-placeholder');
  lightboxContent.innerHTML = '';

  if(img.style.display !== 'none'){
    const bigImg = document.createElement('img');
    bigImg.src = img.src;
    bigImg.alt = img.alt;
    lightboxContent.appendChild(bigImg);
  } else {
    const lbPlaceholder = document.createElement('div');
    lbPlaceholder.className = 'lb-placeholder';
    lbPlaceholder.innerHTML = placeholder.querySelector('svg').outerHTML +
      '<span>' + placeholder.querySelector('span').textContent + '</span>';
    lightboxContent.appendChild(lbPlaceholder);
  }
}

galleryItems.forEach((item, i)=>{
  item.addEventListener('click', ()=>{
    renderLightbox(i);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
});

function closeLightbox(){
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}
lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e)=>{ if(e.target === lightbox) closeLightbox(); });
lightboxPrev.addEventListener('click', ()=>renderLightbox(currentIndex - 1));
lightboxNext.addEventListener('click', ()=>renderLightbox(currentIndex + 1));
document.addEventListener('keydown', (e)=>{
  if(!lightbox.classList.contains('open')) return;
  if(e.key === 'Escape') closeLightbox();
  if(e.key === 'ArrowLeft') renderLightbox(currentIndex - 1);
  if(e.key === 'ArrowRight') renderLightbox(currentIndex + 1);
});

// stop pulsing dots after first interaction
let interacted = false;
document.querySelectorAll('.zone').forEach(z=>{
  z.addEventListener('mouseenter',()=>{
    if(!interacted){
      interacted = true;
      document.querySelectorAll('.zone-dot').forEach(d=>d.classList.remove('pulse'));
    }
  });
});

// ===== Sucursales (datos desde data/branches.json, editados en /admin) =====
(async function () {
  const list = document.getElementById('sucList');
  if (!list) return;
  const map = document.getElementById('sucMap'), msg = document.getElementById('sucMsg');
  const search = document.getElementById('sucSearch'), near = document.getElementById('sucNearBtn');
  const cur = document.getElementById('sucCurrent'), panel = document.getElementById('sucPanel');
  const toggle = document.getElementById('sucToggle'), total = document.getElementById('sucTotal');
  const esc = escapeHtmlPublic;
  const mobile = () => window.matchMedia('(max-width:900px)').matches;
  let all = [], rows = [], sel = null, dist = {};

  try {
    const r = await fetch('data/branches.json', { cache: 'no-store' });
    all = (await r.json()).filter(b => b.active);
  } catch (e) {}
  if (!all.length) { cur.innerHTML = '<p>Pronto tendremos más sucursales para ti.</p>'; list.innerHTML = ''; document.querySelector('.suc-side').classList.add('suc-solo'); return; }

  total.textContent = '(' + all.length + ')';
  if (all.length < 2) { toggle.style.display = 'none'; panel.style.display = 'none'; }

  const q = b => (b.lat != null && b.lng != null) ? b.lat + ',' + b.lng : (b.address || b.name);
  const km = (a, b) => {
    const t = x => x * Math.PI / 180, R = 6371;
    const h = Math.sin(t(b.lat - a.lat) / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(t(b.lng - a.lng) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  function renderCurrent() {
    const b = sel; if (!b) return;
    cur.innerHTML = `
      <h3>${esc(b.name)}${b.is_main ? '<span class="suc-badge">Central de mayoreo</span>' : ''}${dist[b.id] != null ? `<span class="suc-badge dist">${dist[b.id].toFixed(1)} km</span>` : ''}</h3>
      ${b.address ? `<p>${esc(b.address)}</p>` : ''}${b.hours ? `<p>${esc(b.hours)}</p>` : ''}
      <div class="suc-actions">${b.phone ? `<a href="tel:${esc(b.phone.replace(/[^\d+]/g, ''))}">Llamar</a>` : ''}
        <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q(b))}" target="_blank" rel="noopener">Cómo llegar</a></div>`;
  }

  function render() {
    const t = (search.value || '').toLowerCase();
    rows = all.filter(b => (b.name + ' ' + (b.address || '')).toLowerCase().includes(t))
      .sort((a, b) => ((dist[a.id] ?? 1e9) - (dist[b.id] ?? 1e9)) || (b.is_main - a.is_main));
    list.innerHTML = rows.map(b => `
      <div class="suc-row${sel && sel.id === b.id ? ' sel' : ''}" data-id="${esc(b.id)}">
        <div class="suc-row-main"><strong>${esc(b.name)}</strong><small>${esc(b.address || '')}</small></div>
        ${dist[b.id] != null ? `<span class="suc-row-km">${dist[b.id].toFixed(1)} km</span>` : ''}
      </div>`).join('') || '<div class="suc-empty">No encontramos sucursales con esa búsqueda.</div>';
  }

  function show(b) {
    sel = b;
    const src = 'https://www.google.com/maps?q=' + encodeURIComponent(q(b)) + '&output=embed';
    if (map.getAttribute('src') !== src) map.src = src;
    renderCurrent();
    list.querySelectorAll('.suc-row').forEach(r => r.classList.toggle('sel', r.dataset.id === b.id));
  }

  function setPanel(open) {
    panel.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  toggle.addEventListener('click', () => setPanel(!panel.classList.contains('open')));

  list.addEventListener('click', e => {
    const r = e.target.closest('.suc-row');
    if (!r) return;
    show(all.find(b => b.id === r.dataset.id));
    if (mobile()) { setPanel(false); document.getElementById('sucMap').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });

  search.addEventListener('input', () => {
    render();
    if (rows.length && !rows.some(b => sel && b.id === sel.id)) show(rows[0]);
    list.scrollTop = 0;
  });

  // Aplica una ubicación (del botón o del aviso de bienvenida)
  function applyLocation(me, scrollMap) {
    dist = {};
    all.forEach(b => { if (b.lat != null && b.lng != null) dist[b.id] = km(me, b); });
    const best = all.filter(b => dist[b.id] != null).sort((a, b) => dist[a.id] - dist[b.id])[0];
    if (!best) { msg.textContent = 'Aún no hay sucursales con ubicación registrada.'; document.dispatchEvent(new CustomEvent('dicosa:nearest', { detail: null })); return; }
    msg.textContent = 'La más cercana: ' + best.name + ' (' + dist[best.id].toFixed(1) + ' km)';
    search.value = '';
    render();
    list.scrollTop = 0;
    show(best);
    document.dispatchEvent(new CustomEvent('dicosa:nearest', { detail: { name: best.name, km: dist[best.id] } }));
    if (scrollMap && mobile()) document.getElementById('sucMap').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  near.addEventListener('click', () => {
    if (!navigator.geolocation) { msg.textContent = 'Tu navegador no permite obtener la ubicación.'; return; }
    msg.textContent = 'Buscando tu ubicación…';
    navigator.geolocation.getCurrentPosition(p => {
      applyLocation({ lat: p.coords.latitude, lng: p.coords.longitude }, true);
    }, () => {
      msg.textContent = 'No pudimos obtener tu ubicación. Revisa el permiso del navegador o busca por colonia.';
    }, { timeout: 10000 });
  });
  document.addEventListener('dicosa:location', e => applyLocation(e.detail, false));

  show(all.find(b => b.is_main) || all[0]);
  render();
  show(sel);
  if (window.dicosaLocation) applyLocation(window.dicosaLocation, false);
})();


// ===== Carnicerías: fachada interactiva + estado "abierto ahora" =====
(function () {
  const stage = document.getElementById('storeStage'), list = document.getElementById('featList');
  if (!stage || !list) return;
  const chip = document.querySelector('#storeChip span');
  const items = [...list.querySelectorAll('.feat')];
  const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  let cur = 0, timer = null, hover = false, visible = false;

  function pick(i) {
    cur = (i + items.length) % items.length;
    items.forEach((b, k) => b.classList.toggle('active', k === cur));
    stage.dataset.hl = items[cur].dataset.hl;
    chip.textContent = items[cur].dataset.label;
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (reduce || hover || !visible) return;
    timer = setTimeout(() => pick(cur + 1), 4200);
  }
  items.forEach((b, i) => {
    b.addEventListener('click', () => pick(i));
    b.addEventListener('mouseenter', () => { hover = true; pick(i); clearTimeout(timer); });
    b.addEventListener('focus', () => pick(i));
  });
  [list, stage].forEach(el => {
    el.addEventListener('mouseenter', () => { hover = true; clearTimeout(timer); });
    el.addEventListener('mouseleave', () => { hover = false; schedule(); });
  });
  new IntersectionObserver(es => es.forEach(en => { visible = en.isIntersecting; if (visible) schedule(); else clearTimeout(timer); }), { threshold: 0.3 }).observe(stage);

  // ¿Abierto ahora? Lun–Sáb 6:00–17:00, Dom 6:00–14:00 (hora local del visitante)
  const pill = document.getElementById('livePill'), sign = document.getElementById('openText');
  function status() {
    const d = new Date(), day = d.getDay(), m = d.getHours() * 60 + d.getMinutes();
    const close = day === 0 ? 14 * 60 : 17 * 60, open = 6 * 60;
    const isOpen = m >= open && m < close;
    const fmt = x => { const h = Math.floor(x / 60); return h + ':00'; };
    stage.dataset.time = isOpen ? 'day' : 'night';
    if (isOpen) { pill.className = 'live-pill on'; pill.textContent = 'Abierto ahora · cierra a las ' + fmt(close); if (sign) sign.textContent = 'ABIERTO'; }
    else { pill.className = 'live-pill'; pill.textContent = 'Cerrado ahora · abre ' + (m < open ? 'hoy' : 'mañana') + ' a las 6:00'; if (sign) { sign.textContent = 'CERRADO'; } }
  }
  status(); setInterval(status, 60000);
})();


// ===== Aviso de ubicación + aviso de privacidad discreto =====
(function () {
  const LKEY = 'dicosa_loc_v1', PKEY = 'dicosa_priv_v1';
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const $ = id => document.getElementById(id);
  const ov = $('locOverlay'), card = ov && ov.querySelector('.loc-card');
  const toast = $('privToast'), drawer = $('privDrawer');
  if (!ov || !toast || !drawer) return;
  const DAY = 864e5;
  let toastTimer = null;

  // ---------- Aviso de privacidad (panel lateral) ----------
  $('privDate').textContent = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long' });
  let lastFocus = null;
  function openPriv() { lastFocus = document.activeElement; drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); drawer.querySelector('.priv-close').focus(); }
  function closePriv() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); if (lastFocus) lastFocus.focus(); }
  document.querySelectorAll('[data-open-privacy]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openPriv(); }));
  drawer.querySelectorAll('[data-close-privacy]').forEach(b => b.addEventListener('click', closePriv));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (drawer.classList.contains('open')) closePriv(); else if (ov.classList.contains('show')) skip(); } });

  // ---------- Aviso de privacidad (aviso discreto) ----------
  function showToast() {
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('min'), window.innerWidth < 600 ? 6000 : 9000);   // se encoge solo a un escudito
    window.addEventListener('scroll', shrinkOnScroll, { passive: true });
  }
  function shrinkOnScroll() { if (window.scrollY > 500) { toast.classList.add('min'); window.removeEventListener('scroll', shrinkOnScroll); } }
  $('privShield').addEventListener('click', () => { toast.classList.toggle('min'); clearTimeout(toastTimer); });
  $('privOk').addEventListener('click', () => {
    clearTimeout(toastTimer);
    toast.classList.remove('show'); setTimeout(() => { toast.hidden = true; }, 600);
  });

  // ---------- Aviso de ubicación ----------
  function setState(s) { card.dataset.state = s; }
  function open() {
    ov.hidden = false; setState('ask');
    requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('show')));
    $('locAllow').focus({ preventScroll: true });
  }
  function close() {
    ov.classList.remove('show');
    setTimeout(() => { ov.hidden = true; }, 450);
    setTimeout(showToast, 900);
  }
  function skip() { store.set(LKEY, { choice: 'skip', t: Date.now() }); close(); }
  function goSuc() { close(); const s = $('sucursales'); if (s) setTimeout(() => s.scrollIntoView({ behavior: 'smooth' }), 400); }

  function broadcast(me) {
    window.dicosaLocation = me;
    document.dispatchEvent(new CustomEvent('dicosa:location', { detail: me }));
  }
  document.addEventListener('dicosa:nearest', e => {
    if (card.dataset.state !== 'wait') return;
    const d = e.detail;
    $('locResult').textContent = d
      ? 'Tu DICOSA más cercana es ' + d.name + ', a ' + d.km.toFixed(1) + ' km de ti.'
      : 'Ya tenemos tu ubicación. Pronto verás aquí la sucursal más cercana.';
    setState('ok');
  });

  function ask() {
    if (!navigator.geolocation) { setState('no'); return; }
    setState('wait');
    navigator.geolocation.getCurrentPosition(p => {
      store.set(LKEY, { choice: 'granted', t: Date.now() });
      broadcast({ lat: p.coords.latitude, lng: p.coords.longitude });
      setTimeout(() => { if (card.dataset.state === 'wait') setState('ok'), $('locResult').textContent = $('locResult').textContent || 'Ya tenemos tu ubicación.'; }, 1500);
    }, () => { store.set(LKEY, { choice: 'denied', t: Date.now() }); setState('no'); }, { timeout: 12000, maximumAge: 60000 });
  }

  $('locAllow').addEventListener('click', ask);
  $('locSkip').addEventListener('click', skip);
  $('locClose').addEventListener('click', skip);
  $('locDone').addEventListener('click', close);
  $('locDone2').addEventListener('click', close);
  $('locSee').addEventListener('click', goSuc);
  $('locSee2').addEventListener('click', goSuc);
  ov.addEventListener('click', e => { if (e.target === ov && card.dataset.state === 'ask') skip(); });

  // ---------- Cuándo mostrar ----------
  async function start() {
    const saved = store.get(LKEY);
    let perm = null;
    try { if (navigator.permissions) perm = (await navigator.permissions.query({ name: 'geolocation' })).state; } catch (e) {}

    if (perm === 'granted') {                         // ya dio permiso antes: sin avisos, directo a la sucursal
      navigator.geolocation.getCurrentPosition(p => broadcast({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { timeout: 8000, maximumAge: 300000 });
      setTimeout(showToast, 1500);
      return;
    }
    if (perm === 'denied' || !navigator.geolocation || (saved && saved.choice === 'skip' && Date.now() - saved.t < 7 * DAY)) {
      setTimeout(showToast, 1800);
      return;
    }
    setTimeout(open, 2200);
  }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();
