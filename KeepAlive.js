let mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;
let index      = 0;
let component  = "switch";

Timer.set( 60*1000, true,
    function(ud)
    {
        let result = Shelly.getComponentStatus( component, index );
        MQTT.publish( mqttPrefix+"/status/"+component+":"+JSON.stringify(index), 
                      JSON.stringify( result ), 0, false );
        if( index < 2 )
        {
            index++;
        }
        else
        {
            index = 0;
            if( component === "switch" )
            {
                component = "input";
            }
            else
            {
                component = "switch";
            }
        }
    },
    null
);
