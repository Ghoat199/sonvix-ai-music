import {createClient} from '@supabase/supabase-js';
// Deliberately disabled until per-user billing and abuse prevention are in place.
export default async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const {prompt,title,genre,mood,language,instrumental,lyricsMode,lyrics}=req.body||{};
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>600)return res.status(400).json({error:'Songidee muss zwischen 1 und 600 Zeichen enthalten.'});
  if(lyricsMode==='own'&&(!lyrics||lyrics.length>3000))return res.status(400).json({error:'Eigene Songtexte dürfen höchstens 3000 Zeichen lang sein.'});
  if(process.env.EROQ_GENERATION_ENABLED!=='true')return res.status(503).json({error:'eroq ist verbunden. Songgenerierung wird nach Einrichtung der Kostenkontrolle freigeschaltet.',code:'GENERATION_LOCKED'});
  if(!process.env.EROQ_API_KEY)return res.status(503).json({error:'Musik-API nicht eingerichtet.'});
  const url=process.env.VITE_SUPABASE_URL,key=process.env.VITE_SUPABASE_ANON_KEY;
  const token=(req.headers.authorization||'').replace(/^Bearer /,'');
  if(!url||!key||!token)return res.status(401).json({error:'Bitte zuerst anmelden.'});
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await client.auth.getUser(token);
  if(authError||!user||!user.email_confirmed_at)return res.status(401).json({error:'Anmeldung oder E-Mail-Bestätigung erforderlich.'});
  // Never enable without a transactional server-side per-user quota, idempotency
  // and a global spend limit. Checking only client credits is insufficient.
  return res.status(503).json({error:'Sichere Generierung wartet auf serverseitige Credit-Reservierung.',code:'QUOTA_NOT_CONFIGURED'});
}
