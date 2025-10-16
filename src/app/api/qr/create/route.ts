import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase';
import QRCode from 'qrcode';

// POST /api/qr/create - Generuj QR kod dla linka
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { linkId } = body;

        if (!linkId) {
            return NextResponse.json(
                { error: 'Link ID is required' },
                { status: 400 }
            );
        }

        // 1. Sprawdź czy user jest zalogowany
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // 2. Pobierz link z bazy (sprawdź czy należy do usera)
        const { data: link, error: linkError } = await supabaseAdmin
            .from('links')
            .select('id, short_code, original_url, user_id')
            .eq('id', linkId)
            .eq('user_id', user.id)
            .single();

        if (linkError || !link) {
            return NextResponse.json(
                { error: 'Link not found or you don\'t have permission' },
                { status: 404 }
            );
        }

        // 3. Sprawdź czy QR kod już istnieje dla tego linka
        const { data: existingQr } = await supabaseAdmin
            .from('qr_codes')
            .select('*')
            .eq('link_id', linkId)
            .maybeSingle();

        if (existingQr) {
            return NextResponse.json(
                { error: 'QR code already exists for this link. Delete it first to create a new one.' },
                { status: 409 } // 409 Conflict
            );
        }

        // 4. Pobierz usage i subscription usera
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const { data: usage } = await supabaseAdmin
            .from('monthly_usage')
            .select('*')
            .eq('user_id', user.id)
            .eq('year', year)
            .eq('month', month)
            .maybeSingle();

        const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('plan_id, status')
            .eq('user_id', user.id)
            .maybeSingle();

        // 5. Określ limity według planu
        let qrLimit = 1; // Domyślnie FREE (1 QR/miesiąc)

        if (subscription && subscription.status === 'active') {
            // Wszystkie plany mają 1 QR/miesiąc na razie
            qrLimit = 1;
        }

        // 6. Sprawdź czy user nie przekroczył limitu
        const currentQrCount = usage?.qr_codes_created || 0;

        if (currentQrCount >= qrLimit) {
            return NextResponse.json(
                {
                    error: `Monthly QR code limit reached (${qrLimit}/month)`,
                    limit: qrLimit,
                    current: currentQrCount
                },
                { status: 429 } // 429 Too Many Requests
            );
        }

        // 7. Generuj QR kod
        const shortDomain = process.env.NEXT_PUBLIC_SHORT_DOMAIN || 'http://localhost:3000';
        const shortUrl = `${shortDomain}/${link.short_code}`;

        // Opcje QR kodu
        const qrOptions: QRCode.QRCodeToDataURLOptions = {
            errorCorrectionLevel: 'H' as QRCode.QRCodeErrorCorrectionLevel,
            type: 'image/png',
            margin: 2,
            width: 512, // 512x512 px
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        };

        // Generuj jako base64 string
        const qrImageData = await QRCode.toDataURL(shortUrl, qrOptions);

        // 8. Zapisz do bazy
        const { data: newQr, error: insertError } = await supabaseAdmin
            .from('qr_codes')
            .insert({
                user_id: user.id,
                link_id: linkId,
                qr_image_data: qrImageData
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error inserting QR code:', insertError);
            return NextResponse.json(
                { error: 'Failed to save QR code' },
                { status: 500 }
            );
        }

        // 9. Zwiększ counter w monthly_usage
        if (usage) {
            // Update existing record
            await supabaseAdmin
                .from('monthly_usage')
                .update({ qr_codes_created: currentQrCount + 1 })
                .eq('user_id', user.id)
                .eq('year', year)
                .eq('month', month);
        } else {
            // Insert new record
            await supabaseAdmin
                .from('monthly_usage')
                .insert({
                    user_id: user.id,
                    year,
                    month,
                    links_created: 0,
                    qr_codes_created: 1
                });
        }

        // 10. Zwróć sukces z QR kodem
        return NextResponse.json({
            success: true,
            qrCode: newQr,
            shortUrl,
            message: 'QR code generated successfully'
        });

    } catch (error) {
        console.error('Error in /api/qr/create:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
