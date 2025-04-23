const mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;
const gateway = mqttPrefix.split("/")[1];
const BTHOME_SVC_ID_STR = "fcd2";

function sendRawData(res)
{
    const rawdata = res.service_data[BTHOME_SVC_ID_STR];
    if( typeof rawdata == "string" && rawdata !== "" )
    {
        let help = {
            addr: res.addr,
            rssi: res.rssi,
            time: Math.floor( Date.now() ),
            gateway: gateway,
            data: []
        };
        for( const c of rawdata )
        {
            help.data.push( c.charCodeAt() );
        }
        MQTT.publish( mqttPrefix+"/bleraw", JSON.stringify( help ), 1, false );
    }
}

BLE.Scanner.Start( {duration_ms: BLE.Scanner.INFINITE_SCAN},
    function(event,result,ud)
    {
        if( event === BLE.Scanner.SCAN_RESULT && 
            result !== null &&
            result.service_data !== undefined &&
            result.service_data[BTHOME_SVC_ID_STR] !== undefined )
        {
            sendRawData( result );
        }
    } );

print( "started" );
