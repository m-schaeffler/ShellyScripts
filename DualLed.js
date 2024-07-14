// Konstanten
const temp_warm = 2700;
const temp_cold = 6500;
const brightMin = [6,8];
const brightMax = [40,70];

// globale Variablen
const mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;
let   output     = false;
let   temp       = [4500,4500];
let   brightness = [100,100];

function showOutput()
{
    MQTT.publish( mqttPrefix+"/status/boolean:200", "{\"value\":"+output+"}", 1, false );
}

function setLights()
{
    try
    {
	  const warm0 = brightness[0]*(temp_cold-temp[0]) / (temp_cold-temp_warm);
	  const cold0 = brightness[0] - warm0;
	  const warm1 = brightness[1]*(temp_cold-temp[1]) / (temp_cold-temp_warm);
	  const cold1 = brightness[1] - warm1;
	  //print(warm0,cold0,warm1,cold1)
	  Shelly.call( "Light.Set", { id:0, on:output, brightness:Math.round(warm0) }, function(result,error_code,error_message,userdata)
	  {
        try
        {
	      Shelly.call( "Light.Set", { id:1, on:output, brightness:Math.round(cold0) }, function(result,error_code,error_message,userdata)
	      {
            try
            {
		      Shelly.call( "Light.Set", { id:2, on:output, brightness:Math.round(warm1) }, function(result,error_code,error_message,userdata)
		      {
		        try
		        {
		          Shelly.call( "Light.Set", { id:3, on:output, brightness:Math.round(cold1) }, function(result,error_code,error_message,userdata)
		          {
		            try
		            {
		              showOutput();
                    }
                    catch( error )
                    {
                      print( error );
                    }
		          } )
                }
                catch( error )
                {
                  print( error );
                }
		      } )
            }
            catch( error )
            {
              print( error );
            }
	      } )
	    }
        catch( error )
        {
          print( error );
        }
	  } );
    }
    catch( error )
    {
      print( error );
    }
}

function setOutput(value)
{
    //print("setOutput",value);
    if( value === "toggle" )
    {
        output = ! output;
    }
    else if( value === true || value === "on" || value == 1 )
    {
        output = true;
    }
    else if( value === false || value === "off" || value == 0 )
    {
        output = false;
    }
    setLights();
}

function setBrightness(id,value)
{
    brightness[id] = brightMin[id] + value * (brightMax[id]-brightMin[id]) / 100;
    //print("setBrightness",id,brightness[id]);
}

function setTemp(id,value)
{
    //print("setTemp",id,value);
    temp[id] = value;
}

function rpcCallback(topic,message,ud)
{
    try
    {
        message = JSON.parse( message );
        if( message.method === "Boolean.Set" && message.params.id == 200 )
        {
            setOutput( message.params.value );
        }
        const answer = {
            id:     message.id,
            src:    mqttPrefix,
            dst:    message.src,
            result: {}
        };
        MQTT.publish( message.src+"/rpc", JSON.stringify( answer ), 1, false );
    }
    catch( error )
    {
        print( error );
    }
}

function mqttCallback(topic,message,ud)
{
    try
    {
        message = JSON.parse( message );
        if( message.brightness !== undefined )
        {
            setBrightness( 0, message.brightness );
            setBrightness( 1, message.brightness );
        }
        if( message.temp !== undefined )
        {
            setTemp( 0, message.temp );
            setTemp( 1, message.temp );
        }
        setLights();
    }
    catch( error )
    {
        print( error );
    }
}

Timer.set( 60*1000, true,
    function(ud)
    {
        showOutput();
    },
    null
);

// Main
showOutput();
MQTT.subscribe( mqttPrefix+"/rpc", rpcCallback, null );
MQTT.subscribe( "Shelly2/Data/TunableWhite", mqttCallback, null );

print( "started" );
