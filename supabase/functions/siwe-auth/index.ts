import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SiweMessage } from 'npm:siwe@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { address, message, signature } = await req.json()

    // Verify SIWE message
    const siweMessage = new SiweMessage(message)
    const fields = await siweMessage.verify({ signature })

    if (!fields.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if user exists
    const { data: existingUser, error: selectError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('address', address.toLowerCase())
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError
    }

    let userId = existingUser?.id

    if (!existingUser) {
      // Create new user if doesn't exist
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          address: address.toLowerCase(),
          auth: {
            lastAuth: new Date().toISOString(),
            lastAuthStatus: 'success',
            genNonce: siweMessage.nonce
          }
        })
        .select()
        .single()

      if (insertError) throw insertError
      userId = newUser.id
    } else {
      // Update existing user's auth data
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          auth: {
            lastAuth: new Date().toISOString(),
            lastAuthStatus: 'success',
            genNonce: siweMessage.nonce
          }
        })
        .eq('id', existingUser.id)

      if (updateError) throw updateError
    }

    // Create a custom token
    const { data: { user }, error: signInError } = await supabaseAdmin.auth.admin.createUser({
      email: `${address.toLowerCase()}@ethereum.org`,
      password: signature,
      email_confirm: true
    })

    if (signInError) throw signInError

    return new Response(
      JSON.stringify({ user }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})