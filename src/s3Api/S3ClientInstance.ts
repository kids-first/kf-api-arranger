import { S3Client } from '@aws-sdk/client-s3';

class S3ClientInstance {
    private instance: S3Client;
    constructor() {
        if (!this.instance) {
            this.instance = new S3Client({});
        }
    }

    getInstance() {
        return this.instance;
    }
}

const singletonS3ClientInstance = new S3ClientInstance();

Object.freeze(singletonS3ClientInstance);

export default singletonS3ClientInstance;
