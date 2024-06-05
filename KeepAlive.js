const mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;

Timer.set( 240*1000, true,
    function(ud)
    {
        let result = Shelly.getComponentStatus( "switch", 0 );
        delete result.source;
        delete result.freq;
        delete result.pf;
        delete result.temperature.tF;
        MQTT.publish( mqttPrefix+"/status/state:0", JSON.stringify(result), 0, false );
    },
    null
);
