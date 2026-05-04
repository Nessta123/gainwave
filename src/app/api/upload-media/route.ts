import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Trdo kodiran endpoint na tvojo varno domeno!
const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: "https://media.gain-wave.com:9000",
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY!,
        secretAccessKey: process.env.MINIO_SECRET_KEY!,
    },
    forcePathStyle: true,
});

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const path = formData.get('path') as string;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        await s3.send(new PutObjectCommand({
            Bucket: process.env.MINIO_BUCKET_NAME || 'gainwave-media',
            Key: path,
            Body: buffer,
            ContentType: file.type,
        }));

        // Javni URL, ki ga vrnemo v bazo
        const publicUrl = `https://media.gain-wave.com/${process.env.MINIO_BUCKET_NAME || 'gainwave-media'}/${path}`;
        
        return NextResponse.json({ url: publicUrl });
    } catch (e: any) {
        console.error("API UPLOAD ERROR:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
