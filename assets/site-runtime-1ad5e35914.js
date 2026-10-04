(() => {
  'use strict';
  const key = 'hbsPrivacyV1';
  let choice = null;
  try { const saved = JSON.parse(localStorage.getItem(key)); if(saved?.version === 1 && typeof saved.maps === 'boolean') choice = saved; } catch (_) {}
  const banner = document.getElementById('cookieBanner');
  const maps = [...document.querySelectorAll('iframe[data-consent-src]')];
  const apply = () => {
    maps.forEach(frame => {
      if(choice?.maps) frame.src = frame.dataset.consentSrc;
      else frame.removeAttribute('src');
    });
    banner?.classList.toggle('show', !choice);
  };
  const save = mapsAllowed => {
    choice = {version:1, maps:mapsAllowed, updatedAt:new Date().toISOString()};
    try {localStorage.setItem(key, JSON.stringify(choice));} catch (_) {}
    apply();
  };
  const dialog = document.createElement('dialog');
  dialog.className = 'privacy-dialog';
  dialog.setAttribute('aria-label','Ustawienia prywatności');
  dialog.innerHTML = '<h2>Ustawienia prywatności</h2><p>Ta strona nie uruchamia analityki ani reklam. Opcjonalna mapa Google łączy się z serwisem Google i może przekazywać mu dane techniczne Twojego urządzenia.</p><label><input type="checkbox" id="privacyMaps"> Zezwól na wczytanie mapy Google</label><button type="button" data-save-privacy>Zapisz ustawienia</button><button type="button" data-close-privacy>Anuluj</button><p><a href="/polityka-prywatnosci.html">Polityka prywatności</a></p>';
  document.body.append(dialog);
  const checkbox = dialog.querySelector('input');
  const open = () => {checkbox.checked = choice?.maps === true; dialog.showModal();};
  dialog.querySelector('[data-save-privacy]').addEventListener('click',()=>{save(checkbox.checked);dialog.close();});
  dialog.querySelector('[data-close-privacy]').addEventListener('click',()=>dialog.close());
  document.querySelectorAll('[data-cookie]').forEach(button=>button.addEventListener('click',()=>{
    if(button.dataset.cookie === 'settings') open();
    else save(button.dataset.cookie === 'accept');
  }));
  const settings = document.createElement('button');
  settings.type = 'button'; settings.className = 'privacy-settings'; settings.textContent = 'Ustawienia prywatności';
  settings.addEventListener('click',open);
  const footer = document.querySelector('footer');
  if(footer) footer.append(settings);
  else {const container=document.createElement('footer');container.append(settings);document.body.append(container);}
  apply();

  // Below-fold films remain full quality; download/play only near the viewport.
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const videos = [...document.querySelectorAll('video[data-lazy-video]')];
  const loadVideo = video => {
    if(video.dataset.loaded) return;
    video.querySelectorAll('source[data-src]').forEach(source => source.src = source.dataset.src);
    video.dataset.loaded = 'true'; video.load();
  };
  if('IntersectionObserver' in window){
    const observer = new IntersectionObserver(entries=>entries.forEach(entry=>{
      const video = entry.target;
      if(entry.isIntersecting){loadVideo(video); if(!reducedMotion.matches && !navigator.connection?.saveData) video.play().catch(()=>{});}
      else video.pause();
    }), {rootMargin:'0px', threshold:0.01});
    videos.forEach(video=>observer.observe(video));
  } else videos.forEach(loadVideo);
  videos.forEach(video=>video.addEventListener('pointerdown',()=>loadVideo(video),{once:true}));
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches) videos.forEach(video=>video.pause());});
})();
