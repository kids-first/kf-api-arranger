import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { cacheTTL } from '../env';
import { S3Error } from './errors';
import S3ClientInstance from './S3ClientInstance';

// Expires 5 min after cache expiry to be sure the pre signed url doesn't expire before the cache.
const PRE_SIGNED_URL_EXPIRY_SEC = cacheTTL + 300;

export const generatePreSignedUrl = async (bucket: string, key: string): Promise<string> => {
    const s3Client = S3ClientInstance.getInstance();

    const getObjectCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });

    try {
        return getSignedUrl(s3Client, getObjectCommand, { expiresIn: PRE_SIGNED_URL_EXPIRY_SEC });
    } catch (err) {
        throw new S3Error(err);
    }
};
