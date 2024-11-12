import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { generatePreSignedUrl } from '.';
import { S3Error } from './errors';
import S3ClientInstance from './S3ClientInstance';

jest.mock('./S3ClientInstance');
jest.mock('@aws-sdk/s3-request-presigner');

describe('S3 Service', () => {
    describe('Generate Pre-Signed URL', () => {
        beforeEach(() => {
            (S3ClientInstance.getInstance as jest.Mock).mockReset();
            (getSignedUrl as jest.Mock).mockReset();
        });

        it('should return a presigned URL', async () => {
            (getSignedUrl as jest.Mock).mockResolvedValue('expected_result');

            const result = await generatePreSignedUrl('bucket', 'object_key');

            expect(result).toEqual('expected_result');
            expect((S3ClientInstance.getInstance as jest.Mock).mock.calls.length).toEqual(1);
            expect((getSignedUrl as jest.Mock).mock.calls.length).toEqual(1);
        });

        it('shoudl throw an error if S3 returns an error', async () => {
            const expectedError = new S3Error('OOPS from S3');
            (getSignedUrl as jest.Mock).mockRejectedValue(expectedError);

            try {
                await generatePreSignedUrl('bucket', 'object_key');
            } catch (e) {
                expect(e).toEqual(expectedError);
            } finally {
                expect((S3ClientInstance.getInstance as jest.Mock).mock.calls.length).toEqual(1);
                expect((getSignedUrl as jest.Mock).mock.calls.length).toEqual(1);
            }
        });
    });
});
