//===============================================================================================
// name: ggcGetLogixInfo
// version: 0.0.1
//
// description: when a message is received function will query a Rockwell Logix controller 
// for processor data and status using CIP messaging and will publish to IoT thing shadow
// 
// requires enviromnental variables:
//      awsEndpoint     - the aws IoT endpoint to write the data
//      awsShadowTopic  - the topic used for the IoT Thing Shadow
//      logixAddress    - ip address of the Logix controller
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

exports.handler = async (event) => {

    const strAwsEndpoint    = process.env.awsEndpoint;
    const strAwsShadowTopic = process.env.awsShadowTopic;
    const strLogixAddr      = process.env.logixAddress; 

    console.log(JSON.parse(process.env));

    var AWS = require('aws-sdk');
    var iotdata = new AWS.IotData({endpoint: strAwsEndpoint});
    
    // include the EIP libs and create an instance of the controller
    const { Controller } = require('ethernet-ip');
    const PLC = new Controller();
 
    console.log("ready to connect to PLC");

    // Controller.connect(IP_ADDR[, SLOT]) ** NOTE: SLOT = 0 (default) - 0 if CompactLogix
    PLC.connect(strLogixAddr, 0).then(() => {
        console.log("Connected to PLC");
        //var plcObj = JSON.parse(PLC.properties);
        var shadowObj = {state: 
                            {reported: 
                                {logixPLC:
                                    {
                                        name: PLC.properties.name,
                                        serial_number: PLC.properties.serial_number, 
                                        slot: PLC.properties.slot,
                                        time: PLC.properties.time, // last read controller WallClock datetime
                                        version: PLC.properties.version, // eg "30.11"
                                        faulted: PLC.properties.faulted,  // will be true if any of the below are true
                                        minorRecoverableFault: PLC.properties.minorRecoverableFault,
                                        minorUnrecoverableFault: PLC.properties.minorUnrecoverableFault,
                                        majorRecoverableFault: PLC.properties.majorRecoverableFault,
                                        majorUnrecoverableFault: PLC.properties.majorUnrecoverableFault
                                    }
                                }
                            }
        };
        // send to the GGC Thing Shadow
        var params = {
            topic: strAwsShadowTopic,
            payload: JSON.stringify(shadowObj),
            qos: 0
        };
        iotdata.publish(params, function(err, data){
            if(err){
                console.log(err);
            }
            else{
                console.log("success");
            }
        });
    console.log(PLC.properties);
    });
};