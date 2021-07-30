import { Client }from '@elastic/elasticsearch';
import { createAWSConnection, awsGetCredentials } from '@acuris/aws-es-connection'
import {Context} from "aws-lambda";

module.exports.handler = async function (event, context: Context)  {
    const awsCredentials = await awsGetCredentials()
    const AWSConnection = createAWSConnection(awsCredentials)
    const esClient = new Client({
        ...AWSConnection,
        node: process.env.SourceEsClusterEndpoint,
        maxRetries: 5,
        requestTimeout: 60000
    });
    let response: any;
    let status: string = "Success";
    try {
        console.log(`Checking if snapshot ${(event.taskresult.body.snapshtname)}  is successful`);
        const getSnapshotResponse = await esClient.snapshot.get({
            repository: process.env.SnapRepositoryName,
            snapshot: event.taskresult.body.snapshtname,
            ignore_unavailable: true,
        });
        console.info('getSnapshotResponse => ', JSON.stringify(getSnapshotResponse.body));

        if (getSnapshotResponse.body.snapshots[0].state != "SUCCESS") {
            throw new Error("Snapshot is not complete");
        }
        console.log(`Completed`);
        // pass the snapshot name to the restore function
        response = {
            statusCode: 200,
            body: {
                status: status,
                snapshtname: event.taskresult.body.snapshtname,
            },
        };
    } catch (err) {
        console.error(err);
        status = "Failed";
        response = {
            statusCode: 400,
            body: status,
            message: err,
        };
        context.fail(JSON.stringify(response));
    }

    return context.succeed(response);
};
