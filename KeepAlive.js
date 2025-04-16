const mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;
let   index      = 0;
let   components = ["switch:0","switch:1","input:0","input:1"];

Timer.set( 60*1000, true,
    function(ud)
    {
        let result = Shelly.getComponentStatus( components[index] );
        MQTT.publish( mqttPrefix+"/status/"+components[index], JSON.stringify( result ), 0, false );
        if( ++index >= components.length )
        {
            index = 0;
        }
    },
    null
);
