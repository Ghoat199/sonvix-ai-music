import {createClient} from '@supabase/supabase-js';
export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 if(process.env.EROQ_TEST_ENABLED!=='true')return res.status(503).json({error:'Der einmalige Musiktest ist noch gesperrt.',code:'TEST_DISABLED'});
 const url=process.env.VITE_SUPABASE_URL,anon=process.env.VITE_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret||!process.env.EROQ_API_KEY||!process.env.EROQ_TEST_USER_EMAIL)return res.status(503).json({error:'Testkonfiguration unvollständig.'});
 const token=(req.headers.authorization||'').replace(/^Bearer /,'');
 if(!token)return res.status(401).json({error:'Anmeldung erforderlich.'});
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await client.auth.getUser(token);
 if(authError||!user?.email_confirmed_at)return res.status(401).json({error:'Ungültige Sitzung.'});
 if(user.email?.toLowerCase()!==process.env.EROQ_TEST_USER_EMAIL.toLowerCase())return res.status(403).json({error:'Der Test ist nur für das freigegebene Konto verfügbar.'});
 const {prompt,title,genre,mood,language,instrumental,lyricsMode,lyrics}=req.body||{};
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>600)return res.status(400).json({error:'Songbeschreibung: 1–600 Zeichen.'});
 if(lyricsMode==='own'&&typeof lyrics==='string'&&lyrics.length>3000)return res.status(400).json({error:'Songtext zu lang.'});
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 // Globally unique fixed ID makes the one-time reservation atomic even with parallel requests.
 const id='eroq-first-test-v1';
 const {error:reservationError}=await admin.from('sonvix_music_test_runs').insert({id,user_id:user.id,status:'reserved'});
 if(reservationError){if(reservationError.code==='23505')return res.status(409).json({error:'Der einmalige Test wurde bereits gestartet oder reserviert. Keine weitere Generierung möglich.'});return res.status(503).json({error:'Testreservierung fehlgeschlagen. Es wurden keine eroq-Credits verbraucht.'});}
 const style=[language||'Deutsch',instrumental?'instrumental':'male vocals',genre||'Pop',mood||'emotional',prompt].join(', ').slice(0,600);
 const payload={model:'eroq-music-one',seconds:120,n:1,instrumental:!!instrumental,title:String(title||'SONVIX Test').slice(0,80)};
 if(lyricsMode==='own'&&!instrumental&&String(lyrics||'').trim()){payload.style=style;payload.lyrics=String(lyrics).slice(0,3000)}else{payload.prompt=(language||'Deutsch')+' song, '+prompt;payload.prompt=payload.prompt.slice(0,600)}
 try{
  const response=await fetch('https://eroq.ai/v1/music/generations',{method:'POST',headers:{Authorization:'Bearer '+process.env.EROQ_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){await admin.from('sonvix_music_test_runs').update({status:'rejected'}).eq('id',id);return res.status(502).json({error:'eroq hat den Auftrag abgelehnt: '+(data.error?.message||data.error||response.status),code:'PROVIDER_REJECTED'});}
  const jobId=data.jobs?.[0]?.id;
  if(!jobId)throw Error('eroq lieferte keine Job-ID.');
  await admin.from('sonvix_music_test_runs').update({status:'processing',provider_job_id:jobId}).eq('id',id);
  return res.status(202).json({status:'processing',jobId,message:'Ein Song mit 120 Sekunden und einem Take wurde gestartet.'});
 }catch(e){console.error('SONVIX eroq generation failed:',e?.name||'Error',String(e?.message||'unknown').slice(0,300));await admin.from('sonvix_music_test_runs').update({status:'unknown'}).eq('id',id);return res.status(502).json({error:'Status des Auftrags unklar. Zum Schutz des Guthabens ist kein automatischer Wiederholungsversuch erlaubt.'});}
}
