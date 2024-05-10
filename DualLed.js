// Konstanten
let temp_warm = 2700;
let temp_cold = 6500;

// globale Variablen
let temp       = [null,null];
let brightness = [null,null];
let mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;

function showState(id)
{
    let warm = Shelly.getComponentStatus( "light", id*2 );
    let cold = Shelly.getComponentStatus( "light", id*2+1 );
    //print(JSON.stringify(warm))
    let brightness = warm.brightness + cold.brightness;
    let temp       = temp_warm + Math.round( (temp_cold-temp_warm)/(warm.brightness+cold.brightness)*cold.brightness );
    MQTT.publish( mqttPrefix+"/status/white:"+chr(0x30+id),
                  "{\"output\":"+warm.output+",\"brightness\":"+brightness+",\"temp\":"+temp+",\"temperature\":{\"tC\":"+warm.temperature.tC+"}}", 1, false );
}

function showStates()
{
    showState( 0 );
    showState( 1 );
}

function setTurn(id,value)
{
    if( value === "toggle" )
    {
        return ! Shelly.getComponentStatus( "light", id*2 ).output;
    }
    else if( value === true || value === "on" || value === 1 )
    {
        return true;
    }
    else if( value === false || value === "off" || value === 0 )
    {
        return false;
    }
    return undefined;
}

function mqttCallback(topic,message,id)
{
    if( message !== "" )
    {
        print( topic, message );
        let data      = JSON.parse( message );
        let payload_w = { id:id*2 };
        let payload_c = { id:id*2+1};
        if( data.on !== undefined )
        {
            print( "switch "+id+" "+data.on );
            payload_w.on = setTurn( id, data.on );
            payload_c.on = payload_w.on;
        }
        else if( data.turn !== undefined )
        {
            print( "switch "+id+" "+data.turn );
            payload_w.on = setTurn( id, data.turn );
            payload_c.on = payload_w.on;
        }
        if( data.brightness !== undefined )
        {
            print( "brightness "+id+" "+data.brightness );
            brightness[id] = data.brightness;
        }
        if( data.temp !== undefined )
        {
            print( "temp "+id+" "+data.temp );
            temp[id] = data.temp;
        }
        if( data.transition !== undefined )
        {
            print( "transition "+id+" "+data.transition );
            payload_w.transition_duration= data.transition;
            payload_c.transition_duration= data.transition;
        }
        if( data.transition_duration !== undefined )
        {
            print( "transition_duration "+id+" "+data.transition_duration );
            payload_w.transition_duration= data.transition_duration;
            payload_c.transition_duration= data.transition_duration;
        }
        if( brightness[id] !== null && temp[id] !== null )
        {
            payload_w.brightness = Math.round( brightness[id]*(temp_cold-temp[id]) / (temp_cold-temp_warm) );
            payload_c.brightness = brightness[id] - payload_w.brightness;
        }
        print(JSON.stringify(payload_w));
        print(JSON.stringify(payload_c));
        Shelly.call( "Light.Set", payload_w );
        Shelly.call( "Light.Set", payload_c, function(result,error_code,error_message,userdata)
        {
            showState( id );
        } );
    }
}

Timer.set( 120*1000, true,
    function(ud)
    {
        showStates();
    },
    null
);

// Main
showStates();
MQTT.subscribe( mqttPrefix+"/white:0", mqttCallback, 0 );
MQTT.subscribe( mqttPrefix+"/white:1", mqttCallback, 1 );

print( "started" );
