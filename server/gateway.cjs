'use strict';
const {createHmac} = require('node:crypto');
const {isIP} = require('node:net');
const {verifyTurnstile} = require('./turnstile.cjs');
const SUPABASE_URL = 'https://syelrkckiubgxbslokmc.supabase.co';
const ORIGIN = 'https://hbhair.pl';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PURPOSES = ['booking','consultation_booking','contact'];
class GateError extends Error { constructor(status) {super('Request failed'); this.status=status;} }
function object(value) {return value!==null && typeof value==='object' && !Array.isArray(value);}
function validPayload(value) {
  return object(value) && typeof value.p_client_name==='string' && value.p_client_name.trim().length>=2 && value.p_client_name.length<=160
    && typeof value.p_phone==='string' && /^\+[1-9][0-9]{0,3} [0-9]{7,12}$/.test(value.p_phone)
    && typeof value.p_message==='string' && value.p_message.length<=10000 && !value.p_message.includes('[HBS_PHOTOS_V1]');
}
function createHandler({env=process.env,fetchImpl=fetch,verify=verifyTurnstile}={}) {
  return async function handler(req,res) {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    const send=(status,data)=>res.status(status).json(data);
    try {
      if(req.method!=='POST') {res.setHeader('Allow','POST'); throw new GateError(405);}
      if(req.headers.origin!==ORIGIN || (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site']!=='same-origin')) throw new GateError(403);
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')) throw new GateError(415);
      if(!env.TURNSTILE_SECRET_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) throw new GateError(503);
      // Vercel's trusted edge header; never accept a client-supplied remoteip from JSON.
      const ip=req.headers['x-vercel-forwarded-for'];
      if(typeof ip!=='string' || !isIP(ip)) throw new GateError(503);
      const hash=createHmac('sha256',env.TURNSTILE_SECRET_KEY).update('hbs-rate-limit\0'+ip).digest('hex');
      const body=typeof req.body==='string' ? JSON.parse(req.body) : req.body;
      if(!object(body) || Buffer.byteLength(JSON.stringify(body))>24000) throw new GateError(400);
      const remote=async(path,payload)=> {
        const response=await fetchImpl(SUPABASE_URL+path,{
          method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},
          body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)
        });
        if(!response.ok) throw new GateError(response.status>=500 ? 503 : 400);
        return response.json();
      };
      const rpc=(name,payload)=>remote('/rest/v1/rpc/'+name,payload);
      if(body.action==='start') {
        if(!PURPOSES.includes(body.purpose) || typeof body.token!=='string' || !body.token || body.token.length>2048) throw new GateError(400);
        if(await rpc('hbs_gate_limit',{p_ip_hash:hash})!==true) throw new GateError(429);
        const verification=await verify(body.token,{secret:env.TURNSTILE_SECRET_KEY,fetchImpl});
        if(!verification.ok) throw new GateError(verification.unavailable?503:403);
        const ticket=await rpc('hbs_gate_start',{p_ip_hash:hash,p_purpose:body.purpose});
        if(typeof ticket!=='string'||!UUID.test(ticket)) throw new GateError(503);
        return send(200,{ticket});
      }
      if(typeof body.ticket!=='string'||!UUID.test(body.ticket)) throw new GateError(400);
      if(body.action==='upload') {
        if(!['image/jpeg','image/png','image/webp'].includes(body.mime)||!Number.isInteger(body.size)||body.size<1||body.size>5242880
          ||typeof body.name!=='string'||!body.name||body.name.length>160||/[\x00-\x1f\x7f]/.test(body.name)) throw new GateError(400);
        const path=await rpc('hbs_gate_upload',{p_ticket:body.ticket,p_ip_hash:hash,p_mime:body.mime,p_size:body.size,p_name:body.name});
        const pathPattern=new RegExp('^consultations/'+body.ticket+'/[a-f0-9-]{36}\\.(jpg|png|webp)$','i');
        if(typeof path!=='string'||!pathPattern.test(path)) throw new GateError(503);
        const signed=await remote('/storage/v1/object/upload/sign/consultation-photos/'+path,{});
        // Return only a restricted upload token, never the server credential or upstream errors.
        const url=new URL('/storage/v1'+signed.url,SUPABASE_URL);
        if(url.origin!==SUPABASE_URL || url.pathname!=='/storage/v1/object/upload/sign/consultation-photos/'+path) throw new GateError(503);
        const token=url.searchParams.get('token');
        if(!token) throw new GateError(503);
        return send(200,{path,token});
      }
      if(body.action==='submit') {
        if(!validPayload(body.payload)) throw new GateError(400);
        const created=await rpc('hbs_gate_finish',{p_ticket:body.ticket,p_ip_hash:hash,p_payload:body.payload});
        if(typeof created!=='string'||!UUID.test(created)) throw new GateError(503);
        return send(200,{ok:true});
      }
      throw new GateError(400);
    } catch(error) {
      // No request bodies, private keys or raw upstream database errors are logged or returned.
      const status=error instanceof GateError?error.status:503;
      return send(status,{ok:false,error:status===429?'Poczekaj chwilę przed kolejną próbą.':'Nie udało się wysłać zgłoszenia. Spróbuj ponownie później.'});
    }
  };
}
module.exports={createHandler,validPayload};
