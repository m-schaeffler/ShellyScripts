// Konstanten
let maxCyclic = 60 * 4;
let maxState = {
    "-": 0,
    "S": 90*4,
    "D": 5*60*4,
    "L": 60*60*4,
    "w": 1,
    "W": 12
};

// globale Variablen
let switchoffTimer = [null,null,null,null];
let state          = ["-","-","-","-"];
let cntState       = [0,0,0,0];
let cntCyclic      = 0;
let mqttPrefix     = Shelly.getComponentConfig( "mqtt" ).topic_prefix;

function showState(id)
{
    MQTT.publish( mqttPrefix+"/status/state:"+chr(0x30+id), "{\"status\":\""+state[id]+"\"}", 1, false );
}

function setState(id,aState)
{
    state[id]    = aState;
    cntState[id] = maxState[aState];
    showState( id );
}

function checkState(id)
{
    if( state[id] !== "-" )
    {
        cntState[id] = cntState[id] - 1;
        if( cntState[id] <= 0 )
        {
            if( state[id] === "S" || state[id] === "D" || state[id] === "L" )
            {
                switchWarn1( id );
            }
            else if( state[id] === "w" )
            {
                switchWarn2( id );
            }
            else
            {
                switchOff( id );
            }
        }
    }
}

function showStates()
{
    showState( 0 );
    //showState( 1 );
    //showState( 2 );
    //showState( 3 );
}

function switchOff(id)
{
    //print( "Output", id, "switched off" );
    Shelly.call( "Switch.Set", { id:id, on:false }, null, null );
    setState( id, "-" );
}

function switchOn(id,aState)
{
    //print( "Output", id, "switched on ", aState );
    Shelly.call( "Switch.Set", { id:id, on:true }, null, null );
    setState( id, aState );
}

function switchWarn1(id)
{
    //print( "Output", id, "switched warn 1" );
    Shelly.call( "Switch.Set", { id:id, on:false }, null, null );
    setState( id, "w" );
}

function switchWarn2(id)
{
    //print( "Output", id, "switched warn 2" );
    Shelly.call( "Switch.Set", { id:id, on:true }, null, null );
    setState( id, "W" );
}

function shortPress(id)
{
    //print( "short press" );
    if( state[id] !== "L" )
    {
        switchOn( id, "S" );
    }
}

function doublePress(id)
{
    //print( "double press" );
    if( state[id] !== "L" )
    {
        switchOn( id, "D" );
    }
}

function longPress(id)
{
    //print( "long press" );
    if( state[id] !== "L" )
    {
        switchOn( id, "L" );
    }
    else
    {
        switchOff( id );
    }
}

// Handler
Shelly.addEventHandler(
    function(event,ud)
    {
        //print( JSON.stringify(event) );
        if( event.name === 'input')
        {
            //print( "Input event", event.id );
            if( event.info.event === "single_push" )
            {
                shortPress( event.id );
            }
            else if( event.info.event === "double_push" )
            {
                doublePress( event.id );
            }
            else if( event.info.event === "long_push" )
            {
                longPress( event.id );
            }
        }
    },
    null
);

function mqttCallback(topic,message,id)
{
    //print( topic, message );
    if( message === "S" )
    {
        shortPress( id );
    }
    else if( message === "D" )
    {
        doublePress( id );
    }
    else if( message === "L" )
    {
        longPress( id );
    }
}
        
// Main
showStates();
MQTT.subscribe( mqttPrefix+"/state:0", mqttCallback, 0 );
//MQTT.subscribe( mqttPrefix+"/state:1", mqttCallback, 1 );
//MQTT.subscribe( mqttPrefix+"/state:2", mqttCallback, 2 );
//MQTT.subscribe( mqttPrefix+"/state:3", mqttCallback, 3 );
Timer.set( 250, true,
    function(ud)
    {
        if( ++cntCyclic >= maxCyclic )
        {
            cntCyclic = 0;
            showStates();
        }
        checkState( 0 );
        //checkState( 1 );
        //checkState( 2 );
        //checkState( 3 );
    },
    null
);
