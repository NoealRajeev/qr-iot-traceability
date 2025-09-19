import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import Jimp from 'jimp';
import QrCode from 'qrcode-reader';

const prisma = new PrismaClient();

const ensureUploadDir = async () => {
    const uploadPath = path.join(process.cwd(), 'public', 'uploads');
    try {
        await fs.access(uploadPath);
    } catch {
        await fs.mkdir(uploadPath, { recursive: true });
    }
    return uploadPath;
};

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('image') as File | null;
        const lotId = formData.get('lotId') as string;

        if (!file || !lotId) {
            return NextResponse.json({ error: 'Missing image or lotId' }, { status: 400 });
        }

        // 1. Save the image to the uploads directory
        const uploadPath = await ensureUploadDir();
        const fileName = `${lotId}-${Date.now()}.jpg`;
        const filePath = path.join(uploadPath, fileName);
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, fileBuffer);
        const photoUrl = `/uploads/${fileName}`;

        // 2. Decode QR code from the image buffer
        let decodedText = '';
        let labelOk = false;

        try {
            // Read the image buffer with Jimp
            const jimpImage = await Jimp.read(fileBuffer);
            const qr = new QrCode();

            // Wrap the callback-based decode in a Promise
            decodedText = await new Promise((resolve, reject) => {
                qr.callback = (err: Error | null, value: { result: string } | undefined) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(value?.result || '');
                };
                qr.decode(jimpImage.bitmap);
            });

            labelOk = decodedText === lotId;
        } catch (e) {
            console.error('QR Decode Error:', e);
            // On decode failure, decodedText remains an empty string, and labelOk remains false.
        }

        // 3. Create event in database
        const event = await prisma.event.create({
            data: {
                lotId: lotId,
                type: 'GATE_SCAN',
                labelOk: labelOk,
                photoUrl: photoUrl,
            },
        });

        return NextResponse.json({ success: true, event, decodedText });
    } catch (error) {
        console.error('API Event Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}