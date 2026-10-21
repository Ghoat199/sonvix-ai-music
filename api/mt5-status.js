export default async function handler(req, res) {
  try {
    // GET is diagnostic only; never writes data.
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        endpoint: "DELIVIO MT5 Bridge V1.3",
        env: {
          supabase_url: !!process.env.SUPABASE_URL,
          service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          mt5_bridge_key: !!process.env.MT5_BRIDGE_KEY
        }
      });
    }

    if (req.method !== "POST")
      return res.status(405).json({ ok:false, step:"method", error:"POST required" });

    if (!process.env.MT5_BRIDGE_KEY)
      return res.status(500).json({ ok:false, step:"env", error:"MT5_BRIDGE_KEY missing" });

    if (!process.env.SUPABASE_URL)
      return res.status(500).json({ ok:false, step:"env", error:"SUPABASE_URL missing" });

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
      return res.status(500).json({ ok:false, step:"env", error:"SUPABASE_SERVICE_ROLE_KEY missing" });

    if (req.headers["x-bridge-key"] !== process.env.MT5_BRIDGE_KEY)
      return res.status(401).json({ ok:false, step:"auth", error:"Bridge key invalid" });

    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); }
      catch (e) { return res.status(400).json({ok:false,step:"json",error:"Invalid JSON body",detail:e.message}); }
    }
    if (!body || typeof body !== "object")
      return res.status(400).json({ok:false,step:"json",error:"Body missing"});
    if (body.bot_id !== "gold-main")
      return res.status(400).json({ok:false,step:"bot_id",error:"Expected gold-main",received:body.bot_id ?? null});

    const sbUrl = process.env.SUPABASE_URL.replace(/\/+$/,"") +
      "/rest/v1/gold_autotrader_status?on_conflict=bot_id";

    const payload = {...body, updated_at:new Date().toISOString()};

    let r;
    try {
      r = await fetch(sbUrl,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "apikey":process.env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization":"Bearer "+process.env.SUPABASE_SERVICE_ROLE_KEY,
          "Prefer":"resolution=merge-duplicates,return=minimal"
        },
        body:JSON.stringify(payload)
      });
    } catch(e) {
      return res.status(502).json({ok:false,step:"supabase_fetch",error:e.message});
    }

    const txt = await r.text();
    if (!r.ok)
      return res.status(502).json({
        ok:false, step:"supabase_response", supabase_status:r.status,
        error:txt.slice(0,1000)
      });

    return res.status(200).json({ok:true,bridge:"V1.3",supabase_status:r.status});
  } catch(e) {
    console.error("MT5 BRIDGE V1.3 UNCAUGHT",e);
    return res.status(500).json({ok:false,step:"uncaught",error:String(e?.message || e)});
  }
}