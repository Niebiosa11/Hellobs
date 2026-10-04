'use strict';
const {timingSafeEqual}=require('node:crypto');
const BASE='https://syelrkckiubgxbslokmc.supabase.co';
const PATH=/^consultations\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp)$/;
function authorized(header,secret){
  if(typeof header!=='string'||typeof secret!=='string'||secret.length<32)return false;
  const expected=Buffer.from('Bearer '+secret),actual=Buffer.from(header);
  return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
function createCleanup({env=process.env,fetchImpl=fetch,log=console.log}={}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    const send=(status,body)=>res.status(status).json(body);
    if(req.method!=='GET')return send(405,{ok:false});
    if(!authorized(req.headers.authorization,env.CRON_SECRET))return send(401,{ok:false});
    if(!env.SUPABASE_SERVICE_ROLE_KEY)return send(503,{ok:false});
    const dryRun=env.HBS_CLEANUP_ENABLED!=='true';
    const deadline=Date.now()+40000;
    const counts={checked_records:0,deleted_tickets:0,eligible_orphans:0,deleted_orphan_uploads:0,errors:0,dry_run:dryRun};
    const remote=async(path,body,method='POST')=>{
      const r=await fetchImpl(BASE+path,{method,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},
        body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
      if(!r.ok)throw new Error('Cleanup operation failed');
      return r.json();
    };
    const rpc=(name,body={})=>remote('/rest/v1/rpc/'+name,body);
    try{
      const plan=await rpc('hbs_cleanup_candidates');
      if(!Number.isInteger(plan.checked)||plan.checked<0||!Array.isArray(plan.paths)||plan.paths.length>50
        ||plan.paths.some(p=>typeof p!=='string'||!PATH.test(p)))throw new Error('Invalid cleanup plan');
      counts.checked_records+=plan.checked;
      counts.eligible_orphans=plan.paths.length;
      // Candidate selection alone never authorizes deletion: recheck each relationship.
      // Process a bounded batch; retrying safely picks up files left by a failed run.
      if(!dryRun){
        for(let i=0;i<plan.paths.length&&Date.now()<deadline;i+=5){
          await Promise.all(plan.paths.slice(i,i+5).map(async path=>{
            try{
              if(await rpc('hbs_cleanup_confirm',{p_path:path})!==true)return;
              await remote('/storage/v1/object/consultation-photos',{prefixes:[path]},'DELETE');
              counts.deleted_orphan_uploads++;
            }catch{counts.errors++;}
          }));
        }
      }
      const tickets=await rpc('hbs_cleanup_tickets',{p_dry_run:dryRun});
      if(!Number.isInteger(tickets.checked)||!Number.isInteger(tickets.deleted))throw new Error('Invalid result');
      counts.checked_records+=tickets.checked;counts.deleted_tickets=tickets.deleted;
    }catch{counts.errors++;}
    // Counts only: never log paths, names, message bodies, IP hashes or credentials.
    log(JSON.stringify({event:'hbs_cleanup',...counts}));
    return send(counts.errors?503:200,{ok:counts.errors===0,...counts});
  };
}
module.exports={createCleanup,authorized};
