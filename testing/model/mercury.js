var serialport = require('serialport');
var SerialPort = serialport.SerialPort;
var async = require('async');
var crc = require('crc');
var data = require('./data/data').getData;
function Mercury(){
    var self = this;
    self.connectionParams = undefined;
    self.connectionCallback = undefined;
    self.connectionCBIssued = false;
    self.client = undefined;
    self.currentDataToSend = undefined;
    self.connectionState = 0;
    self.packetDelay = 1000;
    self.connectTimeout = undefined;
    self.receiveTimeout = undefined;
    self.receiveTimeoutTime = 3000;
    self.globalTimeoutTime = 4500;
    self.readPacket = undefined;
    self.nextRequest = undefined;
    self.isSendingPacket = false;
    self.isReadingPacket = false;
    self.responsePacket = new Buffer(1000);
    self.responsePacketSize = 0;
    self.readRequest = new Buffer(150);
    self.connectRequest = new Buffer([0x01,0x01,0x01,0x01,0x01,
                                        0x01,0x01,0x01,0x01,0x7A,0x11]);  // address : 0x01 password 7x 0x01
    self.totEnergyFromLastReset = new Buffer([0x01,0x05,0x00,0x00,0x11,0xD9]); // Опрос накопленной энергии от начала сброса
    self.totalEnergyToday = new Buffer([0x01,0x05,0x40,0x00,0x20,0x19]); // За текущие сутки
    self.totalEnergyPrevDay = new Buffer([0x01,0x05,0x50,0x00,0x2D,0xD9]);// За предыдущие сутки
    self.totalEnergyPrevYear = new Buffer([0x01,0x05,0x20,0x00,0x08,0x19]); //За предыдущий год
    self.totalEnergyCurrentYear = new Buffer([0x01,0x05,0x10,0x00,0x1C,0x19]); //За текущий год
    self.totalEnergyCurrentMonth = new Buffer([0x01,0x05,0x31,0x00,0x04,0x49]); //За текущий месяц  // январь 1 3ий байт 2ое значение
    self.totalEnergyPrevMonth = new Buffer([0x01,0x05,0x3C,0x00,0x00,0xD9]); //За предыдущий месяц //декабрь C


    self.currentPerPhase = new Buffer([0x01,0x08,0x16,0x21,0x4E,0x62]); // Сила тока (А) по фазам
    self.powerCoefficientPerPhase = new Buffer([0x01,0x08,0x16,0x30,0x8E,0x6E]); // Коэффициент мощности (С) по фазам
    self.frequency = new Buffer([0x01,0x08,0x16,0x40,0x8F,0x8A]); // Частота Гц
    self.angleBetweenPhases = new Buffer([0x01,0x08,0x16,0x51,0x4F,0x86]); // Угол между фазами
    self.powerPerPhaseP = new Buffer([0x01,0x08,0x16,0x00,0x8E,0x7A]); // Мощность P (Вт) по фазам
    self.powerS = new Buffer([0x01,0x08,0x16,0x08,0x8F,0xBC]); // Мощность S (ВА)
    self.voltageU = new Buffer([0x01,0x08,0x16,0x11,0x4E,0x76]); // Напряжение U (В)a
    self.closeSession = new Buffer([0x01,0x02,0x81,0xE1]); // Завершение сеанса

    self.currentValues = {
        totEnergyFromLastReset : {
            Aplus: undefined,
            Amin: undefined,
            Rplus: undefined,
            Rmin: undefined
        },
        totalEnergyToday : {
            Aplus: undefined,
            Amin: undefined,
            Rplus: undefined,
            Rmin: undefined
        },
        totalEnergyPrevYear : {
            Aplus: undefined,
            Amin: undefined

        },
        currentPerPhase : {

            phase1: undefined,
            phase2: undefined,
            phase3: undefined
        },
        powerCoefficientPerPhase : {
            sum: undefined,
            phase1: undefined,
            phase2: undefined,
            phase3: undefined
        },
        frequency : undefined,
        angleBetweenPhases : {
            phase1: undefined,
            phase2: undefined,
            phase3: undefined
        },
        powerPerPhaseP : {
            sum: undefined,
            phase1: undefined,
            phase2: undefined,
            phase3: undefined
        },
        powerS :{
            sum: undefined,
            phase1: undefined,
            phase2: undefined,
            phase3: undefined
        },
        voltageU : {
            phase1: undefined,
            phase2: undefined,
            phase3: undefined
        },
        totalEnergyCurrentYear :{
            Aplus: undefined,
            Amin: undefined,
            Rplus: undefined,
            Rmin: undefined
        },
        totalEnergyCurrentMonth : {
            Aplus: undefined,
            Amin: undefined,
            Rplus: undefined,
            Rmin: undefined
        },
        totalEnergyPrevMonth : {
            Aplus: undefined,
            Amin: undefined,
            Rplus: undefined,
            Rmin: undefined
        },
        totalEnergyPrevDay : {
            Aplus: undefined,
            Amin: undefined,
            Rplus: undefined,
            Rmin: undefined
        }
        //TODO identification number

    }
    self.readRequestArray = data;
}

