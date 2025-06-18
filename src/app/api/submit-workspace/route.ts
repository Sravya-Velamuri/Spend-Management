import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('API Route - Received data:', body);
    
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxWn3KdUV1BBc3971p4OZaknGeZG1Ft2Y7M5oTmCXIifel1APAZGFUSxJvlOglUcMM9/exec';
    
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const responseText = await response.text();
    console.log('Google Script Response:', responseText);
    
    // Try to parse as JSON, but handle if it's not JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      // If response is not JSON, still consider it successful if status is 200
      if (response.ok) {
        data = { success: true, message: 'Data submitted successfully' };
      } else {
        throw new Error('Invalid response from Google Script');
      }
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error submitting to Google Sheets' 
      },
      { status: 500 }
    );
  }
}

// Optional: Add a GET endpoint for testing
export async function GET() {
  return NextResponse.json({ 
    status: 'API route is working',
    timestamp: new Date().toISOString()
  });
}