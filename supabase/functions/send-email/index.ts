import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customers, subject, message, providerInfo } = await req.json()

    // Validate input
    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      throw new Error('No customers provided')
    }

    if (!subject || !message) {
      throw new Error('Subject and message are required')
    }

    console.log(`📧 Sending email to ${customers.length} customers`)

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // For this example, we'll use Resend API for email sending
    // You can replace this with your preferred email service
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (!RESEND_API_KEY) {
      throw new Error('Email service not configured')
    }

    const results = []
    const errors = []

    // Send emails to each customer
    for (const customer of customers) {
      try {
        console.log(`📧 Sending email to ${customer.email}`)

        const emailData = {
          from: 'BuzyBees <noreply@buzybees.com>', // Replace with your domain
          to: [customer.email],
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #F59E0B;">Hello ${customer.name}!</h2>
              <div style="margin: 20px 0; line-height: 1.6;">
                ${message.replace(/\n/g, '<br>')}
              </div>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #6B7280; font-size: 14px;">
                Best regards,<br>
                ${providerInfo?.name || 'BuzyBees Team'}
                ${providerInfo?.phone ? `<br>Phone: ${providerInfo.phone}` : ''}
                ${providerInfo?.email ? `<br>Email: ${providerInfo.email}` : ''}
              </p>
            </div>
          `
        }

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData),
        })

        if (!response.ok) {
          const errorData = await response.text()
          throw new Error(`Email API error: ${errorData}`)
        }

        const result = await response.json()
        results.push({
          customer: customer.email,
          success: true,
          messageId: result.id
        })

        console.log(`✅ Email sent successfully to ${customer.email}`)

        // Optional: Log the email send to database
        await supabaseClient.from('email_logs').insert({
          recipient_email: customer.email,
          recipient_name: customer.name,
          subject: subject,
          message: message,
          status: 'sent',
          provider_id: providerInfo?.id,
          sent_at: new Date().toISOString()
        })

      } catch (error) {
        console.error(`❌ Failed to send email to ${customer.email}:`, error.message)
        errors.push({
          customer: customer.email,
          error: error.message
        })
      }
    }

    // Return results
    const response = {
      success: true,
      totalSent: results.length,
      totalFailed: errors.length,
      results: results,
      errors: errors,
      message: `Successfully sent ${results.length} emails, ${errors.length} failed`
    }

    console.log('📧 Email sending completed:', response)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Email sending error:', error.message)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})