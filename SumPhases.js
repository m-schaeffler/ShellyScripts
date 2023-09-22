let mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;
let last       = {total_act:0,total_act_ret:0};
let purchase   = 0;
let feed       = 0;

function send()
{
    MQTT.publish( mqttPrefix+"/status/emeter:0", JSON.stringify( {purchase:purchase,feed:feed} ), 1, false );
}

function calculate(emdata)
{
    //print("calc");
    let delta = ( emdata.total_act - last.total_act ) - ( emdata.total_act_ret - last.total_act_ret );
    print("delta",delta);
    if( delta > 0 )
    {
        purchase += delta;
        print("purchase",purchase)
        Shelly.call( "KVS.Set", { key:"purchase", value:purchase } );
    }
    else if( delta < 0)
    {
        feed -= delta;
        print("feed",feed)
        Shelly.call( "KVS.Set", { key:"feed", value:feed } );
    }
    send();
    last.total_act     = emdata.total_act;
    last.total_act_ret = emdata.total_act_ret;
    Shelly.call( "KVS.Set", { key:"last", value:JSON.stringify(last) } );
}

// get NVRAM data
Shelly.call( "KVS.Get", { key:"last" }, 
    function(result)
    {
        if( result !== null )
        {
            last = JSON.parse(result.value);
            print("last",JSON.stringify(last));
        }
    },
    null );
Shelly.call( "KVS.Get", { key:"purchase" }, 
    function(result)
    {
        if( result !== null )
        {
            purchase = JSON.parse(result.value);
            print("purchase",purchase);
        }
    },
    null );
Shelly.call( "KVS.Get", { key:"feed" }, 
    function(result)
    {
        if( result !== null )
        {
            feed = JSON.parse(result.value);
            print("feed",feed);
        }
    },
    null );

// MQTT
function mqttSet(topic,message,ud)
{
    if( message != "" )
    {
        message = JSON.parse( message );
        print(message);
        if( message.purchase !== undefined )
        {
            purchase = message.purchase;
            Shelly.call( "KVS.Set", { key:"purchase", value:purchase } );
        }
        if( message.feed !== undefined )
        {
            feed = message.feed;
            Shelly.call( "KVS.Set", { key:"feed", value:feed } );
        }
    }
}
MQTT.subscribe( mqttPrefix+"/emeter:0/set", mqttSet, 0 );

// Handler
Shelly.addStatusHandler(
    function(status,ud)
    {
        if( status.name === 'emdata')
        {
            //print( "status",JSON.stringify( status.delta ) );
            calculate( status.delta );
        }
    },
    null
);

// Timer
/*
Timer.set( 2.5*1000, true,
    function(ud)
    {
        let emdata = Shelly.getComponentStatus( "emdata", 0 ); 
        //print( JSON.stringify( emdata ) );
        calculate( emdata );
    },
    null
);
*/

print( "Started" );
