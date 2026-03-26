import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle, userId, amount } = body

    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keySecret) {
      return NextResponse.json({
        success: false,
        error: 'Payment gateway not configured'
      }, { status: 500 })
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      )
    }

    // Calculate end date based on billing cycle (only for plans)
    let endDate = new Date()
    const isTopUp = planId === 'topup' || !planId
    
    if (!isTopUp) {
      if (billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1)
      } else {
        endDate.setMonth(endDate.getMonth() + 1)
      }
    }

    // Save transaction/update user to database
    if (userId) {
      if (isTopUp) {
        const { data: profile } = await supabase.from('profiles').select('inr_balance').eq('id', userId).single()
        const currentBalance = Number(profile?.inr_balance || 0)
        const topupAmount = Number(amount || 0)
        
        // We'll log the payment in activity_logs and increment balance
        await supabase.from('profiles').update({
          inr_balance: currentBalance + topupAmount
        }).eq('id', userId)

        await supabase.from('activity_logs').insert({
          user_id: userId,
          action: 'wallet_topup',
          description: `Added funds via Razorpay. Order: ${razorpay_order_id}`,
          file_name: `Payment: ${razorpay_payment_id}`
        })
      } else {
        // Update user profile to Pro
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            is_pro: true,
            plan_id: planId,
            storage_limit: planId === 'business' ? 107374182400 : 10737418240 // 100GB for business, 10GB for pro
          })
          .eq('id', userId)

        if (profileError) {
          console.error('Failed to update profile:', profileError)
        }

        // Insert subscription record
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_id: planId,
            billing_cycle: billingCycle,
            razorpay_order_id: razorpay_order_id,
            razorpay_payment_id: razorpay_payment_id,
            status: 'active',
            end_date: endDate.toISOString()
          })

        if (subError) {
          console.error('Failed to insert subscription:', subError)
        }

        // Log activity
        await supabase.from('activity_logs').insert({
          user_id: userId,
          action: 'subscription_upgraded',
          description: `Upgraded to ${planId} plan (${billingCycle})`,
          file_name: `Payment: ${razorpay_payment_id}`
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: isTopUp ? 'Wallet topped up successfully!' : 'Payment verified successfully! Your Pro plan is now active.',
      planId,
      billingCycle,
      userId
    })

  } catch (error) {
    console.error('Payment verification failed:', error)
    return NextResponse.json(
      { success: false, error: 'Payment verification failed' },
      { status: 500 }
    )
  }
}
