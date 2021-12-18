# AWS Cross Region OpenSearch Backup Restore:
A serverless project to take cross region automated backup and restore of AWS OpenSearch for migration or disaster recovery.
This project creates a State machine that does daily automated Backup Restore of OpenSearch indices from one domain to another in same or different region for migration and disaster recovery purposes.

## How it works:

![ES Backup Restore](EsbackUpRestore.png)

- The step function calls es-backup-scheduler lambda to initiate a snapshot from the source ES domain into the registered s3 bucket.
- es-snapshot-validate-state loops until the snapshot creation is complete.
- Once the snapshot is complete, es-snapshot-restore lambda function restores the backup into the destination ES domain.

## Pre-requisites:

- Source ES domain in one region - This is will be the source from which backup will be created. If you don't have a source domain follow https://docs.aws.amazon.com/opensearch-service/latest/developerguide/gsgcreate-domain.html to create a domain.
- At least 1 ES Index with documents in the source domain - This index/indices will be restored in the destination domain and can be tested. Refer https://docs.aws.amazon.com/opensearch-service/latest/developerguide/gsgupload-data.html.
- Destination ES domain in same or different region - This will be destination ES domain where the backup will be restored to. If you don't have destination domain follow https://docs.aws.amazon.com/opensearch-service/latest/developerguide/gsgcreate-domain.html to create a domain.
- IAM user or federated role having read write access to both ES domains - This user/role is required to send an AWS sig4 signed HTTP request to ES domains to register the S3 bucket associated with taking snapshots. 
- Please refer to Step 2: Register a repository at https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-snapshots.html#es-managedomains-snapshot-prerequisites for more information. 


## Setup: 

### 1. Build the typescript project and deploy sam template

- `npm run build` - Clean and build the lambda code.
- `sam build` -  Creates SAM deployable
- `sam deploy --guided` - Deploy the SAM template in the region where the source ES domain exist, provide parameter values of the SAM template accordingly. 


### 2. Register the snapshot s3 bucket in the source and destination ES domain  

- Read https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-snapshots.html.
- In python-scripts/create-snapshot-repo.py change the value of `<es_endpoint> <region> <bucket-name> <role_arn>` using the value of output of SAM and register the S3 bucket created by SAM template to the source ES domain.
- In terminal, log into to the user or federated role. This user/role should have R/W access to both ES domain and should be same as the SAM template `EsOwnerArn` parameter .
- Install python3 and install dependencies using pip3.
- Run the python script. Ignore the warning of SSL in the response. Valid Response should show {"acknowledged":true}.
- In python-scripts/create-snapshot-repo.py change the value of `<es_endpoint> <region>` and register the same S3 bucket created by SAM template to the destination ES domain. 
- Run the python script. Ignore the warning of SSL in the response. Valid Response should show {"acknowledged":true}.


### 3. Add Lambda Execution Roles to OpenSearch Access Policy
- Change ES resource access policy to add Lambda execution roles so that Lambda can make Sig4 signed HTTP request to ES domains.
- Add es-backup-scheduler & es-snapshot-validate-state execution roles to Source ES domain access policy.
- Add es-snapshot-restore execution roles to destination ES domain access policy.
- Please note this setup might not be required for VPC OpenSearch based upon your access policy.

### 4. Run Step Function manually and test 

- Log into your AWS account. Go to step function console.
- Find your ES Backup restore step function and click start execution and test.

## Note:

- For simplicity this template uses non VPC OpenSearch. If you are using cross region VPC OpenSearch, this template needs to be broken into two templates.
- The first template will be deployed in the source region and will have the state machine with es-backup-scheduler & es-snapshot-validate-state lambdas with VpcConfig for the source region attached.
- The second template will be deployed in the destination region and will have the only es-snapshot-restore lambda with VpcConfig for the destination region.
- You will also need a way to notify es-snapshot-restore lambda in the destination region that snapshot has completed in the source region using a SNS topic created in the destination region.
