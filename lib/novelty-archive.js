/**
 * Module dependencies.
 */

/**
 * Expose `Novelty`.
 */

module.exports = NoveltyArchive;


function distance(x, y)
{
    var dist = 0.0;

    if(!x || !y)
        throw new Error("One of the behaviors is empty, can't compare distance!");

    //simple calculation, loop through double array and sum up square differences
    for(var k=0;k<x.length;k++)
    {
        var delta = x[k]-y[k];
        dist += delta*delta;
    }

    //return square distance of behavior
    return dist;
};

function NoveltyArchive(logger, config)
{
    var self = this;

    //lets add some functions to self
    self.nearestNeighbors = config.nearestNeighbors || 20;
    //how do they enter the archive -- this is cusomizable from the outside
    //this function returns true/false for entering an object into archive
    var shouldEnterArchive = config.shouldEnterArchive || defaultShouldEnterArchive;

    var preArchiveAdditions = config.preArchiveAdditions || defaultPreArchiveAdditions;
    var postArchiveAdditions = config.postArchiveAdditions || defaultPostArchiveAdditions;

    //by default we use thresholding to enter archive (in the future it will be probabilist additions)
    self.archiveThreshold = config.archiveThreshold || 10.0;

    //what's the most novel thing everrrrrrrr
    self.maxDistSeen = Number.MIN_VALUE;

    self.pending = {};

    //archive and the measure against object
    //these two determine your nearest neighbors -- and if you deserve entry into the archive!
    self.archive = {};
    self.measureAgainst = {};

    self.isEmpty = true;


    self.addPending = function()
    {
        //might do a few things -- if pending is empty, archive threshold can be adjusted
        //or it might do nothing but couint number of new potential additions
        preArchiveAdditions(self.pending);

        var addedObjects = {};

        for(var wid in self.pending)
        {
            var artifactEval = self.pending[wid];

            //add object to our archive, if it returns positively from the shouldenter function
            //should enter can be done a number of ways -- including by threshold or probabilistically (WOW THAT WORD)
            if(shouldEnterArchive(wid, artifactEval, self.archive)){
                self.archive[wid] = artifactEval;
                addedObjects[wid] = artifactEval;
            }
        }

        //just let anything know we've gone and added some objects to the archive 
        postArchiveAdditions(addedObjects);

        //clear that out -- not needed anymore
        addedObjects = {};

        //clear our pending, thanks
        self.pending = {};
    }

    self.setMeasureAgainst = function(popEvaluations)
    {
        self.measureAgainst = {};
        for(var wid in popEvaluations)
        {
            //set the behaviors and things to compare against for the archive
            self.measureAgainst[wid] = popEvaluations[wid];
        }
    }

    //this is the true functionality of novelty
    self.measureNovelty = function(artWID, artifactEval)
    {
        var sum = 0.0;
        var noveltyList = [];

        for(var wid in self.measureAgainst)
        {
            var measure = self.measureAgainst[wid];
            noveltyList.push(
                {wid: wid, distance: distance(measure.behaviors, artifactEval.behaviors), list: "measureAgainst"}
            );
        }

        for(var wid in self.archive)
        {
            var measure = self.archive[wid];
            noveltyList.push(
                {wid: wid, distance: distance(measure.behaviors, artifactEval.behaviors), list: "archive"}
            );
        }

        //need a wid, an eval, and the archive
        //see if we should add this genome to the archive
        if(shouldEnterArchive(artWID, artifactEval, self.archive))
        {
            //add this to our pending objects that may very well be entered
            self.pending[artWID] = artifactEval;
        }

        //now sort to find nearest neighbors
        noveltyList.sort(function(a,b){return b.distance - a.distance});


        var nn = self.nearestNeighbors;

        //can't have more neighbors than THE WHOLE LIST
        if(noveltyList.length < self.nearestNeighbors) {
            nn=noveltyList.length;
        }

        //note our nearest neighbors is an object we'll be filling in shortly
        var nearestNeighbors = {};

        //Paul - reset local competition and local genome novelty -- might have been incrementing over time
        //Not sure if that's the intention of the algorithm to keep around those scores to signify longer term success
        //this would have a biasing effect on individuals that have been around for longer
    //            artifactEval.competition = 0;
    //            artifactEval.localGenomeNovelty = 0;


        //TODO: Verify this is working - are local objectives set up, is this measuring properly?
        for (var x = 0; x < nn; x++)
        {
            var dist = noveltyList[x].distance;
            //measure the sum of your nearest neighbors
            sum += dist;
            //we store ID and distance for nearest neighbors
            nearestNeighbors[noveltyList[x].wid] = dist;
        }

        //we send back the novelty information for this object
        //how novel, nearest neighbors, and the actual count of nearest neighbors
        return {novelty: sum, nearestNeighbors: nearestNeighbors, neighborCount: nn, averageNovelty: sum/nn};
    }

    function defaultShouldEnterArchive(wid, artifactEval, archive)
    {
        //the archive is a list of artifact wids, then the behavior objects
        for(var wid in archive)
        {
            var eval = archive[wid];

            //what is the distance
            var dist = distance(artifactEval.behaviors, archive[wid].behaviors);

            if(dist > self.maxDistSeen)
            {
                self.maxDistSeen = dist;
                logger.log('Most novel dist: ' + self.maxDistSeen);
            }

            if(dist < self.archiveThreshold)
                return false;
        }

        return true;
    }

    //can force anything into the archive!
    //no callbacks here -- just insertion hehehe
    self.forceAddArchive = function(wid, artifactEval)
    {
        self.archive[wid] = artifactEval;
    }

    //we alter the acrhive threhold depending 
    function defaultPreArchiveAdditions(pending)
    {
        var length = Object.keys(pending).length;

        if(length === 0)
        {
            self.archiveThreshold *= .95;
        }
        if(length > 5)
        {
            self.archiveThreshold *= 1.3;
        }
    }
    //meh.
    function defaultPostArchiveAdditions(added)
    {
    }

    return self;
}