Mercury.prototype.initiateConnection = function(connParams, callback){
    var self = this;
    if(connParams === undefined) {
        connParams = {comPort: 'COM5'};
    }
    self.connectionParams = connParams.comPort;
    self.connectionCallback = callback;
    self.connectionCBIssued = false;
    self.connectNow(self.connectionParams);
}

Mercury.prototype.connectNow = function(connParams){
    var self = this;
    if(self.connectionState >=1) return;
    self.connectionCleanup();
    self.client =  new SerialPort(connParams, {
        baudrate: 9600,
        databits: 8,
        stopBits: 1,
        parity: 'none',
        buffersize: 35,
        parser: serialport.parsers.raw
    }, false); // open immediatly flag! default is true

    console.log('initiating a new connection');
    console.log('Attempting to connect to port...',0,self.connectionParams);
    if(self.client.isOpen()){
        console.log('PORT IS ALREADY USED BY ANOTHER PROGRAM');
        self.connectionReset();
    }else{
        self.client.open(function(err){
            if(err) self.connectError(err);
            self.onConnected();
        });
    }
};


Mercury.prototype.onConnected = function(){
    var self = this;
    self.connectionState = 2; //2 = serial is connected wait for receiving login confirmation
    self.connectTimeout = setTimeout(function(){
       self.packetTimeout();
    }, self.globalTimeoutTime);

    self.client.write(self.connectRequest.slice(0,11), function(err, result){   //LOGIN
        //TODO what do we need to do with err and result
        //TODO log errors into file
        console.log(err,result + 'AAAAAAA'); // result returns written buffer size
    });

    //listen for reply
    self.client.on('data', function(data){
        console.log('Received response on LOGIN ' + data.toString('hex'));
        self.onConnectReply(data);
        self.client.flush(function(err,res){
           console.log(err,res);
        });
    });
};
Mercury.prototype.onConnectReply = function(){
    var self = this;
    self.client.removeAllListeners('data');
    clearTimeout(self.connectTimeout);

    self.connectionState = 4; //ITS ok we can now pass data ;

    //TODO  make if loops that check the response

    self.client.on('data', function(data){
        self.client.flush(function(err,res){
            console.log(err,res);
        });
        self.onResponse(data);
    });
    self.client.on('error', function(err){
        self.writeError(err);
    });

    if((!self.connectionCBIssued) && (typeof(self.connectionCallback) === "function")){
        self.connectionCBIssued = true;

        self.connectionCallback();  //TRIGGER FUNCTION READITEMS
        self.connectCBIssued = false;
        self.sendReadPacket(true);
    }

};

