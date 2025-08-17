// Handler
Shelly.addEventHandler(
    function(event,ud)
    {
        //print( JSON.stringify(event) );
        if( event.name === 'input' && event.id === 0 && event.info.event === "single_push" )
        {
            Shelly.call( "Switch.Toggle", { id:0 }, null, null );
        }
    },
    null
);
