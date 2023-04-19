let mqttPrefix = Shelly.getComponentConfig( "mqtt" ).topic_prefix;
let BTHOME_SVC_ID_STR = "fcd2";
let last_packet_id;

let uint8  = 0;
let int8   = 1;
let uint16 = 2;
let int16  = 3;
let uint24 = 4;
let int24  = 5;
function getByteSize(type) {
  if (type === uint8 || type === int8) return 1;
  if (type === uint16 || type === int16) return 2;
  if (type === uint24 || type === int24) return 3;
  return null;
}
let BTH = [];
BTH[0x00] = { n: "pid", t: uint8 };
BTH[0x01] = { n: "battery", t: uint8 };
BTH[0x05] = { n: "lux", t: uint24, f: 0.01 };
//BTH[0x1a] = { n: "Door", t: uint8 };
//BTH[0x20] = { n: "Moisture", t: uint8 };
BTH[0x2d] = { n: "state", t: uint8 };
BTH[0x3a] = { n: "button", t: uint8 };
BTH[0x3f] = { n: "tilt", t: int16, f: 0.1 };
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
  getBufValue: function (type, buffer) {
    if (buffer.length < getByteSize(type)) return null;
    let res = null;
    if (type === uint8)  res = this.getUInt8(buffer);
    if (type === int8)   res = this.getInt8(buffer);
    if (type === uint16) res = this.getUInt16LE(buffer);
    if (type === int16)  res = this.getInt16LE(buffer);
    if (type === uint24) res = this.getUInt24LE(buffer);
    if (type === int24)  res = this.getInt24LE(buffer);
    return res;
  },
  unpack: function (buffer) {
    // beacons might not provide BTH service data
    if (typeof buffer !== "string" || buffer.length === 0) return null;
    let result = {};
    let _dib = buffer.at(0);
    result["encryption"] = _dib & 0x1 ? true : false;
    result["BTHome_version"] = _dib >> 5;
    if (result["BTHome_version"] !== 2) return null;
    //Can not handle encrypted data
    if (result["encryption"]) return result;
    buffer = buffer.slice(1);

    let _bth;
    let _value;
    while (buffer.length > 0) {
      _bth = BTH[buffer.at(0)];
      if (typeof _bth === "undefined") {
        console.log("BTH: unknown type");
        break;
      }
      buffer = buffer.slice(1);
      _value = this.getBufValue(_bth.t, buffer);
      if (_value === null) break;
      if (typeof _bth.f !== "undefined") _value = _value * _bth.f;
      result[_bth.n] = _value;
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

BLE.Scanner.Start( {duration_ms: BLE.Scanner.INFINITE_SCAN}.
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
                if( last_packet_id !== BTHparsed.pid )
                {
                    last_packet_id = BTHparsed.pid;
                    if( BTHparsed.state !== undefined )
                    {
                        BTHparsed.state = BTHparsed.state ? "close" : "open";
                    }
                    MQTT.publish( mqttPrefix+"/ble", JSON.stringify( BTHparsed ), 1, false );
                }
            }
        }
    } );

