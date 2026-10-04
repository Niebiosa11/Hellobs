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
    document.documentElement.removeAttribute('data-hbs-consent-needed');
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

  // Films start only when visible, muted; their existing controls always allow pausing.
  // The owner explicitly enables video autoplay also for reduced-motion preferences.
  const videos = [...document.querySelectorAll('video[data-lazy-video]')];
  const visible = new WeakSet();
  const manualPause = new WeakSet();
  const mayAutoplay = () => !navigator.connection?.saveData && !document.hidden;
  const startVideo = video => {
    if(!visible.has(video) || manualPause.has(video) || !mayAutoplay()) return;
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    const playing = video.play();
    if(playing?.catch) playing.catch(()=>{});
  };
  const loadVideo = video => {
    if(video.dataset.loaded) return;
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = mayAutoplay();
    video.querySelectorAll('source[data-src]').forEach(source => source.src = source.dataset.src);
    video.dataset.loaded = 'true';
    video.load();
  };
  videos.forEach(video=>{
    video.addEventListener('canplay',()=>startVideo(video));
    video.addEventListener('play',()=>manualPause.delete(video));
    video.addEventListener('pause',()=>{
      if(visible.has(video) && !document.hidden && video.readyState >= 2) manualPause.add(video);
    });
    video.addEventListener('pointerdown',()=>loadVideo(video),{once:true});
  });
  if('IntersectionObserver' in window){
    const observer = new IntersectionObserver(entries=>entries.forEach(entry=>{
      const video = entry.target;
      if(entry.isIntersecting){visible.add(video);loadVideo(video);startVideo(video);}
      else {visible.delete(video);video.autoplay=false;video.pause();}
    }), {rootMargin:'0px', threshold:0.01});
    videos.forEach(video=>observer.observe(video));
  } else videos.forEach(video=>{visible.add(video);loadVideo(video);startVideo(video);});
  document.addEventListener('visibilitychange',()=>videos.forEach(video=>{
    if(document.hidden){video.autoplay=false;video.pause();}else startVideo(video);
  }));
})();
