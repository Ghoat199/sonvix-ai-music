import {createClient} from '@supabase/supabase-js';
export default async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const url=process.env.VITE_SUPABASE_URL;
  const publicKey=process.env.VITE_SUPABASE_ANON_KEY;
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!publicKey||!secret)return res.status(503).json({error:'Bonusvergabe ist noch nicht eingerichtet.'});
  const header=req.headers.authorization||'';
  if(!header.startsWith('Bearer '))return res.status(401).json({error:'Anmeldung erforderlich.'});
  try{
    const userClient=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error}=await userClient.auth.getUser(header.slice(7));
    if(error||!user)return res.status(401).json({error:'Ungültige Sitzung.'});
    if(!user.email_confirmed_at)return res.status(403).json({error:'Bitte zuerst E-Mail bestätigen.'});
    if(user.user_metadata?.sonvix_signup_platform!=='ai_music')
      return res.status(403).json({error:'Der Startbonus gilt nur für neue AI-Music-Registrierungen.'});
    const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error:rpcError}=await admin.rpc('sonvix_grant_ai_signup_bonus',{p_user:user.id});
    if(rpcError)throw rpcError;
    return res.status(200).json({granted:data===true});
  }catch(e){return res.status(500).json({error:'Bonusvergabe derzeit nicht möglich.'});}
}
