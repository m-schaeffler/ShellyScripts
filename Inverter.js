const mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;

let counter  = 0;
let cntCycle = 0;
let inverterSoll;
let inverterleistung;
let reportedState;

function showState(state)
{
    if( state !== reportedState )
    {
        reportedState = state;
        print( "showState:", state );
        MQTT.publish( mqttPrefix+"/status/enum:200", "{\"value\":\""+state+"\"}", 1, false );
    }
}

function switchInverter(value)
{
    print( "switchInverter", value );
    Shelly.call( "Switch.Set", { id:1, on:value }, null, null );
}

function switchAusgang(value)
{
    print( "switchAusgang", value );
    Shelly.call( "Switch.Set", { id:0, on:value }, null, null );
}

function controlInverter()
{
    //print( "controlInverter", inverterSoll );
    if( inverterSoll === undefined )
    {
        return;
    }
    
    const ausgang        = Shelly.getComponentStatus( "switch", 0 ).output;
    const inverter       = Shelly.getComponentStatus( "switch", 1 ).output;
    const inverteronline = Shelly.getComponentStatus( "input", 0 ).state;
    
    counter++;
    if( inverter !== ausgang )
    {
        if( inverterSoll === "on" )
        {
                //print( "inverteronline", inverteronline );
                if( inverteronline )
                {
                    switchAusgang( true );
                }
                else
                {
                    print( "waiting for InverterOnline", counter );
                }
        }
        else if ( inverterSoll === "off" )
        {
                if( inverterleistung === 0 || counter >= 30 )
                {
                    switchInverter( false )
                }
                else
                {
                    print( "waiting for inverterLeistung==0", counter );
                }
        }
        else if ( inverterSoll === "only" )
        {
                counter = 0;
                showState( inverterSoll );
        }
    }
    else if( !inverter && inverterSoll==="on" )
    {
        switchInverter( true );
        showState( "switching on" );
    }
    else if( ausgang && inverterSoll==="off" )
    {
        switchAusgang( false );
        showState( "switching off" );
    }
    else if( inverterSoll === "only" )
    {
        switchAusgang( false );
        switchInverter( true );
        showState( "switching only" );
    }
    else
    {
        counter = 0;
        if( inverterSoll==="on" && !inverteronline )
        {
            print( "!!! Panik: inverterSoll==='on' && !inverteronline !!!" );
            showState( "Panik" );
        }
        else
        {
            showState( inverterSoll );            
        }
    }
}

function setInverter(inverter)
{
    if( counter === 0 || inverterSoll === inverter)
    {
        print( "setInverter", inverter );
    }
    else
    {
        print( "!!! setInverter", inverter, "(change of mind) !!!" );
    }
    inverterSoll = inverter;
    //controlInverter();
}

function rpcCallback(topic,message,ud)
{
    //print(topic,message)
    try
    {
        message = JSON.parse( message );
        if( message.method === "Enum.Set" && message.params.id == 200 )
        {
            let answer = {
                id:     message.id,
                src:    mqttPrefix,
                dst:    message.src,
                result: {}
            };
            //print("set",message.params.value);
            setInverter( message.params.value );
            MQTT.publish( message.src+"/rpc", JSON.stringify( answer ), 1, false );
        }
    }
    catch (error)
    {
        print( error );
    }
}

function cyclic(ud)
{
    if( ++cntCycle > 120 )
    {
        cntCycle      = 0;
        reportedState = undefined;
    }
    controlInverter();
}

function inverterCallback(topic,message,id)
{
    try
    {
        message = JSON.parse( message );
        if( typeof message == "number" )
        {
            print( "Inverterleistung", message );
            inverterleistung = message;
        }
    }
    catch (error)
    {
        print( error );
    }
}

// main
showState( "init" );
MQTT.subscribe( mqttPrefix+"/rpc", rpcCallback, null );
MQTT.subscribe( "shellies/PV_Speicher_Inverterleistung/relay/0/power", inverterCallback, null );
Timer.set( 1000, true, cyclic, null );

print( "started" );
