//here we test the insert functions
//making sure the database is filled with objects of the schema type

var wMath = require('win-utils').math;

//nov archive funcion handling done here
var noveltyArchive = require('./novelty-archive.js');

module.exports = winnovelty;

function winnovelty(backbone, globalConfig, localConfig)
{
	var self = this;

	//boom, let's get right into the business of novelty
	self.winFunction = "novelty";

	self.log = backbone.getLogger(self);
	//only vital stuff goes out for normal logs
	self.log.logLevel = localConfig.logLevel || self.log.normal;

    //not default! -- normally we add pending after calling measure novelty
    self.manualAddPending = localConfig.manualAddPending || false;

    //need to pull local config
    self.noveltyArchive = new noveltyArchive(self.log, localConfig);


	self.eventCallbacks = function()
	{ 
		return {
			//easy to handle neat geno full offspring
            "novelty:measureNovelty" : self.measureNovelty,
            "novelty:addPending" : self.addPending,
            "novelty:clearArchive" : self.clearArchive,
			"novelty:getArchive" : self.retrieveArchive
		};
	};
	//need to be able to add our schema
	self.requiredEvents = function() {
		return [
		];
	};

    self.addPending = function(finished)
    {
        self.noveltyArchive.addPending();
        if(finished)
            finished();
    }

   self.clearArchive = function(finished)
    {
        self.noveltyArchive = new noveltyArchive(self.log, localConfig);

        //all done
        if(finished)
            finished();
    }
    self.retrieveArchive = function(finished)
    {
        if(finished)
            finished(undefined, self.noveltyArchive.archive);
        else
            return self.noveltyArchive.archive;
    }
    //measure novelty of a population
	self.measureNovelty = function(popEvaluations, finished)
    {

        //taking measurements
        var noveltyMeasures = {};

        //we'll count pop size
        var count = 0;

        //reset locality and competition for each genome
        for(var wid in popEvaluations)
        {
            //one up, yo
            count++;

            //pull the evaluation
            var eval = popEvaluations[wid]; 

            //relevant part: behaviors
            if(!eval.behaviors)
                throw new Error("Population evaluation lacks a novelty behavior metric: "+ wid + " full eval: " + JSON.stringify(eval));

            //let's create the novelty measures
            var nm = {locality : 0, competition : 0, behaviors: eval.behaviors, nearestNeighbors: null, novelty: 0};

            //we will store all results in these measures -- then send back appropriate information
            noveltyMeasures[wid] = nm;
        }

        //now we have each object, and what we'll be measuring against for novelty purposes
        self.noveltyArchive.setMeasureAgainst(popEvaluations);

        var artEval;
        var max = 0.0, min = 100000000000.0;

        var nMeasurements = {};

        for(var wid in popEvaluations)
        {
            artEval = popEvaluations[wid]
            var measured = self.noveltyArchive.measureNovelty(wid, artEval);

            max = Math.max(measured.novelty, max);
            min = Math.min(measured.novelty, min);

            nMeasurements[wid] = measured;
        }

        //print normal stuff about min/max novelty -- filtered out by different logging levels
        self.log("nov min: "+ min + " max:" + max);

        //after a good novelty measuring, we should add our pending objects to the archive --
        //unless specified to call this manually
        if(!self.manualAddPending)
            self.noveltyArchive.addPending();

        //return information about all the artifacts
        var results = {minimum: min, maximum: max, novelty: nMeasurements};

        if(finished)
            finished(undefined, results);
        else
            return results;
    };

	return self;
}
