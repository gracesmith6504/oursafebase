import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { PasswordResetEmail } from './_templates/password-reset.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    const wh = new Webhook(hookSecret)
    
    let emailData
    try {
      emailData = wh.verify(payload, headers) as {
        user: {
          email: string
        }
        email_data: {
          token: string
          token_hash: string
          redirect_to: string
          email_action_type: string
          site_url: string
        }
      }
    } catch (verifyError) {
      console.error('Webhook verification failed:', verifyError)
      return new Response(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    const { user, email_data } = emailData
    const { token, token_hash, redirect_to, email_action_type } = email_data

    console.log(`Processing email for user: ${user.email}, type: ${email_action_type}`)

    // Only handle recovery (password reset) emails
    if (email_action_type !== 'recovery') {
      console.log(`Skipping non-recovery email type: ${email_action_type}`)
      return new Response(
        JSON.stringify({ message: 'Email type not handled by this function' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    // Render the React Email template
    const html = await renderAsync(
      React.createElement(PasswordResetEmail, {
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token,
        token_hash,
        redirect_to,
        email_action_type,
      })
    )

    // Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: 'OurSafeBase <no-reply@notifications.oursafebase.com>',
      to: [user.email],
      subject: 'Reset Your Password - OurSafeBase',
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Password reset email sent successfully:', data)

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset email sent' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  } catch (error) {
    console.error('Error in send-password-reset function:', error)
    return new Response(
      JSON.stringify({
        error: {
          message: error.message || 'Internal server error',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})
