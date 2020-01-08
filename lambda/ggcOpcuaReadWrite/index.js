//===============================================================================================
// name: ggcOpcuaReadWrite
// version: 0.0.1
//
// description: example function that reads a value from OPCUA server (temp C), converts value (temp F),
// and publishes the value back to server.  Function should be run long-lived.
// 
// requires enviromnental variables:
//      awsEndpoint     - aws IoT endpoint to write the data
//      awsTopic        - aws IoT thing shadow topic
//      opcusServer     - server address for the OPCUA server
//      subNodeId       - node ID assigned by OPCUA server (subscribe tag)
//      pubNodeId       - node ID assigned by OPCUA server (publish tag)
//      
//      Copyright (C) 2020  Jesse Cox WAGO Kontakttechnik GmbH & Co. KG
//
//      This program is free software: you can redistribute it and/or modify
//      it under the terms of the GNU General Public License as published by
//      the Free Software Foundation, either version 3 of the License, or
//      (at your option) any later version.
//
//      This program is distributed in the hope that it will be useful,
//      but WITHOUT ANY WARRANTY; without even the implied warranty of
//      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//      GNU General Public License for more details.
//
//      You should have received a copy of the GNU General Public License
//      along with this program.  If not, see <https://www.gnu.org/licenses/>.
//===============================================================================================

var opcua   = require("node-opcua");
var async   = require("async");
var AWS     = require('aws-sdk');

// these are environment variables used with key/value pair
var strOpcuaServer  = process.env.opcuaServer;
var strSubNodeId    = process.env.subNodeId;
var strPubNodeId    = process.env.pubNodeId;
var strAwsTopic     = process.env.awsTopic;
var strAwsEndpoint  = process.env.awsEndpoint;

var iotdata = new AWS.IotData({endpoint: strAwsEndpoint});
var client = new opcua.OPCUAClient();

var writeData       = 0;
var oldData         = 0;

var the_session, the_subscription;
async.series([

    // step 1 : connect to
    function(callback)  {
        client.connect(strOpcuaServer,function (err) {
            if(err) {
                console.log(" cannot connect to endpoint :" , strOpcuaServer );
            } else {
                console.log("Step 1 connected !");
            }
            callback(err);
        });
    },

    // step 2 : createSession
    function(callback) {
        client.createSession( function(err,session) {
            if(!err) {
                the_session = session;
                console.log("Step 2 : Created session");
            }
            callback(err);
        });
    },
    // step 3 : browse
    function(callback) {
       the_session.browse("RootFolder", function(err,browse_result){
           if(!err) {
               browse_result[0].references.forEach(function(reference) {
                   console.log("Step 3" + reference.browseName.toString());
               });
           }
           callback(err);
       });
    },
    // subscribe to a tag indefinitely
    function(callback) {

       the_subscription =new opcua.ClientSubscription(the_session,{
           requestedPublishingInterval: 100,
           requestedLifetimeCount: 10,
           requestedMaxKeepAliveCount: 2,
           maxNotificationsPerPublish: 10,
           publishingEnabled: true,
           priority: 10
       });

       the_subscription.on("started",function(){
            console.log("subscription started for 2 seconds - subscriptionId=" + the_subscription.subscriptionId);
          }).on("keepalive",function(){
            console.log("keepalive");
          }).on("terminated",function(){
            callback();
        });
       // install monitored item
       var monitoredItem  = the_subscription.monitor({
           nodeId: opcua.resolveNodeId(strSubNodeId),
           attributeId: opcua.AttributeIds.Value
       },
       {
           samplingInterval: 100,
           discardOldest: true,
           queueSize: 10
       },
       opcua.read_service.TimestampsToReturn.Both
       );
       console.log('Attribute ID: ' + JSON.stringify(opcua.AttributeIds.value));
       console.log("-------------------------------------");

       monitoredItem.on("changed",function(dataValue){
          console.log("variable 1 = " + dataValue.value.value);
          console.log("variable 1 = " + dataValue);
            writeData = ((dataValue.value.value * 1.8) + 32);
            var nodesToWrite = [{
                nodeId: strPubNodeId,
                attributeId: opcua.AttributeIds.Value,
                indexRange: null,
                value: { 
                    value: { 
                        dataType: opcua.DataType.Float,
                         value: writeData
                    }
                }
            }];
            if (writeData != oldData)  {
              the_session.write(nodesToWrite, function(err,statusCode,diagnosticInfo) {
                if (!err) {
                    console.log(" write ok" );
                    console.log(diagnosticInfo);
                    console.log(statusCode);
                    oldData = writeData;
                }
                var shadowObj = {state: 
                                    {reported: 
                                        {values:
                                            {   temp_f: writeData,
                                                temp_c: dataValue.value.value,
                                            }
                                        }
                                    }
                };
                // send to the GGC Thing Shadow change
                var params = {
                    topic: strAwsTopic,
                    payload: JSON.stringify(shadowObj),
                    qos: 0
                };
                iotdata.publish(params, function(err, data){
                    if(err){
                        console.log(err);
                    }
                    else{
                        console.log("success?");
                    }
                });
                    //callback(err);
                  });
                } 
               });
    },

    // close session
    function(callback) {
        the_session.close(function(err){
            if(err) {
                console.log("session closed failed ?");
            }
            callback();
        });
    }

],
function(err) {
    if (err) {
        console.log(" failure ",err);
    } else {
        console.log("done!");
    }
    client.disconnect(function(){});
}) ;

exports.handler = async (event) => {
    // TODO implement
    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
    };
    return response;
};