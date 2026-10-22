// Read-only provider readiness check. Never starts a paid music job.
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  res.setHeader('Cache-Control','no-store');
  if(!process.env.EROQ_API_KEY)return res.status(503).json({ready:false,reason:'EROQ_API_KEY is not configured in this deployment.'});
  try{
    const response=await fetch('https://eroq.ai/v1/engines',{headers:{Authorization:'Bearer '+process.env.EROQ_API_KEY,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)return res.status(502).json({ready:false,reason:response.status===401?'API key rejected by eroq.':'eroq status check returned HTTP '+response.status});
    const engine=data.models?.['eroq-music-one'];
    return res.status(200).json({configured:true,engine:engine??null,engineStatusKnown:engine!==undefined,message:'No music credits have been spent.'});
  }catch(err){return res.status(502).json({ready:false,reason:'eroq is temporarily unreachable.'});}
}
