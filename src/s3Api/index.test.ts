import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { vi } from 'vitest';

import { generatePreSignedUrl } from '.';
import { S3Error } from './errors.js';
import S3ClientInstance from './S3ClientInstance.js';

vi.mock('./S3ClientInstance');
vi.mock('@aws-sdk/s3-request-presigner');

describe('S3 Service', () => {
    describe('Generate Pre-Signed URL', () => {
        beforeEach(() => {
            vi.mocked(S3ClientInstance.getInstance).mockReset();
            vi.mocked(getSignedUrl).mockReset();
        });

        it('should return a presigned URL', async () => {
            vi.mocked(getSignedUrl).mockResolvedValue('expected_result');

            const result = await generatePreSignedUrl('bucket', 'object_key');

            expect(result).toEqual('expected_result');
            expect(vi.mocked(S3ClientInstance.getInstance)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(getSignedUrl)).toHaveBeenCalledTimes(1);
        });

        it('shoudl throw an error if S3 returns an error', async () => {
            const expectedError = new S3Error('OOPS from S3');
            vi.mocked(getSignedUrl).mockRejectedValue(expectedError);

            await expect(generatePreSignedUrl('bucket', 'object_key')).rejects.toEqual(expectedError);
            expect(vi.mocked(S3ClientInstance.getInstance)).toHaveBeenCalledTimes(1);
            expect(vi.mocked(getSignedUrl)).toHaveBeenCalledTimes(1);
        });
    });
});
