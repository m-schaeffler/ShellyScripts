let mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;
let last       = {a_total_act:0,a_total_act_ret:0,b_total_act:0,b_total_act_ret:0,c_total_act:0,c_total_act_ret:0};
let purchase   = 0;
let feed       = 0;

function send()
{
    MQTT.publish( mqttPrefix+"/status/emeter:0", JSON.stringify( {purchase:purchase,feed:feed} ), 1, false );
}

function calculate(emdata)
{
    print("calc");
    let delta = ( emdata.a_total_act_energy - last.a_total_act ) +
                ( emdata.b_total_act_energy - last.b_total_act ) +
                ( emdata.c_total_act_energy - last.c_total_act ) -
                ( emdata.a_total_act_ret_energy - last.a_total_act_ret ) -
                ( emdata.b_total_act_ret_energy - last.b_total_act_ret ) -
                ( emdata.c_total_act_ret_energy - last.c_total_act_ret );
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
    last.a_total_act     = emdata.a_total_act_energy;
    last.a_total_act_ret = emdata.a_total_act_ret_energy;
    last.b_total_act     = emdata.b_total_act_energy;
    last.b_total_act_ret = emdata.b_total_act_ret_energy;
    last.c_total_act     = emdata.c_total_act_energy;
    last.c_total_act_ret = emdata.c_total_act_ret_energy;
    Shelly.call( "KVS.Set", { key:"last", value:last } );
}

// get NVRAM data
Shelly.call( "KVS.Get", { key:"last" }, 
    function(result)
    {
        if( result !== null )
        {
            last = result.value;
            print("last",JSON.stringify(last));
        }
    },
    null );
Shelly.call( "KVS.Get", { key:"purchase" }, 
    function(result)
    {
        if( result !== null )
        {
            purchase = result.value;
            print("purchase",purchase);
        }
    },
    null );
Shelly.call( "KVS.Get", { key:"feed" }, 
    function(result)
    {
        if( result !== null )
        {
            feed = result.value;
            print("feed",feed);
        }
    },
    null );

// MQTT
MQTT.subscribe( mqttPrefix+"/emeter:0/set", 
    function(topic,message,ud)
    {
        message = JSON.parse( message );
        print(JSON.stringify(message));
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
    },
    null );

// Handler
Shelly.addStatusHandler(
    function(status,ud)
    {
        if( status.name === 'emdata')
        {
            print(JSON.stringify(status.delta));
            calculate( status.delta );
        }
    },
    null
);

print("Started");
