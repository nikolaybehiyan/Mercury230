var isReadingPacket = false;
var bb = {
    totEnergyFromLastReset: 1,
    totalEnergyPrevDay : 11,
    totalEnergyToday: 111,
    currentPerPhase: 1111,
    powerCoefficientPerPhase: 11111,
    frequency: 111111,
    angleBetweenPhases: 2,
    powerPerPhaseP: 22,
    powerS: 222,
    voltageU: 2222
}
function cc (bla){
    isReadingPacket = false;
    console.log(bla);
}
var aa = function(){
    var j = 0;
    for (var request in bb){
        var delay = setTimeout(function(){
            if (!isReadingPacket) {

                isReadingPacket = true;
                cc (bb[request]);
                j++;

            }
        }, 1000);

    }
}



function sleep(callback) {
        var now = new Date().getTime();
        while(new Date().getTime() < (now + 1000)) {
            // do nothing
        }
        callback();
}

console.log('Sleep');
while(true){
    for(var request in bb) {
        sleep(function() {console.log(bb[request])});
    }
}

