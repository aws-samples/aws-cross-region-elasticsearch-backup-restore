import { Client }from '@elastic/elasticsearch';
import { createAWSConnection, awsGetCredentials } from '@acuris/aws-es-connection'
import {Context} from "aws-lambda";

module.exports.handler = async function (event: any, context: Context) {
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
    const dt: string = getCurrDate();
    const snapShotName = "snapshot-" + dt;
    try {

        try {
            console.log(`Checking if snapshot repository ${process.env.SnapRepositoryName} exists ? `);
            const getRepositoryResponse = await esClient.snapshot.getRepository({
                repository: process.env.EsRepositoryName
            });
            console.info('getRepositoryResponse => ', JSON.stringify(getRepositoryResponse.body));

        } catch (err) {
            console.info("Repository Does not exists. Repository needs to be created first");
            throw err;
        }

        try {
            console.log(`Creating snapshot ${snapShotName} `);
            const snapshotReqBody = {
                "ignore_unavailable": true,
                "include_global_state": false
            };
            const createSanpshotResponse = await esClient.snapshot.create({
                repository: process.env.SnapRepositoryName,
                snapshot: snapShotName,
                wait_for_completion: false,
                body: snapshotReqBody
            });
            console.info('createSanpshotResponse => ', JSON.stringify(createSanpshotResponse.body));
        } catch (err) {
            status = "Create Snapshot Failed";
            throw err;
        }

        console.log(`Completed`);
        response = {
            statusCode: 200,
            body: {
                status: status,
                snapshtname: snapShotName
            }
        };

    } catch (err) {
        console.error(err);
        status = "Failed";

        response = {
            statusCode: 400,
            body: status,
            message: err
        };
        context.fail(JSON.stringify(response));
    }

    return context.succeed(response);
};

function getCurrDate() {
    const date_ob = new Date();
    return date_ob.getFullYear() + "." + date_ob.getMonth() + "." + date_ob.getDate() + "." + date_ob.getTime();
}
