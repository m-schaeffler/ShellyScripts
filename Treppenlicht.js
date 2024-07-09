// Konstanten
const maxCyclic = 60 * 4;
const maxState = {
    "-": 0,
    "S": 90*4,
    "D": 5*60*4,
    "L": 60*60*4,
    "w": 1,
    "W": 12
};

// globale Variablen
const mqttPrefix   = Shelly.getComponentConfig( "mqtt" ).topic_prefix;
const enum200      = Virtual.getHandle( "enum:200" );
let state          = enum200.getValue();
let switchoffTimer = null;
let cntState       = 0;
let cntCyclic      = 0;

function showState()
{
    MQTT.publish( mqttPrefix+"/status/enum:200", "{\"value\":\""+enum200.getValue()+"\"}", 1, false );
}

function setState(aState)
{
    state    = aState;
    cntState = maxState[aState];
    print( "new state", state, "counter", cntState );
}

function checkState()
{
    if( state !== "-" )
    {
        if( --cntState <= 0 )
        {
            if( state === "S" || state === "D" || state === "L" )
            {
                switchWarn1();
            }
            else if( state === "w" )
            {
                switchWarn2();
            }
            else
            {
                switchOff();
            }
        }
    }
}

function switchOff()
{
    print( "Output switched off" );
    Shelly.call( "Switch.Set", { id:0, on:false }, null, null );
    setState( "-" );
    enum200.setValue( "-" );
}

function switchOn(aState)
{
    print( "Output switched on ", aState );
    Shelly.call( "Switch.Set", { id:0, on:true }, null, null );
    setState( aState );
}

function switchWarn1()
{
    print( "Output switched warn 1" );
    Shelly.call( "Switch.Set", { id:0, on:false }, null, null );
    setState( "w" );
}

function switchWarn2()
{
    print( "Output switched warn 2" );
    Shelly.call( "Switch.Set", { id:0, on:true }, null, null );
    setState( "W" );
}

function longpress()
{
    if( state !== "L" )
    {
        switchOn( "L" );
    }
    else
    {
        switchOff();
    }
}

// Events
/*
enum200.on( "change",
    function(event)
    {
        //print( event.value );
        if( event.value === "S" )
        {
            switchOn( "S" );
        }
        else if( event.value === "D" )
        {
            switchOn( "D" );
        }
        else if( event.value === "L" )
        {
            switchOn( "L" );
        }
        else if( event.value === "-" )
        {
            switchOff();
        }
    }
);
*/

MQTT.subscribe( mqttPrefix+"/rpc", 
    function(topic,message,ud)
    {
        try
        {
            message = JSON.parse( message );
            if( message.method === "Enum.Set" && message.params.id == 200 )
            {
                //print("Enum.set",message.params.value);
                if( message.params.value === "S" && state !== "L" )
                {
                    switchOn( "S" );
                }
                else if( message.params.value === "D" && state !== "L" )
                {
                    switchOn( "D" );
                }
                else if( message.params.value === "L" )
                {
                    longpress();
                }
                else if( message.params.value === "-" )
                {
                    switchOff();
                }
            }
        }
        catch (error)
        {
            print( error );
        }
    }
    , null
);

// Handler
Shelly.addEventHandler(
    function(event,ud)
    {
        //print( JSON.stringify(event) );
        if( event.name === 'input' && event.id === 0 )
        {
            //print( "Input event", event.info.event );
            if( event.info.event === "single_push" && state !== "L" )
            {
                switchOn( "S" );
                enum200.setValue( "S" );
            }
            else if( event.info.event === "double_push" && state !== "L" )
            {
                switchOn( "D" );
                enum200.setValue( "D" );
            }
            else if( event.info.event === "long_push" )
            {
                longpress();
                enum200.setValue( "L" );
            }
        }
    },
    null
);

// Cyclic
Timer.set( 250, true,
    function(ud)
    {
        if( ++cntCyclic >= maxCyclic )
        {
            cntCyclic = 0;
            showState();
        }
        checkState();
    },
    null
);

// Main
if( state !== "-" )
{
    switchOff();
    enum200.setValue( "-" );
}
else
{
    showState();
}
