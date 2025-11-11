import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { PasswordResetEmail } from './_templates/password-reset.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string
const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'OurSafeBase <notifications@notifications.oursafebase.com>'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)
  const wh = new Webhook(hookSecret)
  
  try {
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
      }
    }

    // Only handle recovery emails
    if (email_action_type !== 'recovery') {
      return new Response(
        JSON.stringify({ error: 'Not a password reset email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const resetLink = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to)}`

    console.log('Sending password reset email to:', user.email)

    const html = await renderAsync(
      React.createElement(PasswordResetEmail, {
        resetLink,
        userEmail: user.email,
      })
    )

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject: 'Reset Your OurSafeBase Password',
      html,
      headers: {
        'X-Entity-Ref-ID': token_hash,
      },
      tags: [
        {
          name: 'category',
          value: 'password_reset',
        },
      ],
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Password reset email sent successfully:', data)

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in send-password-reset function:', error)
    return new Response(
      JSON.stringify({
        error: {
          message: error.message,
          code: error.code,
        },
      }),
      {
        status: error.code === 'invalid_signature' ? 401 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
