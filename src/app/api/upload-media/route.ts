import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
    region: 'us-east-1',
    endpoint: "http://91.98.116.217:9000",
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'admin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'GainWaveSlovenia2024',
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
        const bucketName = process.env.MINIO_BUCKET_NAME || 'gainwave';

        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: path,
            Body: buffer,
            ContentType: file.type,
        }));

        const publicUrl = `https://www.gain-wave.com/media/${path}`;
        
        return NextResponse.json({ url: publicUrl });
    } catch (e: any) {
        console.error("API UPLOAD ERROR:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
