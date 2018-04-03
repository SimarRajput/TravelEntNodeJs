'use strict';
var request = require('request');
var http = require('http');

http.createServer(function(serverRequest, serverResponse)
{
    var url = require('url');
    var url_parts = url.parse(serverRequest.url, true);
    var query = url_parts.query;

    var mode = query.mode;
    var finalUrl = "";

    if(mode == "places")
    {
        finalUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?";
        finalUrl += "location=" + query.location + "&";
        finalUrl += "radius=" +  query.radius + "&";
        finalUrl += "type=" +  query.type + "&";
        finalUrl += "keyword=" +  query.keyword + "&";
        finalUrl += "key=AIzaSyCezipVJkYSdRmEtwdg37OEgW7_fODwvSU";
    }
    else if(mode == "geocode")
    {
        finalUrl = "https://maps.googleapis.com/maps/api/geocode/json?";
        finalUrl += "address=" + query.location + "&";
        finalUrl += "key=AIzaSyCezipVJkYSdRmEtwdg37OEgW7_fODwvSU";
    }
    else if(mode == "nextpage")
    {
        finalUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?";
        finalUrl += "pagetoken=" + query.nextPageToken + "&";
        finalUrl += "key=AIzaSyCezipVJkYSdRmEtwdg37OEgW7_fODwvSU";
    }
    else if(mode == "details")
    {
        finalUrl = "https://maps.googleapis.com/maps/api/place/details/json?";
        finalUrl += "placeid=" + query.placeId + "&";
        finalUrl += "key=AIzaSyCezipVJkYSdRmEtwdg37OEgW7_fODwvSU";
    }
    else if(mode == "yelpmatch")
    {
        finalUrl = "https://api.yelp.com/v3/businesses/matches/best?";
        finalUrl += "name=" + query.name + "&";
        finalUrl += "city=" + query.city + "&";
        finalUrl += "state=" + query.state + "&";
        finalUrl += "country=" + query.country + "&";
        finalUrl += "address1=" + query.address1 + "&";
        finalUrl += "postal_code=" + query.postalCode;
    }
    else if(mode == "yelpreviews")
    {
        finalUrl = "https://api.yelp.com/v3/businesses/";
        finalUrl += query.id + "/reviews";
    }
    
    Run(serverRequest, serverResponse, finalUrl, mode);
}).listen(process.env.PORT || 3000);
  
function Run(serverRequest, serverResponse, finalUrl, mode)
{
    var headers = {'User-Agent': 'request'};
    
    if(mode == "yelpmatch" || mode == "yelpreviews")
    {
        headers = {'Authorization': 'Bearer QkGxQZuSrClCGs2pREeNigSVT0f5OuWY9PuVoLfJyiD4OtCWB1wEWjeJ2HKVlAv65oXaozuboCBSQtO7vFHIWjCBO9mxgYF8il3M52cuFZZKMYTsm1wg3XIMp3CzWnYx'};
    }

    var options = {
        url: finalUrl,
        json: true,
        headers: headers
    }
    request.get(options, function (error, apiResponse, apiData) 
    {
        serverResponse.setHeader('Access-Control-Allow-Origin', '*');
        serverResponse.setHeader('Content-Type','application/json');
        
        if (error) 
        {
            serverResponse.end(JSON.stringify({'Error' : error}));
        } 
        else if (apiResponse.statusCode !== 200) 
        {
            serverResponse.end(JSON.stringify({'Error' : apiResponse.statusCode}));
        } 
        else 
        {
            serverResponse.end(JSON.stringify(apiData));
        }
    });
}