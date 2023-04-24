let mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;

Timer.set( 120*1000, true,
    function(ud)
    {
        //print(Shelly.getComponentStatus("temperature",0).tC);
        MQTT.publish( mqttPrefix+"/status/temperature:0", JSON.stringify( Shelly.getComponentStatus("temperature",0) ), 1, false );
    },
    null
);
