//We must test the ability to generate genotypes, force parents, and create valid offspring according to the schema

var assert = require('assert');
var should = require('should');
var colors = require('colors');
var Q = require('q');

var util = require('util');

var winnovelty = require('..');
var wMath = require('win-utils').math;
var uuid = require('win-utils').cuid;
var winback = require('win-backbone');

var backbone, generator, backEmit, backLog;
var evoTestEnd;
var count = 0;

var emptyModule = 
{
	winFunction : "test",
	eventCallbacks : function(){ return {}; },
	requiredEvents : function() {
		return [
        "novelty:measureNovelty",
        "novelty:getArchive",
        "novelty:addPending",
        "novelty:clearArchive"
			];
	}
};

var shouldEnterReference;

var shouldEnterArchive = function()
{
    return shouldEnterReference.apply(this, arguments);
}


var randomUniformBehaviors = function(objectCount, length)
{
    var start = 0;
    var dx = 1.0/(objectCount -1);

    var behaviors = {};

    for(var i=0; i < objectCount; i++)
    {
        var tObject = {behaviors:[]};

        for(var b=0; b < length; b++)
            tObject.behaviors.push(start);

        behaviors[i] = tObject;

        start += dx;
    }

    return behaviors;
}

describe('Testing win-data for: ', function(){

    //we need to start up the WIN backend
    before(function(done){

    	//do this up front yo
    	backbone = new winback();


    	var exampleJSON = 
		{
			"win-novelty" : winnovelty,
			"test" : emptyModule
		};

		var configurations = 
		{
			"global" : {
                "server" : "http://localhost",
                "port" : "3000"
			},
            "win-data" : {
                logLevel : backbone.testing
            },
			"win-novelty" : {
                shouldEnterArchive : shouldEnterArchive,
				logLevel : backbone.testing
			}
		};

    	backbone.logLevel = backbone.testing;

    	backEmit = backbone.getEmitter(emptyModule);
    	backLog = backbone.getLogger({winFunction:"mocha"});
    	backLog.logLevel = backbone.testing;

    	//loading modules is synchronous
    	backbone.loadModules(exampleJSON, configurations);

    	var registeredEvents = backbone.registeredEvents();
    	var requiredEvents = backbone.moduleRequirements();
    		
    	backLog('Backbone Events registered: ', registeredEvents);
    	backLog('Required: ', requiredEvents);

    	backbone.initializeModules(function()
    	{
    		backLog("Finished Module Init");
 			done();
    	});

    });

    it('measure novelty correctly',function(done){

        var length = 3 + wMath.next(4);

        //uniform distribution
        var objectCount = 2 + wMath.next(4);
        var dx = 1.0/(objectCount -1);

        var behaviors = randomUniformBehaviors(objectCount,length);

     
        backLog.log("All together: ", behaviors);

       //deny entrance to the archive
        shouldEnterReference =  function(wid, behavior){ 
           
            behaviors[wid].behaviors.length.should.equal(length);
            behaviors[wid].behaviors[0].toFixed(5).should.equal((parseInt(wid)*dx).toFixed(5));

            backLog.log("Should enter archive? ", arguments); 
            return false;
        };

        // var temporaryRequest = "http://localhost:3000/api/artifacts?artifactType=picArtifact&all=true&password=allplease";
        var popEvals = behaviors;//{0:{behaviors:[0,0,0,0,0]},1:{behaviors:[1,1,1,1,1]}};

        backEmit("novelty:measureNovelty", popEvals, function(err, nMeasurements){

            if(err){
                done(new Error(err));
                return;
            }

            //duh    
            var dx2 = dx*dx;

            var min;

            //if you're odd
            if(objectCount % 2)
            {
                min = 0;
                for(var i=0; i < objectCount-1; i++)
                {
                    var level = Math.floor(i/2);
                    var pow = Math.pow(level + 1, 2);
                    min += pow*dx2*length;
                }
            }
            else
            {
                min = 0;
                
                var halfOC = objectCount/2;

                for(var i=0; i < objectCount-1; i++)
                {
                    var level = Math.floor(i/2);
                    var pow = Math.pow(level + 1, 2);
                    min += pow*dx2*length;
                }
                // min += Math.pow(halfOC*dx, 2);
            }

            //lets test!
            nMeasurements.minimum.toFixed(5).should.equal(min.toFixed(5));
            // nMeasurements.maximum.should.equal(length + dx*dx*(length-1));

            done();
        })

    });

     it('get novelty archive',function(done){

        var length = 3 + wMath.next(4);

        //uniform distribution
        var objectCount = 2 + wMath.next(4);
        var dx = 1.0/(objectCount -1);

        var behaviors = randomUniformBehaviors(objectCount,length);

       //every one gets entrance to the archive!!!
        shouldEnterReference =  function(wid, behavior){ 
           
            behaviors[wid].behaviors.length.should.equal(length);
            behaviors[wid].behaviors[0].toFixed(5).should.equal((parseInt(wid)*dx).toFixed(5));
            return true;
        };

        //do this synchronously, whatever!
        backEmit("novelty:clearArchive");

        //now measure -- everything gets added to the archive!
        backEmit("novelty:measureNovelty", behaviors, function(err, nMeasurements){

            if(err){
                done(new Error(err));
                return;
            }

             backEmit("novelty:getArchive", function(err, archive){

                if(err){
                    done(new Error(err));
                    return;
                }

                backLog("Got archive: ", archive);

                //yazoooooo
                for(var wid in behaviors)
                {
                    should.exist(archive[wid]);
                }

                done();
            })

        })

    });



    // it('add to archive test',function(done){

    //     done(new Error("Not implemented"));

    // });

});







