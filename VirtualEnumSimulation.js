const mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;

let value = "off";

function showState()
{
    print( "send", value );
    MQTT.publish( mqttPrefix+"/status/enum:200", "{\"value\":\""+value+"\"}", 1, false );
}

MQTT.subscribe( mqttPrefix+"/rpc", 
    function(topic,message,ud)
    {
        //print(message)
        message = JSON.parse( message );
        if( message.method === "Enum.Set" && message.params.id == 200 )
        {
            let answer = {
                id:     message.id,
                src:    mqttPrefix,
                dst:    message.src,
                result: {}
            };
            print("set",message.params.value);
            value = message.params.value;
            MQTT.publish( message.src+"/rpc", JSON.stringify( answer ), 1, false );
            showState();
        }
    }
    , null
);

showState();
print("started",mqttPrefix)
