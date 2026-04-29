// @ts-nocheck
// c:\Users\jcarl\.gemini\antigravity\scratch\administrative-requests\supabase\functions\notify-admin\index.ts

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Usamos Deno.serve (nativo), eliminando la necesidad de importar desde deno.land
Deno.serve(async (req: Request) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record } = await req.json()

    console.log(`Nueva solicitud administrativa recibida: ${record.title}`)
    console.log(`Descripción: ${record.description}`)
    console.log(`Prioridad: ${record.priority}`)

    // Aquí puedes añadir lógica de envío de emails en el futuro
    
    return new Response(
      JSON.stringify({ 
        message: "Notificación procesada", 
        id: record.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
