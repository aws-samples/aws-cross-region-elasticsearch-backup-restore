import boto3
import requests
from requests_aws4auth import AWS4Auth

host = 'https://<es_endpoint>/' # include https:// and trailing /. Should Match SourceEsClusterEndpoint Or DestinationEsClusterEndpoint
region = '<region>' # change accordingly e.g. us-west-1
service = 'es'
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key, region, service, session_token=credentials.token)

# Register repository

path = '_snapshot/es-manual-snapshots-repo' #  snapshot repository name e.g /es-manual-snapshots-repo. should match the value of SnapShotRepositoryName parameter in SAM template
url = host + path

payload = {
            "type": "s3",
            "settings": {
              "bucket": "<bucket-name>", # Copy from SAM CloudFormation Output value of EsSnapShotBucketName
              "role_arn": "<role_arn>", # Copy from SAM CloudFormation Output value of EsSnapShotPassRoleArn
              "endpoint": "s3.amazonaws.com"
            }
          }

headers = {"Content-Type": "application/json"}

r = requests.put(url, auth=awsauth, json=payload, headers=headers, verify=True)

print(r.status_code)
print(r.text)
