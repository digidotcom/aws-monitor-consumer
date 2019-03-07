## Overview

In this tutorial we will show how to push data from your Remote Manager account to an AWS IoT Analytics channel. We will use an HTTP Push Monitor to automatically push alerts and datapoints uploaded by devices.

This sample application consists of six major pecies:
1. A Remote Manager monitor to output data
2. An AWS API Gateway to receive the data
3. An AWS Lambda function to forward the data into the channel
4. An AWS IoT Analytics channel to queue data for processing
5. An AWS IoT Analytics pipeline to forward data from the channel to a datastore
6. An AWS IoT Analytics datastore to store the data

## Steps

#### 1) Setup an AWS Account
If you do not have an existing AWS account you will need to create one

#### 2) Setup the example application

Use AWS CloudFormation to build the application by clicking [this link](https://console.aws.amazon.com/cloudformation/home#/stacks/create/review?templateURL=https://raw.githubusercontent.com/digidotcom/aws-monitor-consumer/aws_demo.json&stackName=PushMonitorStack)

Input a name for this stack, this must be unique in your account

![stack name](resources/stack_name.png?raw=true)

The template used to generate the stack allows for changing two parameters

![stack parameters](resources/stack_parameters.png?raw=true)

These allow you to change the prefix used for generating resource names to ensure the resource names remain unique in your account or to alter the retention period of recieved message data

You will also need to allow CloudFormation to create a new IAM Role by checking this box

![check box](resources/check_box.png?raw=true)

This will create the following resources:
1. An AWS API Gateway named pushMonitorEndpoint containing a single method for handling POST messages. It will be deployed to a stage named prod.
2. An API key and associated usage plan named <ResourceNamePrefix>api_key and <ResourceNamePrefix>usage_plan respectively.
3. An AWS Lambda function named \<ResourceNamePrefix\>lambda that will be invoked by the API gateway.
4. An AWS Iot Analytics channel named \<ResourceNamePrefix\>channel.
5. An AWS IoT Analytics pipeline named \<ResourceNamePrefix\>pipeline.
6. An AWS IoT Analytics datastore named \<ResourceNamePrefix\>datastore.
7. An AWS IoT Analytics dataset named \<ResourceNamePrefix\>example_dataset.
8. An IAM role named \<ResourceNamePrefix\>role that the lambda function runs as which has the batchPutMessage permission for the channel.

#### 3) Extract required information

Once the stack has finished building navigate to the API Gateway console.

You will need to extract the invoke URL from the prod stage of the API Gateway and the value of the API key for use in the next step.

![invoke URL](resources/invoke_url.png?raw=true)


![api_key](resources/api_key.png?raw=true)

#### 4) Test the created stack

To test the stack we created we can use an HTTP client to make a POST request simulating how Remote Manager will interact with the created API Gateway.

Ex:
```
curl -X POST \
-H 'Content-Type: application/json' \
-H 'x-api-key:APIKEY' \
--data '{ "Document": { "Msg": {
    "DataPoint": {
        "data": 42,
        "id": "00000000-0000-0000-0000-000000000000",
        "streamId": "sample/datastream",
        "streamType": "INTEGER",
        "timestamp": 1551366000765
    },
    "group": "*",
    "operation": "INSERTION",
    "timestamp": "2019-02-28T15:00:30.922Z",
    "topic": "0/DataPoint/awssample/datastream"
  } } }' "https://API-ID.execute-api.REGION.amazonaws.com/prod"
```

You should receive a 200 response code and a message with the body
```
{"batchPutMessageErrorEntries":[]}
```

The dashboard for the API available from the API Gateway console should show that the API has been invoked once and didn't generate an error response.

![api dashboard](resources/api_dashboard.png?raw=true)

To ensure that the data has been stored in the datastore properly we can run the example data set created as part of the stack from the AWS IoT Analytics console.

![run dataset](resources/run_dataset.png?raw=true)

![view datapoint](resources/view_datapoint.png?raw=true)

#### 5) Setup a push monitor
Create a Remote Manager monitor by sending the monitor definition to the Digi Remote Manager API /ws/Monitor via a POST request.
The following properties should be specified:
1. monTopic - The specific event types to be forwarded. For ease of testing we will use the topic DataPoint/awssample
2. monTransportType - This must be http
3. monTransportUrl - The target URL to send the event data. This should be set to the invoke URL of the API gateway created in step 2
4. monTransportHeaders - The HTTP headers used when sending the event data. This should be set to x-api-key:API_KEY where API_KEY is the value of the API key that was created in step 2
5. monTransportMethod - This must be POST
6. monFormatType - This must be json

Ex:
```
curl -X POST \
-u REMOTE_MANAGER_USERNAME:REMOTE_MANAGER_PASSWORD \
--data '<Monitor>
  <monTopic>DataPoint/awssample</monTopic>
  <monTransportType>http</monTransportType>
  <monTransportUrl>https://API-ID.execute-api.REGION.amazonaws.com/prod</monTransportUrl>
  <monTransportHeaders>x-api-key:APIKEYVALUE</monTransportHeaders>
  <monTransportMethod>POST</monTransportMethod>
  <monFormatType>json</monFormatType>
</Monitor>' "https://remotemanager.digi.com/ws/Monitor"
```

#### 6) Test the push monitor
We can test that the monitor we created is working properly by adding a datapoint to the awssample data stream by making a POST request to the Digi Remote Manager API /ws/v1/streams/history.

Ex:
```
curl -X POST \
-H 'Content-Type: application/json' \
-u REMOTE_MANAGER_USERNAME:REMOTE_MANAGER_PASSWORD \
--data '{
  "stream_id": "awssample",
  "stream_type": "DOUBLE",
  "value": "42"
}' "https://remotemanager.digi.com/ws/v1/streams/history"
```

You can then use the API Gateway dashboard and example dataset to verify the datapoint is stored as in step 4