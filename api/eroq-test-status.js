import {createClient} from '@supabase/supabase-js';
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 res.setHeader('Cache-Control','no-store');
 const url=process.env.VITE_SUPABASE_URL,anon=process.env.VITE_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret||!process.env.EROQ_API_KEY)return res.status(503).json({error:'Nicht konfiguriert.'});
 const token=(req.headers.authorization||'').replace(/^Bearer /,'');
 if(!token)return res.status(401).json({error:'Anmeldung erforderlich.'});
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await client.auth.getUser(token);
 if(error||!user)return res.status(401).json({error:'Ungültige Sitzung.'});
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:run,error:dbError}=await admin.from('sonvix_music_test_runs').select('provider_job_id,status').eq('id','eroq-first-test-v1').eq('user_id',user.id).maybeSingle();
 if(dbError)return res.status(500).json({error:'Status konnte nicht gelesen werden.'});
 if(!run)return res.status(200).json({status:'not_started'});
 if(!run.provider_job_id)return res.status(200).json({status:run.status});
 try{
  const response=await fetch('https://eroq.ai/v1/music/generations/'+encodeURIComponent(run.provider_job_id),{headers:{Authorization:'Bearer '+process.env.EROQ_API_KEY},signal:AbortSignal.timeout(12000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)return res.status(502).json({error:'eroq-Statusabfrage fehlgeschlagen.'});
  const status=data.status||'processing';
  if(['succeeded','failed'].includes(status))await admin.from('sonvix_music_test_runs').update({status}).eq('id','eroq-first-test-v1');
  const audio=data.data?.find?.(x=>x.url&&x.content_type==='audio/mpeg')||data.data?.find?.(x=>x.url);
  return res.status(200).json({status,jobId:run.provider_job_id,audioUrl:status==='succeeded'?audio?.url:null,seconds:audio?.seconds||null,error:status==='failed'?(data.error?.message||'Generierung fehlgeschlagen'):null});
 }catch{return res.status(502).json({error:'eroq-Status derzeit nicht erreichbar.'});}
}
