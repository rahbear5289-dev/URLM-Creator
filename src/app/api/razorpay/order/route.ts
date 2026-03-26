import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { planId, billingCycle, userId, userEmail, userName, amount: customAmount } = body

        let amount = 0
        let planName = 'Wallet Top-up'
        let receiptPrefix = 'topup'

        if (customAmount) {
            // Direct amount provided for top-up
            amount = Math.round(Number(customAmount) * 100)
            receiptPrefix = 'wallet'
        } else {
            // Plan pricing in INR (in paise)
            const plans: Record<string, { monthly: number; yearly: number; name: string }> = {
                'pro': {
                    monthly: 89900, // ₹899
                    yearly: 719900, // ₹7199
                    name: 'Professional Plan'
                },
                'business': {
                    monthly: 289900, // ₹2899
                    yearly: 2319900, // ₹23199
                    name: 'Business Plan'
                }
            }

            const plan = plans[planId]
            if (!plan) {
                return NextResponse.json({ success: false, error: 'Invalid plan' }, { status: 400 })
            }
            amount = billingCycle === 'yearly' ? plan.yearly : plan.monthly
            planName = plan.name
            receiptPrefix = planId
        }

        const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
        const keySecret = process.env.RAZORPAY_KEY_SECRET

        if (!keyId || !keySecret) {
            return NextResponse.json({
                success: false,
                error: 'Payment gateway not configured'
            }, { status: 500 })
        }

        // Create order using Razorpay API directly
        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
            },
            body: JSON.stringify({
                amount: amount,
                currency: 'INR',
                receipt: `receipt_${receiptPrefix}_${Date.now()}`,
                notes: {
                    planId: planId || 'topup',
                    billingCycle: billingCycle || 'none',
                    userId: userId || 'demo',
                    userEmail: userEmail || 'demo@example.com'
                }
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Razorpay API error:', errorText)
            return NextResponse.json({
                success: false,
                error: 'Payment gateway error',
                details: errorText
            }, { status: 500 })
        }

        const order = await response.json()

        return NextResponse.json({
            success: true,
            orderId: order.id,
            amount: amount / 100,
            currency: 'INR',
            planName: planName,
            keyId: keyId
        })

    } catch (error) {
        console.error('Razorpay order creation failed:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({
            success: false,
            error: 'Failed to create payment order',
            details: errorMessage
        }, { status: 500 })
    }
}
