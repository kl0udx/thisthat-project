// app/api/webhooks/zapier/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase with service key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lhhcekxyambgxdpjosrz.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ''

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json()
    console.log('Webhook received:', body)

    // Extract data from Zapier (parsed from BMC email)
    const {
      amount,           // Payment amount (e.g., "3", "9", "15")
      message,          // BMC comment/message containing room code
      supporter_name,   // Supporter's name (optional)
      coffee_count,     // Number of coffees (optional)
      email_body        // Full email body (fallback)
    } = body

    // Extract room code from message or email body
    // Try message first (BMC comment), then fall back to email body
    const textToSearch = message || email_body || ''
    const roomCodeMatch = textToSearch.match(/[A-Z0-9]{8}/i)
    
    if (!roomCodeMatch) {
      console.error('No room code found in message:', textToSearch)
      return NextResponse.json(
        { error: 'No room code found in message' },
        { status: 400 }
      )
    }

    const roomCode = roomCodeMatch[0].toUpperCase()
    console.log('Extracted room code:', roomCode)

    // Calculate minutes to add based on amount or coffee count
    let minutesToAdd = 0
    
    // If we have coffee_count from Zapier parsing
    if (coffee_count) {
      const count = parseInt(coffee_count)
      if (count >= 5) minutesToAdd = 240      // 4 hours
      else if (count >= 3) minutesToAdd = 120 // 2 hours
      else if (count >= 1) minutesToAdd = 30  // 30 minutes
    } else {
      // Fall back to amount calculation
      const coffeePrice = 3 // $3 per coffee
      const coffeeCount = Math.floor(parseFloat(amount) / coffeePrice)
      
      if (coffeeCount >= 5) minutesToAdd = 240      // 4 hours
      else if (coffeeCount >= 3) minutesToAdd = 120 // 2 hours  
      else if (coffeeCount >= 1) minutesToAdd = 30  // 30 minutes
    }

    if (minutesToAdd === 0) {
      console.error('Invalid amount:', amount, 'or coffee_count:', coffee_count)
      return NextResponse.json(
        { error: 'Invalid payment amount' },
        { status: 400 }
      )
    }

    console.log(`Adding ${minutesToAdd} minutes to room ${roomCode}`)

    // Get current room session
    const { data: roomSession, error: fetchError } = await supabaseAdmin
      .from('room_sessions')
      .select('*')
      .eq('room_code', roomCode)
      .single()

    if (fetchError || !roomSession) {
      console.error('Room not found:', roomCode, fetchError)
      // Don't fail the webhook - they still paid!
      // Log for manual resolution
      console.error('Payment received for non-existent room:', {
        roomCode,
        amount: amount || 'unknown',
        coffee_count: coffee_count || 'unknown',
        supporter: supporter_name || 'unknown'
      })
      
      return NextResponse.json({
        success: true,
        warning: 'Room not found, payment logged for manual resolution'
      })
    }

    // Add time to the room
    const secondsToAdd = minutesToAdd * 60
    const newTimeRemaining = (roomSession.time_remaining_seconds || 0) + secondsToAdd
    const newTotalTimeAdded = (roomSession.total_time_added || 0) + secondsToAdd
    const newPaymentCount = (roomSession.payment_count || 0) + 1

    const { error: updateError } = await supabaseAdmin
      .from('room_sessions')
      .update({
        time_remaining_seconds: newTimeRemaining,
        total_time_added: newTotalTimeAdded,
        payment_count: newPaymentCount,
        is_readonly: false, // Reactivate room if it was read-only
        updated_at: new Date().toISOString()
      })
      .eq('room_code', roomCode)

    if (updateError) {
      console.error('Failed to update room:', updateError)
      return NextResponse.json(
        { error: 'Failed to update room time' },
        { status: 500 }
      )
    }

    // Log the payment for records
    console.log('Payment processed successfully:', {
      roomCode,
      minutesAdded: minutesToAdd,
      supporter: supporter_name || 'Anonymous',
      amount
    })

    // Return success
    return NextResponse.json({
      success: true,
      roomCode,
      minutesAdded: minutesToAdd,
      newTimeRemaining: Math.floor(newTimeRemaining / 60), // in minutes
      supporter: supporter_name || 'Anonymous'
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Optional: Add GET endpoint for testing
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Zapier webhook endpoint is running'
  })
}