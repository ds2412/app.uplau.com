import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/qr/list - Pobierz wszystkie QR kody usera
export async function GET(request: NextRequest) {
    try {
        // Sprawdź czy user jest zalogowany
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Pobierz QR kody wraz z danymi linków
        const { data: qrCodes, error: qrError } = await supabaseAdmin
            .from('qr_codes')
            .select(`
                *,
                links (
                    id,
                    short_code,
                    original_url,
                    clicks,
                    created_at
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (qrError) {
            console.error('Error fetching QR codes:', qrError);
            return NextResponse.json(
                { error: 'Failed to fetch QR codes' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            qrCodes: qrCodes || []
        });

    } catch (error) {
        console.error('Error in /api/qr/list:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/qr/list - Usuń QR kod
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const qrId = searchParams.get('id');

        if (!qrId) {
            return NextResponse.json(
                { error: 'QR code ID is required' },
                { status: 400 }
            );
        }

        // Sprawdź czy user jest zalogowany
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Usuń QR kod (RLS sprawdzi czy należy do usera)
        const { error: deleteError } = await supabaseAdmin
            .from('qr_codes')
            .delete()
            .eq('id', qrId)
            .eq('user_id', user.id);

        if (deleteError) {
            console.error('Error deleting QR code:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete QR code' },
                { status: 500 }
            );
        }

        // Zmniejsz counter w monthly_usage
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const { data: usage } = await supabaseAdmin
            .from('monthly_usage')
            .select('qr_codes_created')
            .eq('user_id', user.id)
            .eq('year', year)
            .eq('month', month)
            .maybeSingle();

        if (usage && usage.qr_codes_created > 0) {
            await supabaseAdmin
                .from('monthly_usage')
                .update({ qr_codes_created: usage.qr_codes_created - 1 })
                .eq('user_id', user.id)
                .eq('year', year)
                .eq('month', month);
        }

        return NextResponse.json({
            success: true,
            message: 'QR code deleted successfully'
        });

    } catch (error) {
        console.error('Error in /api/qr/list DELETE:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
