'use strict';
// Server-only: never import this module from a browser script or put secrets in source.
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
async function verifyTurnstile(token, {secret=process.env.TURNSTILE_SECRET_KEY, fetchImpl=fetch, expectedAction='hbs_submit', allowedHostnames=['hbhair.pl','www.hbhair.pl']}={}) {
  if (!secret) return {ok:false, unavailable:true};
  if (typeof token !== 'string' || !token.trim() || token.length>2048) return {ok:false, unavailable:false};
  try {
    const response=await fetchImpl(SITEVERIFY, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({secret,response:token}), signal:AbortSignal.timeout(8000)
    });
    if (!response.ok) return {ok:false, unavailable:true};
    const result=await response.json();
    return {ok:result.success===true && allowedHostnames.includes(result.hostname) && result.action===expectedAction, unavailable:false};
  } catch { return {ok:false, unavailable:true}; }
}
module.exports={verifyTurnstile};
