import { Client }from '@elastic/elasticsearch';
import { createAWSConnection, awsGetCredentials } from '@acuris/aws-es-connection'
import {Context} from "aws-lambda";

module.exports.handler = async function (event, context: Context) {
    const awsCredentials = await awsGetCredentials()
    const AWSConnection = createAWSConnection(awsCredentials)
    const esClient = new Client({
        ...AWSConnection,
        node: process.env.DestinationEsClusterEndpoint,
        maxRetries: 5,
        requestTimeout: 60000
    });
    let response: any;
    let status: string = "Success";
    const payload = event.taskresult.body.snapshtname;
    try {

        try {
            console.log(`Closing open Product indexes `);
            // indices cannot be restored on already existing open indices
            const closeIndexRsp = await esClient.indices.close({
                index: '*'
            });
            console.info('closeIndexRsp => ', JSON.stringify(closeIndexRsp.body));
            if(!closeIndexRsp.body.acknowledged) {
                throw new Error(`Closing indexes failed.`)
            }
        } catch (err) {
            status = "Create Snapshot Failed";
            throw err;
        }

        try {
            console.log(`Restoring ${payload}`);
            const restoreRequestBody = {
                "ignore_unavailable": true,
                "ignore_index_settings": [
                    "index.refresh_interval"
                ],
                "index_settings": {
                    "index.number_of_replicas": 0
                }
            };
            const restoreReq = {
                repository: process.env.SnapRepositoryName,
                snapshot: payload,
                wait_for_completion: false,
                body: restoreRequestBody
            };
            console.log("restoreReq =>", JSON.stringify(restoreReq));
            const restoreSnapshotResponse = await esClient.snapshot.restore(restoreReq);
            console.info('restoreSnapshotResponse => ', JSON.stringify(restoreSnapshotResponse.body));
            if(!restoreSnapshotResponse.body.accepted) {
                throw new Error(`Backup ${payload} Restore Failed.`)
            }
        } catch (err) {
            console.log(`Error Restoring, falling back to re-opening closed Product indexes `);
            const openIndexRsp = await esClient.indices.open({
                index: 'products-*'
            });
            console.info('openIndexRsp => ', JSON.stringify(openIndexRsp.body));
            status = "Restore Failed";
            throw err;
        }

        response = {
            statusCode: 200,
            body: status,
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
