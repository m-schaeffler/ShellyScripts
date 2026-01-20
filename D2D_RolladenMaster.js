const slave = "http://192.168.178.36/rpc/";

let tim;

let position = Shelly.getComponentStatus( "cover", 0 ).current_pos;
print( "start position", position );

let door = Shelly.getComponentStatus( "bthomesensor:202" ).value;
print( "start door", door );

Shelly.call( "KVS.Get", { key:"door" }, 
    function(result)
    {
        if( result !== undefined )
        {
            door = result.value;
            print( "start door", door );
        }
    },
    null );

function stateMachine()
{
    if( position !== undefined && ! door )
    {
        const slavePos = position;
        print( "stateMachine:", slavePos );
        Shelly.call( "HTTP.GET", { url: slave+"Cover.GoToPosition?id=0&pos="+position } );
    }
    else
    {
        print( "stateMachine: emergency open" );
        Shelly.call( "HTTP.GET", { url: slave+"Cover.Open?id=0" } );
    }
}

function statusHandler(event_data,userdata)
{
    if( event_data.name === "cover" && event_data.delta.current_pos !== undefined && event_data.delta.current_pos !== position )
    {
        position = event_data.delta.current_pos;
        print( "new position:", position );
        stateMachine();
    }
    else if( event_data.component === "bthomesensor:202" )
    {
        setDoor( event_data.delta.value );
    }
}
Shelly.addStatusHandler( statusHandler, null );

function setDoor(state)
{
    if( door !== state )
    {
        door = state;
        Timer.clear( tim );
        tim = Timer.set( 10*1000, false,
            function(ud)
            {
                print( "new door:", door );
                Shelly.call( "KVS.Set", { key:"door", value:door } );
                stateMachine();
            }, null );
    }
}

print( "started" );
