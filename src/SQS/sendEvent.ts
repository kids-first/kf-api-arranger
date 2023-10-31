import { SendMessageCommand, SendMessageCommandOutput, SQSClient } from '@aws-sdk/client-sqs';

import { sqsQueueUrl } from '../env';
import { EventCreate, EventDelete, EventUpdate } from './eventTypes';

export const sendSetInSQSQueue = async (
    sqs: SQSClient,
    data: EventCreate | EventUpdate | EventDelete,
): Promise<SendMessageCommandOutput> => {
    const command = new SendMessageCommand({
        QueueUrl: sqsQueueUrl,
        DelaySeconds: 10,
        MessageAttributes: {},
        MessageBody: JSON.stringify(data),
    });
    const response = await sqs.send(command);
    return response;
};