//Mercury.prototype.sendReadPacket = function(){  //
//    var self = this;
//    //self.client.write(self.totEnergyFromLastReset.slice(0,self.totEnergyFromLastReset.length),function(err,result){
//    //    console.log(err,result);
//    //});
//
//    self.isSendingPacket = true;
//    console.log("SendReadPacket called");
//    //while(self.connectionState == 4){
//    //    for (var request in self.readRequestArray){
//    //        self.sleep(self.packetDelay, function(){
//    //            self.receiveTimeout = setTimeout(function(){
//    //                console.log(' timeout on receiving data');
//    //                self.connectionReset();
//    //            }, self.receiveTimeoutTime);
//    //            if (self.connectionState == 4 && !self.isReadingPacket) {
//    //                console.log('sending packet for Read ' + request + ' ' + self.readRequestArray[request].length);
//    //                self.client.write(self.readRequestArray[request].slice(0,self.readRequestArray[request].length),function(err,result){
//    //                    console.log(err, result);
//    //                });
//    //                self.isReadingPacket = true;
//    //            }
//    //        });
//    //    }
//    //}
//
//};
Mercury.prototype.onResponse = function(data){
    var self = this;

    if(data.length < 2){
        //TODO
        console.log('BAD RESPONSE RECEIVED , resending same request')
        self.sendReadPacket(false);
        return;
    }else{
        var receivedCRC = data.readUInt16LE(data.length - 2).toString(16);
        var checkCRC = crc.crc16modbus(data.slice(0, data.length -2)).toString(16);
    }
    if(receivedCRC != checkCRC){
        //TODO
        console.log('BAD RESPONSE RECEIVED , resending same request')
        self.sendReadPacket(false);
    }else{
        //if(self.currentDataToSend){
        //TODO  make if loops that check the response
        self.isReadingPacket = false;
        //clearTimeout(self.receiveTimeout);
        // TODO pass further console log


        data.copy(self.responsePacket, self.responsePacketSize);
        console.log(data); //TODO
        console.log(self.nextRequest[0]);

        self.extractValues(data);


        self.sendReadPacket(true);
        self.responsePacketSize += data.length;
        //}
    }

    //console.log(self.responsePacket);




};
Mercury.prototype.extractValues = function(data){
    var self = this;
    switch(self.nextRequest[0]){
        case 'totEnergyFromLastReset':
            function extractTotEnergyFromLastReset (){
                var byte1 = data.slice(0, data.length).readUInt16LE(1).toString(16);
                var byte2 = data.slice(0, data.length).readUInt16LE(3).toString(16);
                var byte3 = data.slice(0, data.length).readUInt16LE(5).toString(16);
                var byte4 = data.slice(0, data.length).readUInt16LE(7).toString(16);
                var byte5 = data.slice(0, data.length).readUInt16LE(9).toString(16);
                var byte6 = data.slice(0, data.length).readUInt16LE(11).toString(16);
                var byte7 = data.slice(0, data.length).readUInt16LE(13).toString(16);
                var byte8 = data.slice(0, data.length).readUInt16LE(15).toString(16);

                self.currentValues.totEnergyFromLastReset.Aplus = parseInt(byte1 + byte2,16)/1000;
                self.currentValues.totEnergyFromLastReset.Amin = parseInt(byte3 + byte4,16)/1000;
                self.currentValues.totEnergyFromLastReset.Rplus = parseInt(byte5 + byte6,16)/1000;
                self.currentValues.totEnergyFromLastReset.Rmin = parseInt(byte7 + byte8,16)/1000;
            }
            extractTotEnergyFromLastReset();
            break;
        case 'totalEnergyPrevDay':
            function extractTotalEnergyPrevDay (){
                var byte1 = data.slice(0, data.length).readUInt16LE(1).toString(16);
                var byte2 = data.slice(0, data.length).readUInt16LE(3).toString(16);
                var byte3 = data.slice(0, data.length).readUInt16LE(5).toString(16);
                var byte4 = data.slice(0, data.length).readUInt16LE(7).toString(16);
                var byte5 = data.slice(0, data.length).readUInt16LE(9).toString(16);
                var byte6 = data.slice(0, data.length).readUInt16LE(11).toString(16);
                var byte7 = data.slice(0, data.length).readUInt16LE(13).toString(16);
                var byte8 = data.slice(0, data.length).readUInt16LE(15).toString(16);

                self.currentValues.totalEnergyPrevDay.Aplus = parseInt(byte1 + byte2,16)/1000;
                self.currentValues.totalEnergyPrevDay.Amin = parseInt(byte3 + byte4,16)/1000;
                self.currentValues.totalEnergyPrevDay.Rplus = parseInt(byte5 + byte6,16)/1000;
                self.currentValues.totalEnergyPrevDay.Rmin = parseInt(byte7 + byte8,16)/1000;         }
            extractTotalEnergyPrevDay();
            break;
        case 'totalEnergyPrevYear':
        function extractTotalEnergyPrevYear (){
            var byte1 = data.slice(0, data.length).readUInt16LE(1).toString(16);
            var byte2 = data.slice(0, data.length).readUInt16LE(3).toString(16);
            var byte3 = data.slice(0, data.length).readUInt16LE(5).toString(16);
            var byte4 = data.slice(0, data.length).readUInt16LE(7).toString(16);
            var byte5 = data.slice(0, data.length).readUInt16LE(9).toString(16);
            var byte6 = data.slice(0, data.length).readUInt16LE(11).toString(16);
            var byte7 = data.slice(0, data.length).readUInt16LE(13).toString(16);
            var byte8 = data.slice(0, data.length).readUInt16LE(15).toString(16);

            self.currentValues.totalEnergyPrevYear.Aplus = parseInt(byte1 + byte2,16)/1000;
            self.currentValues.totalEnergyPrevYear.Amin = parseInt(byte3 + byte4,16)/1000;
            self.currentValues.totalEnergyPrevYear.Rplus = parseInt(byte5 + byte6,16)/1000;
            self.currentValues.totalEnergyPrevYear.Rmin = parseInt(byte7 + byte8,16)/1000;
        }
            extractTotalEnergyPrevYear();
            break;
        case 'totalEnergyCurrentYear':
        function extractTotalEnergyCurrentYear (){
            var byte1 = data.slice(0, data.length).readUInt16LE(1).toString(16);
            var byte2 = data.slice(0, data.length).readUInt16LE(3).toString(16);
            var byte3 = data.slice(0, data.length).readUInt16LE(5).toString(16);
            var byte4 = data.slice(0, data.length).readUInt16LE(7).toString(16);
            var byte5 = data.slice(0, data.length).readUInt16LE(9).toString(16);
            var byte6 = data.slice(0, data.length).readUInt16LE(11).toString(16);
            var byte7 = data.slice(0, data.length).readUInt16LE(13).toString(16);
            var byte8 = data.slice(0, data.length).readUInt16LE(15).toString(16);

            self.currentValues.totalEnergyCurrentYear.Aplus = parseInt(byte1 + byte2,16)/1000;
            self.currentValues.totalEnergyCurrentYear.Amin = parseInt(byte3 + byte4,16)/1000;
            self.currentValues.totalEnergyCurrentYear.Rplus = parseInt(byte5 + byte6,16)/1000;
            self.currentValues.totalEnergyCurrentYear.Rmin = parseInt(byte7 + byte8,16)/1000;
        }
            extractTotalEnergyCurrentYear();
            break;
        case 'totalEnergyCurrentMonth':
        function extractTotalEnergyCurrentMonth (){
            var byte1 = data.slice(0, data.length).readUInt16LE(1).toString(16);
            var byte2 = data.slice(0, data.length).readUInt16LE(3).toString(16);
            var byte3 = data.slice(0, data.length).readUInt16LE(5).toString(16);
            var byte4 = data.slice(0, data.length).readUInt16LE(7).toString(16);
            var byte5 = data.slice(0, data.length).readUInt16LE(9).toString(16);
            var byte6 = data.slice(0, data.length).readUInt16LE(11).toString(16);
            var byte7 = data.slice(0, data.length).readUInt16LE(13).toString(16);
            var byte8 = data.slice(0, data.length).readUInt16LE(15).toString(16);

            self.currentValues.totalEnergyCurrentMonth.Aplus = parseInt(byte1 + byte2,16)/1000;
            self.currentValues.totalEnergyCurrentMonth.Amin = parseInt(byte3 + byte4,16)/1000;
            self.currentValues.totalEnergyCurrentMonth.Rplus = parseInt(byte5 + byte6,16)/1000;
            self.currentValues.totalEnergyCurrentMonth.Rmin = parseInt(byte7 + byte8,16)/1000;
        }
            extractTotalEnergyCurrentMonth();
            break;
        case 'totalEnergyPrevMonth':
        function extractTotalEnergyPrevMonth (){
            var byte1 = data.slice(0, data.length).readUInt16LE(1).toString(16);
            var byte2 = data.slice(0, data.length).readUInt16LE(3).toString(16);
            var byte3 = data.slice(0, data.length).readUInt16LE(5).toString(16);
            var byte4 = data.slice(0, data.length).readUInt16LE(7).toString(16);
            var byte5 = data.slice(0, data.length).readUInt16LE(9).toString(16);
            var byte6 = data.slice(0, data.length).readUInt16LE(11).toString(16);
            var byte7 = data.slice(0, data.length).readUInt16LE(13).toString(16);
            var byte8 = data.slice(0, data.length).readUInt16LE(15).toString(16);

            self.currentValues.totalEnergyPrevMonth.Aplus = parseInt(byte1 + byte2,16)/1000;
            self.currentValues.totalEnergyPrevMonth.Amin = parseInt(byte3 + byte4,16)/1000;
            self.currentValues.totalEnergyPrevMonth.Rplus = parseInt(byte5 + byte6,16)/1000;
            self.currentValues.totalEnergyPrevMonth.Rmin = parseInt(byte7 + byte8,16)/1000;
        }
            extractTotalEnergyPrevMonth();
            break;
        case 'totalEnergyToday':
        function extractTotalEnergyToday (){
            var byte1 = data.slice(0, data.length).readUInt16LE(1).toString(16);
            var byte2 = data.slice(0, data.length).readUInt16LE(3).toString(16);
            var byte3 = data.slice(0, data.length).readUInt16LE(5).toString(16);
            var byte4 = data.slice(0, data.length).readUInt16LE(7).toString(16);
            var byte5 = data.slice(0, data.length).readUInt16LE(9).toString(16);
            var byte6 = data.slice(0, data.length).readUInt16LE(11).toString(16);
            var byte7 = data.slice(0, data.length).readUInt16LE(13).toString(16);
            var byte8 = data.slice(0, data.length).readUInt16LE(15).toString(16);

            self.currentValues.totalEnergyToday.Aplus = parseInt(byte1 + byte2,16)/1000;
            self.currentValues.totalEnergyToday.Amin = parseInt(byte3 + byte4,16)/1000;
            self.currentValues.totalEnergyToday.Rplus = parseInt(byte5 + byte6,16)/1000;
            self.currentValues.totalEnergyToday.Rmin = parseInt(byte7 + byte8,16)/1000;
        }
            extractTotalEnergyToday();
            break;
        case 'currentPerPhase':

        function extractCurrentPerPhase (){
            var a = data.slice(0, data.length).readUInt16BE(1).toString(16);
            var b = data.slice(0, data.length).readUInt8(3).toString(16);
            var phase1  = b + a;
            var c = data.slice(0, data.length).readUInt16BE(4).toString(16);
            var d = data.slice(0, data.length).readUInt8(6).toString(16);
            var phase2  = d + c;
            var e = data.slice(0, data.length).readUInt16BE(7).toString(16);
            var f = data.slice(0, data.length).readUInt8(9).toString(16);
            var phase3  = f + e;
            self.currentValues.currentPerPhase.phase1 = parseInt(phase1,16)/1000;
            self.currentValues.currentPerPhase.phase2 = parseInt(phase2,16)/1000;
            self.currentValues.currentPerPhase.phase3 = parseInt(phase3,16)/1000;
        }
            extractCurrentPerPhase();
            break;
        case 'powerCoefficientPerPhase':
        function extractPowerCoefficientPerPhase (){

            var sum = data.slice(0, data.length).readUInt16LE(2).toString(16);
            var phase1 = data.slice(0, data.length).readUInt16LE(5).toString(16);
            var phase2 = data.slice(0, data.length).readUInt16LE(8).toString(16);
            var phase3 = data.slice(0, data.length).readUInt16LE(11).toString(16);
            self.currentValues.powerCoefficientPerPhase.sum = parseInt(sum,16)/1000;
            self.currentValues.powerCoefficientPerPhase.phase1 = parseInt(phase1,16)/1000;
            self.currentValues.powerCoefficientPerPhase.phase2 = parseInt(phase2,16)/1000;
            self.currentValues.powerCoefficientPerPhase.phase3 = parseInt(phase3,16)/1000;
        }
            extractPowerCoefficientPerPhase();
            break;
        case 'frequency':
        function extractFrequency (){
            var frequency = data.slice(0, data.length).readUInt16LE(data.length - 4).toString(16);
            self.currentValues.frequency = parseInt(frequency,16)/100;
        }
            extractFrequency();
            break;
        case 'angleBetweenPhases':
        function extractAngleBetweenPhases (){
            var a = data.slice(0, data.length).readUInt16BE(1).toString(16);
            var b = data.slice(0, data.length).readUInt8(3).toString(16);
            var phase1  = b + a;
            var c = data.slice(0, data.length).readUInt16BE(4).toString(16);
            var d = data.slice(0, data.length).readUInt8(6).toString(16);
            var phase2  = d + c;
            var e = data.slice(0, data.length).readUInt16BE(7).toString(16);
            var f = data.slice(0, data.length).readUInt8(9).toString(16);
            var phase3  = f + e;

            self.currentValues.angleBetweenPhases.phase1 = parseInt(phase1,16);
            self.currentValues.angleBetweenPhases.phase2 = parseInt(phase2,16);
            self.currentValues.angleBetweenPhases.phase3 = parseInt(phase3,16);
        }
            extractAngleBetweenPhases();
            break;
        case 'powerPerPhaseP':
        function extractPowerPerPhaseP (){
            var phase1 = data.slice(0, data.length).readUInt16LE(2).toString(16);
            var phase2 = data.slice(0, data.length).readUInt16LE(5).toString(16);
            var phase3 = data.slice(0, data.length).readUInt16LE(8).toString(16);
            self.currentValues.powerPerPhaseP.phase1 = parseInt(phase1,16)/100;
            self.currentValues.powerPerPhaseP.phase2 = parseInt(phase2,16)/100;
            self.currentValues.powerPerPhaseP.phase3 = parseInt(phase3,16)/100;
        }
            extractPowerPerPhaseP();
            break;
        case 'powerS':
        function extractPowerS (){
            var sum = data.slice(0, data.length).readUInt16LE(2).toString(16);
            var phase1 = data.slice(0, data.length).readUInt16LE(5).toString(16);
            var phase2 = data.slice(0, data.length).readUInt16LE(8).toString(16);
            var phase3 = data.slice(0, data.length).readUInt16LE(11).toString(16);
            self.currentValues.powerS.sum = parseInt(sum,16)/100;
            self.currentValues.powerS.phase1 = parseInt(phase1,16)/100;
            self.currentValues.powerS.phase2 = parseInt(phase2,16)/100;
            self.currentValues.powerS.phase3 = parseInt(phase3,16)/100;
        }
            extractPowerS();
            break;
        case 'voltageU':
        function extractVoltageU (){
            var phase1 = data.slice(0, data.length).readUInt16LE(2).toString(16);
            var phase2 = data.slice(0, data.length).readUInt16LE(5).toString(16);
            var phase3 = data.slice(0, data.length).readUInt16LE(8).toString(16);
            self.currentValues.voltageU.phase1 = parseInt(phase1,16)/100;
            self.currentValues.voltageU.phase2 = parseInt(phase2,16)/100;
            self.currentValues.voltageU.phase3 = parseInt(phase3,16)/100;
        }
            extractVoltageU();
            break;
    }
}
Mercury.prototype.sendReadPacket = function (isOK) {
    var self = this;

    self.isSendingPacket = true;
    console.log("SendReadPacket called");
    if(isOK){
        self.nextRequest = self.readRequestArray.shift();
    }



    if (!self.nextRequest) {

        self.sleep(1000, function(){
            console.log('done');
            //TODO

            //var b = self.responsePacket.slice(0, self.responsePacketSize).readUInt16LE(1).toString(16);
            //var c = self.responsePacket.slice(0, self.responsePacketSize).readUInt16LE(3).toString(16);
            //var a = b + c;
            //console.log(parseInt(a, 16));
            console.log(self.currentValues);
            //console.log(self.responsePacket.slice(0, self.responsePacketSize).toString('hex'), self.responsePacketSize)
            process.exit();
        })


        //setTimeout(function(){
        //    queue = [[getPasswordReq(), 'passwordResponse'],
        //        [totalE(),'energyResponse'],
        //        [totalEtoday(),'energyTodayResp'],
        //        [totalEyesterday(),'energyYestResp'],
        //        [current(),'currentResponse'],
        //        [power(),'powerResponse'],
        //        [logout(),'logoutResp']
        //    ];
        //    device._queue = queue;
        //
        //    //console.log(queue);
        //    device.processQueue();
        //    // return;
        //},5000)
    }else{
        self.sleep(10, function(){
            console.log(self.nextRequest);
            self.currentDataToSend = self.nextRequest;
            self.client.write(self.nextRequest[1].slice(0,self.nextRequest[1].length));
        });
    }
};
Mercury.prototype.sleep = function(time, callback){
    var now = new Date().getTime();
    while(new Date().getTime() < (now + time)){
        //do nothing
    }
    callback();
};
Mercury.prototype.connectionReset = function(){
    var self = this;
    console.log('connectionReset is happening');
    // TODO
}
Mercury.prototype.connectionCleanup = function(){
    var self = this;
    // TODO
};

Mercury.prototype.packetTimeout = function(){
    var self = this;
    // TODO
};

Mercury.prototype.connectError = function(err){
    var self = this;
    // TODO
};

Mercury.prototype.writeError = function(){
    var self = this;
    // TODO
};

var Merc = new Mercury();
Merc.initiateConnection({comPort:'COM4'},function(){
    console.log('callback called');
})


module.exports = Mercury;