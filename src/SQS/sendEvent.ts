import AWS from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';

import { sqsQueueUrl } from '../env';
import { EventCreate, EventDelete, EventUpdate } from './eventTypes';

export const sendSetInSQSQueue = async (
    sqs: AWS.SQS,
    data: EventCreate | EventUpdate | EventDelete,
): Promise<PromiseResult<AWS.SQS.SendMessageResult, AWS.AWSError>> => {
    const params = { MessageBody: JSON.stringify(data), QueueUrl: sqsQueueUrl };
    return sqs.sendMessage(params).promise();
};
