let mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;
let index      = 0;
let component  = "switch";

Timer.set( 90*1000, true,
    function(ud)
    {
        let result = Shelly.getComponentStatus( component, index );
        let topic  = mqttPrefix+"/status/"+component+":"+JSON.stringify(index);
        if( component === "switch" )
        {
            delete result.source;
            delete result.temperature.tF;
            component = "input";
        }
        else
        {
            component = "switch";
            if( index < 2 )
            {
                index++;
            }
            else
            {
                index = 0;
            }
        }
        MQTT.publish( topic, JSON.stringify( result ), 0, false );
    },
    null
);
