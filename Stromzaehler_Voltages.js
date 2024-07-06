const minVoltage = 230-23;
const maxVoltage = 230+23;
const mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;
const text200    = Virtual.getHandle( "text:200" );

let counter = 0;
let last;

function checkVoltage(v)
{
    if( v < minVoltage )
    {
        return "undervoltage ("+v+"V)";
    }
    if( v > maxVoltage )
    {
        return "overvoltage ("+v+"V)";
    }
    return false;
}

Timer.set( 1*1000, true,
    function(ud)
    {
        const em    = Shelly.getComponentStatus("EM:0");
        const state = checkVoltage(em.a_voltage) || checkVoltage(em.b_voltage) || checkVoltage(em.c_voltage) || "ok";
        if( state !== last )
        {
            //print(state);
            text200.setValue( state );
            last    = state;
            counter = 0;
        }
        else if ( ++counter > 90 )
        {
            MQTT.publish( mqttPrefix+"/status/text:200", "{\"value\":\""+state+"\"}", 1, false );
            counter = 0;
        }
    },
    null
);
