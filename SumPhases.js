const mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;
const number200  = Virtual.getHandle( "number:200" );
const number201  = Virtual.getHandle( "number:201" );
let last     = {total_act:0,total_act_ret:0};
let purchase = number201.getValue();
let feed     = number200.getValue();

function calculate(emdata)
{
    //print("calc");
    const delta = ( emdata.total_act - last.total_act ) - ( emdata.total_act_ret - last.total_act_ret );
    print("delta",delta);
    if( delta > 0 )
    {
        purchase += delta;
        print("purchase",purchase)
        number201.setValue( purchase );
        Shelly.call( "KVS.Set", { key:"purchase", value:purchase } );
    }
    else if( delta < 0 )
    {
        feed -= delta;
        print("feed",feed)
        number200.setValue( feed );
        Shelly.call( "KVS.Set", { key:"feed", value:feed } );
    }
    last.total_act     = emdata.total_act;
    last.total_act_ret = emdata.total_act_ret;
    Shelly.call( "KVS.Set", { key:"last", value:JSON.stringify(last) } );
}

// get NVRAM data
Shelly.call( "KVS.Get", { key:"last" }, 
    function(result)
    {
        if( result !== undefined )
        {
            last = JSON.parse(result.value);
            print("last",JSON.stringify(last));
        }
    },
    null );
Shelly.call( "KVS.Get", { key:"purchase" }, 
    function(result)
    {
        if( result !== undefined )
        {
            purchase = JSON.parse(result.value);
            print("purchase",purchase);
            number201.setValue( purchase );
        }
    },
    null );
Shelly.call( "KVS.Get", { key:"feed" }, 
    function(result)
    {
        if( result !== undefined )
        {
            feed = JSON.parse(result.value);
            print("feed",feed);
            number200.setValue( feed );
        }
    },
    null );

// MQTT
/*
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
*/

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
Timer.set( 600*1000, true,
    function(ud)
    {
        MQTT.publish( mqttPrefix+"/status/number:200", JSON.stringify( {value:feed} ), 1, false );
        MQTT.publish( mqttPrefix+"/status/number:201", JSON.stringify( {value:purchase} ), 1, false );
    },
    null
);

print( "Started" );
