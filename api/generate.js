// Vercel Serverless Function. No mock audio or invented success responses.
// A verified, licensed music generation provider must be integrated here.
export default async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const {prompt}=req.body||{};
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>2000)return res.status(400).json({error:'Bitte eine gültige Songbeschreibung eingeben (max. 2000 Zeichen).'});
  return res.status(503).json({error:'Die KI-Musikgenerierung ist noch nicht konfiguriert. Bitte einen lizenzierten API-Anbieter anbinden.',code:'PROVIDER_NOT_CONFIGURED'});
}
