myApp.controller('indexCtrl', ['$scope', '$http' , function($scope,$http){


    $scope.delete = function(scope){
        console.log(scope.$modelValue.id)
        $http.post('/removeCounter', {id: scope.$modelValue.id}).success(function(){
           scope.remove();
        });
    };
    $scope.save = function(scope){
        scope.editing = false;
        // TODO extract node , search this node in db and save changed params
        console.log(scope);
        $http.post('/postNewCounter', scope).success(function(err){
            alert(err);
        });
        refresh();
    };
    $scope.exit = function(scope){
        scope.editing = false;
    };
    $scope.edit = function(scope){
        // TODO extract node , search this node in db ans save changed params
        scope.editing = true;
    };
    $scope.allParams = [
        'totEnergyFromLastResetAplus',
        'totEnergyFromLastResetAmin',
        'totEnergyFromLastResetRplus',
        'totEnergyFromLastResetRmin',
        'totalEnergyTodayAplus',
        'totalEnergyTodayAmin',
        'totalEnergyTodayRplus',
        'totalEnergyTodayRmin',
        'totalEnergyPrevYearAplus',
        'totalEnergyPrevYearAmin',
        'currentPerPhasePhase1',
        'currentPerPhasePhase2',
        'currentPerPhasePhase3',
        'powerCoefficientPerPhaseSum',
        'powerCoefficientPerPhasePhase1',
        'powerCoefficientPerPhasePhase2',
        'powerCoefficientPerPhasePhase3',
        'frequency',
        'angleBetweenPhasesPhase1',
        'angleBetweenPhasesPhase2',
        'angleBetweenPhasesPhase3',
        'powerPerPhasePSum',
        'powerSSum',
        'powerSPhase1',
        'powerSPhase2',
        'powerSPhase3',
        'voltageUPhase1',
        'voltageUPhase2',
        'voltageUPhase3' ,
        'totalEnergyCurrentYearAplus',
        'totalEnergyCurrentYearAmin',
        'totalEnergyCurrentYearRplus',
        'totalEnergyCurrentYearRmin',
        'totalEnergyCurrentMonthAplus',
        'totalEnergyCurrentMonthAmin',
        'totalEnergyCurrentMonthRplus',
        'totalEnergyCurrentMonthRmin',
        'totalEnergyPrevMonthAplus',
        'totalEnergyPrevMonthAmin',
        'totalEnergyPrevMonthRplus',
        'totalEnergyPrevMonthRmin',
        'totalEnergyPrevDayAplus',
        'totalEnergyPrevDayAmin',
        'totalEnergyPrevDayRplus',
        'totalEnergyPrevDayRmin'
    //TODO identification number
    ]






    $scope.newSubItem = function (scope) {
        //TODO push params into db
        var nodeData = scope.$modelValue;
        nodeData.nodes.push({
            id: nodeData.id * 10 + nodeData.nodes.length,
            title: nodeData.title + '.' + (nodeData.nodes.length + 1),
            nodes: []
        });
    };


    //$http.get('/getPortList').success(function(portList){
    //    $scope.portList = portList;
    //});
    $scope.portList = ['COM1','COM2','COM3'];


    $scope.cons = function(scope){
        var nodeData = scope.$modelValue;
        console.log(nodeData.selectedParams);
    }

    var refresh = function(){
        $http.get('/getAllCounters').success(function(counters){
            $scope.data = counters;
            console.log(JSON.stringify($scope.data));
        });
    }
    refresh();

    //$scope.data = [{
    //    'id': 1,
    //    'title': 'node1',
    //    'nodes': [
    //        {
    //            'id': 11,
    //            'title': 'node1.1',
    //            'editing': false,
    //            'port': 'COM5',
    //            'address': '',
    //            'selectedParams': {},
    //            'nodes': []
    //        },
    //        {
    //            'id': 12,
    //            'title': 'node1.2',
    //            'editing': false,
    //            'port': 'COM5',
    //            'address': '',
    //            'selectedParams': {},
    //            'nodes': []
    //        }
    //    ]
    //}];
}]);
