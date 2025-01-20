const slave = "http://192.168.178.36/rpc/";

let tim;

let position = Shelly.getComponentStatus( "cover", 0 ).current_pos;
print( "start position", position );

let door;
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
    if( position !== undefined && door === "close" )
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

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ShellyBlu
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

const mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;
const BTHOME_SVC_ID_STR = "fcd2";
let last_packet_id;
let last_addr;

const uint8  = 0;
const int8   = 1;
const uint16 = 2;
const int16  = 3;
const uint24 = 4;
const int24  = 5;
const uint32 = 6;
const int32  = 7;
function getByteSize(type) {
  if (type === uint8  || type === int8)  return 1;
  if (type === uint16 || type === int16) return 2;
  if (type === uint24 || type === int24) return 3;
  if (type === uint32 || type === int32) return 4;
  return null;
}
let BTH = [];
BTH[0x00] = { n: "pid", t: uint8 };
BTH[0x01] = { n: "battery", t: uint8 };
BTH[0x02] = { n: "temperature", t: int16, f: 0.01 };
BTH[0x03] = { n: "humidity", t: int16, f: 0.01 };
BTH[0x05] = { n: "lux", t: uint24, f: 0.01 };
//BTH[0x1a] = { n: "Door", t: uint8 };
//BTH[0x20] = { n: "Moisture", t: uint8 };
BTH[0x21] = { n: "motion", t: uint8 };
BTH[0x2d] = { n: "state", t: uint8, e: ["close","open"] };
BTH[0x2e] = { n: "humidity", t: uint8 };
BTH[0x3a] = { n: "button", t: uint8, e: ["-","S","SS","SSS","L"] };
BTH[0x3a].e[0xfe] = "p";
BTH[0x3f] = { n: "tilt", t: int16, f: 0.1 };
BTH[0x45] = { n: "temperature", t: int16, f: 0.1 };
BTH[0xf0] = { n: "typeId", t: uint16 };
BTH[0xf1] = { n: "version", t: uint32 };

let BTHomeDecoder = {
  utoi: function (num, bitsz) {
    let mask = 1 << (bitsz - 1);
    return num & mask ? num - (1 << bitsz) : num;
  },
  getUInt8: function (buffer) {
    return buffer.at(0);
  },
  getInt8: function (buffer) {
    return this.utoi(this.getUInt8(buffer), 8);
  },
  getUInt16LE: function (buffer) {
    return 0xffff & ((buffer.at(1) << 8) | buffer.at(0));
  },
  getInt16LE: function (buffer) {
    return this.utoi(this.getUInt16LE(buffer), 16);
  },
  getUInt24LE: function (buffer) {
    return (
      0x00ffffff & ((buffer.at(2) << 16) | (buffer.at(1) << 8) | buffer.at(0))
    );
  },
  getInt24LE: function (buffer) {
    return this.utoi(this.getUInt24LE(buffer), 24);
  },
  getUInt32LE: function (buffer) {
    return 0xffffffff & ((buffer.at(3) << 24) | (buffer.at(2) << 16) | (buffer.at(1) << 8) | buffer.at(0));
  },
  getInt32LE: function (buffer) {
    return this.utoi(this.getUInt32LE(buffer), 32);
  },
  getBufValue: function (type, buffer) {
    if (buffer.length < getByteSize(type)) return null;
    if (type === uint8)  return this.getUInt8(buffer);
    if (type === int8)   return this.getInt8(buffer);
    if (type === uint16) return this.getUInt16LE(buffer);
    if (type === int16)  return this.getInt16LE(buffer);
    if (type === uint24) return this.getUInt24LE(buffer);
    if (type === int24)  return this.getInt24LE(buffer);
    if (type === uint32) return this.getUInt32LE(buffer);
    if (type === int32)  return this.getInt32LE(buffer);
    return null;
  },
  unpack: function (buffer) {
    // beacons might not provide BTH service data
    if (typeof buffer !== "string" || buffer.length === 0) return null;
    let result = {};
    let _dib = buffer.at(0);
    result["encryption"] = Boolean( _dib & 0x1 );
    result["BTHome_version"] = _dib >> 5;
    if (result["BTHome_version"] !== 2) return null;
    //Can not handle encrypted data
    if (result["encryption"]) return result;
    buffer = buffer.slice(1);

    let _bth;
    let _value;
    while (buffer.length > 0)
    {
      //print(buffer.at(0)+" "+buffer.at(1))
      _bth = BTH[buffer.at(0)];
      if (typeof _bth === "undefined")
      {
        console.log("BTH: unknown type",buffer.at(0));
        break;
      }
      buffer = buffer.slice(1);
      _value = this.getBufValue(_bth.t, buffer);
      if (_value === null) 
      {
        console.log("Value === null")
        break;
      }
      if( _bth.f !== undefined )
      {
        _value = _value * _bth.f;
      }
      else if( _bth.e !== undefined )
      {
        //print(_value+" -> "+_bth.e[_value])
        _value = _bth.e[_value];
      }
      if( result[_bth.n] === undefined )
      {      
        result[_bth.n] = _value;
      }
      else
      {
        if( Array.isArray( result[_bth.n] ) )
        {
          result[_bth.n].push(_value);
        } 
        else
        {
          result[_bth.n] = [ result[_bth.n], _value ];
        }
      }
      buffer = buffer.slice(getByteSize(_bth.t));
    }
    return result;
  },
};

function shellyBLUParser(res)
{
    let result  = BTHomeDecoder.unpack( res.service_data[BTHOME_SVC_ID_STR] );
    result.addr = res.addr;
    result.rssi = res.rssi;
    return result;
}

BLE.Scanner.Start( {duration_ms: BLE.Scanner.INFINITE_SCAN},
    function(event,result,ud)
    {
        if( event === BLE.Scanner.SCAN_RESULT && 
            result !== null &&
            result.service_data !== undefined &&
            result.service_data[BTHOME_SVC_ID_STR] !== undefined )
        {
            let BTHparsed = shellyBLUParser( result );
            if( BTHparsed !== null )
            {
                //print( JSON.stringify( BTHparsed ) );
                if( last_packet_id !== BTHparsed.pid || last_addr !== BTHparsed.addr )
                {
                    last_packet_id = BTHparsed.pid;
                    last_addr      = BTHparsed.addr;
                    MQTT.publish( mqttPrefix+"/ble", JSON.stringify( BTHparsed ), 1, false );
                    if( BTHparsed.addr === "0c:ef:f6:f2:2f:c6" )
                    {
                        setDoor( BTHparsed.state );
                    }
                }
            }
        }
    } );

print( "started" );
