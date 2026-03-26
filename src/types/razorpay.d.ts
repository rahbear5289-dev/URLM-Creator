// TypeScript declarations for Razorpay

interface RazorpayOptions {
    key: string
    amount: number
    currency: string
    name: string
    description?: string
    image?: string
    order_id?: string
    receipt?: string
    handler?: (response: RazorpayResponse) => void
    prefill?: {
        name?: string
        email?: string
        contact?: string
    }
    theme?: {
        color?: string
        backdrop_color?: string
    }
    modal?: {
        ondismiss?: () => void
        escape?: boolean
        animation?: boolean
    }
    notes?: Record<string, string>
    callback_url?: string
    redirect?: boolean
    retry?: {
        enabled?: boolean
        max_count?: number
    }
    subscription_id?: string
    subscription_card_change?: boolean
    recurring?: boolean
    notify?: {
        sms?: boolean
        email?: boolean
    }
    reminder?: {
        enable?: boolean
        period?: number
    }
    expire_after?: number
    options?: {
        checkout?: {
            method?: {
                netbanking?: boolean
                card?: boolean
                emi?: boolean
                wallet?: boolean
                UPI?: boolean
            }
            obfurskie?: boolean
        }
    }
}

interface RazorpayResponse {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_subscription_id?: string
    razorpay_signature?: string
    razorpay_refund_id?: string
    payload?: {
        payment?: {
            entity?: {
                id: string
                amount: number
                currency: string
                status: string
            }
        }
    }
}

interface RazorpayInstance {
    open: () => void
    close: () => void
    on: (event: string, callback: (response: RazorpayResponse) => void) => void
}

interface Razorpay {
    new(options: RazorpayOptions): RazorpayInstance
}

declare global {
    interface Window {
        Razorpay: Razorpay
    }
}

export { }
