(() => {
  'use strict';
  const siteKey='0x4AAAAAAFNayMRRPSADoxdW'; // Public widget key; never a secret.
  const states=new WeakMap();
  let apiReady;
  function loadChallenge() {
    if(!apiReady) apiReady=new Promise((resolve,reject)=>{
      if(window.turnstile) return resolve();
      const script=document.createElement('script');
      script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async=true;
      const timeout=setTimeout(()=>reject(new Error('Challenge unavailable')),15000);
      script.onload=()=>{clearTimeout(timeout);window.turnstile?resolve():reject(new Error('Challenge unavailable'));};
      script.onerror=()=>{clearTimeout(timeout);reject(new Error('Challenge unavailable'));};
      document.head.append(script);
    }).catch(error=>{apiReady=undefined;throw error;});
    return apiReady;
  }
  async function challenge(form) {
    await loadChallenge();
    let state=states.get(form);
    if(!state) {
      const container=document.createElement('div');
      container.className='hbs-security-check';
      container.setAttribute('aria-label','Weryfikacja bezpieczeństwa formularza');
      form.querySelector('button[type="submit"], button:not([type])').before(container);
      state={id:null,resolve:null,reject:null};
      states.set(form,state);
    }
    return new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{state.resolve=null;state.reject=null;reject(new Error('Challenge timeout'));},60000);
      const finish=(token,error)=>{
        clearTimeout(timeout);state.resolve=null;state.reject=null;
        error?reject(new Error('Challenge failed')):resolve(token);
      };
      state.resolve=token=>finish(token,false);state.reject=()=>finish(null,true);
      if(state.id!==null) window.turnstile.remove(state.id);
      state.id=window.turnstile.render(form.querySelector('.hbs-security-check'),{
        sitekey:siteKey,action:'hbs_submit',theme:'light',size:'flexible',appearance:'interaction-only',
        'response-field':false,
        callback:token=>state.resolve?.(token),
        'error-callback':()=>{state.reject?.();return true;},
        'expired-callback':()=>state.reject?.(),
        'timeout-callback':()=>state.reject?.()
      });
    });
  }
  async function post(body) {
    const response=await fetch('/api/hbs-public',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
      credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(30000)
    });
    if(!response.ok) throw new Error('Submission failed');
    return response.json();
  }
  window.HBSSubmit={
    async start(form,purpose) {
      const token=await challenge(form);
      try {return await post({action:'start',purpose,token});}
      finally {const state=states.get(form);if(state?.id!==null&&state?.id!==undefined)window.turnstile.remove(state.id);if(state)state.id=null;}
    },
    async upload(db,ticket,file) {
      const {path,token}=await post({action:'upload',ticket,mime:file.type,size:file.size,name:file.name});
      const {error}=await db.storage.from('consultation-photos').uploadToSignedUrl(path,token,file,{contentType:file.type,upsert:false});
      if(error) throw new Error('Upload failed');
      return {path,name:file.name};
    },
    async submit(ticket,payload) {return post({action:'submit',ticket,payload});}
  };
})();
