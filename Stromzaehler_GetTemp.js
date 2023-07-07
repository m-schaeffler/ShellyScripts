let mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;

Timer.set( 120*1000, true,
    function(ud)
    {
        let temp = Shelly.getComponentStatus("temperature",0); 
        print(temp.tC);
        MQTT.publish( mqttPrefix+"/status/temperature:0", JSON.stringify( Shelly.getComponentStatus("temperature",0) ), 1, false );
    },
    null
);

print("started");
