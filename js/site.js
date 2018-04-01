var app = angular.module("myApp", ["ngAnimate"]);
app.controller("MainCtrl", function ($scope) {
    $scope.myValue = true;
});

var _urlQueryEnum =
    {
        NextPage: "next_page",
        PlaceSearch: "place_search",
        GeoCode: "geo_code",
        Details: "details"
    };

var _reviewSorting =
    {
        Default: "default",
        HighestRating: "highest_rating",
        LowestRating: "lowest_rating",
        MostRecent: "most_recent",
        LeastRecent: "least_recent"
    };

var _pageCount = 0;
var _globalLat = 0;
var _globalLon = 0;
var _rowCount = 1;
var _autocomplete, _autocompleteDetails, _placeSearch;
var _nextPageToken;
var _currentPlaceId;
var _directionsDisplay;
var _directionsService;
var _dResult;
var _currentTab = "Results";
var _yelpReviews = "";
var _currentReviewsSort = "default";

$(function () {
    //Get Current Location
    CallIpApi();

    $("#keyWordText").blur(function () {
        if ($("#keyWordText").val().trim() == "") {
            $("#keywordFeedback").css("display", "block");
            $("#keyWordText").addClass("errorBorder");
        }
    });

    $("#keyWordText").on('keyup', function () {
        var textValue = $("#keyWordText").val();
        textValue = textValue.trim();
        if (textValue != "") {
            $("#keywordFeedback").css("display", "none");
            $("#keyWordText").removeClass("errorBorder");
            $("#searchButton").prop('disabled', false);
        } else {
            $("#keywordFeedback").css("display", "block");
            $("#keyWordText").addClass("errorBorder");
            $("#searchButton").prop('disabled', true);
        }
    });

    $("#locationText").blur(function () {
        if ($("#locationText").val().trim() == "") {
            $("#locationFeedback").css("display", "block");
            $("#locationText").addClass("errorBorder");
        }
    });

    $("#locationText").on('keyup', function () {
        var textValue = $("#locationText").val();
        textValue = textValue.trim();
        if (textValue != "") {
            $("#locationFeedback").css("display", "none");
            $("#locationText").removeClass("errorBorder");
        } else {
            $("#locationFeedback").css("display", "block");
            $("#locationText").addClass("errorBorder");
        }
    });

    $('#divResult').on('click', '#innerDivResult #resultsDataTable tr #starButton', function () {
        var button = $(this).closest('td')[0].childNodes[0];
        var span = button.childNodes[0];
        span.className = "fas fa-star";

        var favRow = $(this).closest('td').parent()[0];
        if (!FavExists(favRow)) {
            var placeId = $(this).closest('td').parent()[0].childNodes[0].accessKey;

            if (localStorage.getItem("favouriteTable") == undefined) {
                localStorage.setItem("favouriteTable", JSON.stringify([favRow.innerHTML]));
            }
            else {
                var favouriteTable = JSON.parse(localStorage.getItem("favouriteTable"));
                favouriteTable.push(favRow.innerHTML);
                localStorage.setItem("favouriteTable", JSON.stringify(favouriteTable));
            }

            ChangeTableInStorage(placeId, true);
        }
        $("#detailsStarButton").get(0).childNodes[1].className = "fas fa-star";
        return false;
    });

    $('#divFavourite').on('click', '#innerDivFavourite #favDataTable tr #trashButton', function () {
        $(this).siblings().removeClass("highlight");

        var delRow = $(this).closest('td').parent()[0].childNodes[0].innerHTML;
        var delPlaceId = $(this).closest('td').parent()[0].childNodes[0].accessKey;
        delRow = delRow - 1;

        var favouriteTable = JSON.parse(localStorage.getItem("favouriteTable"));
        favouriteTable.splice(delRow, 1);
        localStorage.setItem("favouriteTable", JSON.stringify(favouriteTable));

        $("#detailsStarButton").get(0).childNodes[1].className = "far fa-star";
        FillFavouriteTable();
        ChangeTableInStorage(delPlaceId, false);
        return false;
    });

    $("ul#pills-tab li #divResultTab").click(function () {
        _currentTab = "Results";
        $("#detailsDiv").hide();
        $("#divFavourite").hide();

        var innerResultDiv = $("#innerDivResult").html().trim();
        if(ObjectEmpty(innerResultDiv))
            $("#detailsButton").hide();

        var scope = angular.element($("#divResultTab")).scope();
        scope.$apply(function () {
            scope.myValue = true;
        })
        RefreshTable();
    });

    $("ul#pills-tab li #divFavouriteTab").click(function () {
        _currentTab = "Favourite";
        $("#divResult").hide();
        $("#detailsDiv").hide();

        var scope = angular.element($("#divFavouriteTab")).scope();
        scope.$apply(function () {
            scope.myValue = true;
        })
        FillFavouriteTable();
    });

    $('#divResult').on("click", '#innerDivResult #resultsDataTable tr', function () {
        $(this).addClass("highlight").siblings().removeClass("highlight");
        var savedRow = $(this).closest('tr')[0];

        $("#savedRow").html(savedRow.innerHTML);

        var placeNode = $(this).closest('tr')[0].childNodes[2];

        if (!ObjectEmpty(placeNode)) {
            var placeId = placeNode.accessKey;
            _currentPlaceId = placeId;

            $("#detailsButton").prop("disabled", false);
            $("#infoTab").tab("show");

            GetDetails();
        }
        var buttonClass = $(this).closest('tr')[0].childNodes[4].childNodes[0].childNodes[0].className;
        $("#detailsStarButton").get(0).childNodes[1].className = buttonClass;

        localStorage.setItem("table" + _pageCount, $("#resultsDataTable").get(0).outerHTML);
    });

    $('#divFavourite').on("click", '#innerDivFavourite #favDataTable tr', function () {
        $(this).addClass("highlight").siblings().removeClass("highlight");
        var savedRow = $(this).closest('tr')[0];

        $("#savedRow").html(savedRow.innerHTML);

        var placeNode = $(this).closest('tr')[0].childNodes[2];

        if (!ObjectEmpty(placeNode)) {
            var placeId = placeNode.accessKey;
            _currentPlaceId = placeId;

            $("#favDetailsButton").prop("disabled", false);
            $("#infoTab").tab("show");
            $("#detailsStarButton").get(0).childNodes[1].className = "fas fa-star";

            GetDetails();
        }
    });

    $('#detailsButtonDiv').on('click', '#detailsButton', function () {
        $("#pageButtons").hide();
        $("#divResult").hide();
        $("#detailsDiv").show();
    });

    $('#favDetailsButtonDiv').on('click', '#favDetailsButton', function () {
        $("#pageButtons").hide();
        $("#divFavourite").hide();
        $("#detailsDiv").show();
    });

    $('#divResult').on('click', '#resultsDataTable #sDetailButton', function () {
        $("#pageButtons").hide();
        $("#divResult").hide();
        $("#detailsDiv").show();

        var scope = angular.element($("#sDetailButton")).scope();
        scope.$apply(function () {
            scope.myValue = false;
        })
    });

    $('#divFavourite').on('click', '#favDataTable #sDetailButton', function () {
        $("#pageButtons").hide();
        $("#divFavourite").hide();
        $("#detailsDiv").show();

        var scope = angular.element($("#sDetailButton")).scope();
        scope.$apply(function () {
            scope.myValue = false;
        })
    });
});

function SearchData() {
    var scope = angular.element($("body")).scope();
    scope.$apply(function () {
        scope.myValue = true;
    })
    $('#divResultTab').tab('show');
    $("#detailsDiv").hide();
    $("#divFavourite").hide();
    $("#divResult").hide();
    $("#progressDiv").show();
    _rowCount = 1;
    _pageCount = 0;
    _currentTab = "Results"
    $("#prevButton").hide();
    _yelpReviews = "";
    _currentReviewsSort = "default";
    $("#detailsButton").prop("disabled", true);
    $("#favDetailsButton").prop("disabled", true);

    UpdateProgress(10);

    var url = GetUrl(_urlQueryEnum.PlaceSearch);
    UpdateProgress(30);
    $.ajax
        ({
            type: "GET",
            dataType: 'json',
            url: url,
            async: true,
            success: function (mainResults) {
                UpdateProgress(100);
                CreateTableAndInsertRows(mainResults);
            },
            error: function () {
                var table = GetNoRecordsTable(true);
                $("#innerDivResult").html(table);
                $("#detailsButton").hide();
                $("#pageButtons").hide();
                UpdateProgress(0);
                $("#progressDiv").hide();
                $("#divResult").show();
            }
        });
}

function CreateTableAndInsertRows(mainResults) {
    if (mainResults.Error != undefined || mainResults.results == undefined) {
        var table = GetNoRecordsTable(true);
        $("#innerDivResult").html(table);
        $("#detailsButton").hide();
        $("#pageButtons").hide();
    }
    else {
        _pageCount += 1;

        var resultsArray = mainResults.results;

        if (resultsArray.length == 0) {
            var table = GetNoRecordsTable();
            $("#innerDivResult").html(table);
            $("#detailsButton").hide();
            $("#pageButtons").hide();
        }
        else {
            _nextPageToken = mainResults.next_page_token;

            if (!ObjectEmpty(_nextPageToken)) {
                $("#nextButton").show();
            }
            else {
                $("#nextButton").hide();
            }

            var table = document.createElement("table");
            table.id = "resultsDataTable";
            table.align = "center";
            table.className = "table table-hover";
            table.style.width = "100%";
            table.style.margin = "0px auto";

            var tableHead = document.createElement("thead");
            table.appendChild(tableHead);

            var row = tableHead.insertRow(-1);

            var headerCell = document.createElement("th");
            headerCell.innerHTML = "#";
            row.appendChild(headerCell);

            headerCell = document.createElement("th");
            headerCell.innerHTML = "Category";
            row.appendChild(headerCell);

            headerCell = document.createElement("th");
            headerCell.innerHTML = "Name";
            row.appendChild(headerCell);

            headerCell = document.createElement("th");
            headerCell.innerHTML = "Address";
            row.appendChild(headerCell);

            headerCell = document.createElement("th");
            headerCell.innerHTML = "Favourite";
            row.appendChild(headerCell);

            headerCell = document.createElement("th");
            headerCell.innerHTML = "Details";
            row.appendChild(headerCell);

            var tableBody = document.createElement("tbody");

            for (var i = 0; i < resultsArray.length; i++) {
                row = tableBody.insertRow(-1);

                var cell = row.insertCell(-1);
                cell.innerHTML = _rowCount;
                cell.accessKey = resultsArray[i].place_id;
                cell.className = "align-middle";

                var cell = row.insertCell(-1);
                cell.className = "align-middle";
                cell.innerHTML = '<img alt=\"\" style = "max-width: 30px; max-height: 30px;" src="' + resultsArray[i].icon + '"></img>';

                var cell = row.insertCell(-1);
                cell.innerHTML = resultsArray[i].name;
                cell.accessKey = resultsArray[i].place_id;
                cell.className = "align-middle";

                var cell = row.insertCell(-1);
                cell.innerHTML = resultsArray[i].vicinity;
                cell.className = "align-middle";

                var cell = row.insertCell(-1);
                cell.style.textAlign = "left";
                cell.innerHTML = "<button id=\"starButton\" style=\"border: 1px solid #807d7d56;\" class=\"btn btn-default\"><span class=\"far fa-star\"></span></button>";

                var cell = row.insertCell(-1);
                cell.style.textAlign = "left";
                cell.innerHTML = "<button id=\"sDetailButton\" style=\"border: 1px solid #807d7d56;\" class=\"btn btn-default\"><span class=\"fas fa-angle-right\"></span></button>";

                _rowCount += 1;
            }
            table.appendChild(tableBody);

            $("#detailsButton").show();
            $("#pageButtons").show();
            $("#detailsDiv").hide();

            $("#innerDivResult").html(table);
            localStorage.setItem("table" + _pageCount, table.outerHTML);
        }
    }
    UpdateProgress(0);
    $("#progressDiv").hide();
    $("#divResult").show();
}

function UpdateProgress(percentage) {
    $('#progressBar').css('width', percentage + '%');
}

function RefreshTable() {
    var table = localStorage.getItem("table" + _pageCount);
    if (table != undefined)
        $("#innerDivResult").html(table);
    $("#divResult").show();
}

function ChangeTableInStorage(delPlaceId, fillStar) {
    var className;

    if (fillStar)
        className = "fas fa-star";
    else
        className = "far fa-star";

    for (var i = 1; i <= 3; i++) {
        var table = localStorage.getItem("table" + i);

        if (table != undefined) {
            var parsedTable = $.parseHTML(table);
            for (var j = 0; j < parsedTable[0].childNodes[1].childNodes.length; j++) {
                var row = parsedTable[0].childNodes[1].childNodes[j];
                var rowPlaceId = row.childNodes[0].accessKey;

                if (delPlaceId == rowPlaceId) {
                    var starButton = row.childNodes[4];
                    var span = starButton.childNodes[0].childNodes[0];
                    span.className = className;
                    break;
                }
            }
            localStorage.setItem("table" + i, parsedTable[0].outerHTML);
        }
    }
}

function GetNoRecordsTable(error = false) {
    var alertDiv = document.createElement("div");
    alertDiv.style.width = "100%";
    alertDiv.style.margin = "50px auto";
    alertDiv.setAttribute("role", "alert");

    if (!error) {
        alertDiv.className = "alert alert-warning";
        alertDiv.innerHTML = "No records.";
    }
    else {
        alertDiv.className = "alert alert-danger";
        alertDiv.innerHTML = "Failed to get search results.";
    }
    return alertDiv;
}

function FillFavouriteTable() {
    $("#innerDivFavourite").empty();
    var favRecords = JSON.parse(localStorage.getItem("favouriteTable"));

    if (favRecords == null || favRecords.length == 0) {
        var table = GetNoRecordsTable();
        $("#innerDivFavourite").html(table);
        $("#favDetailsButton").hide();
        $("#favDetailsButton").prop("disabled", true);
    }
    else {
        var rowCount = 1;
        var table = document.createElement("table");
        table.id = "favDataTable";
        table.align = "center";
        table.className = "table table-hover";
        table.style.textAlign = "left";
        table.style.width = "100%";
        table.style.margin = "0px auto";

        var tableHead = document.createElement("thead");
        table.appendChild(tableHead);

        var row = tableHead.insertRow(-1);

        var headerCell = document.createElement("th");
        headerCell.innerHTML = "#";
        row.appendChild(headerCell);

        headerCell = document.createElement("th");
        headerCell.innerHTML = "Category";
        row.appendChild(headerCell);

        headerCell = document.createElement("th");
        headerCell.innerHTML = "Name";
        row.appendChild(headerCell);

        headerCell = document.createElement("th");
        headerCell.innerHTML = "Address";
        row.appendChild(headerCell);

        headerCell = document.createElement("th");
        headerCell.innerHTML = "Favourite";
        row.appendChild(headerCell);

        headerCell = document.createElement("th");
        headerCell.innerHTML = "Details";
        row.appendChild(headerCell);

        var tableBody = document.createElement("tbody");


        var favouriteTable = JSON.parse(localStorage.getItem("favouriteTable"));
        for (var i = 0; i < favouriteTable.length; i++) {
            var parsedRow = $.parseHTML(favouriteTable[i]);

            row = tableBody.insertRow(-1);

            var cell = row.insertCell(-1);
            cell.innerHTML = rowCount;
            cell.accessKey = parsedRow[0].accessKey;

            var cell = row.insertCell(-1);
            cell.innerHTML = parsedRow[1].innerHTML;

            var cell = row.insertCell(-1);
            cell.innerHTML = parsedRow[2].innerHTML;
            cell.accessKey = parsedRow[2].accessKey;

            var cell = row.insertCell(-1);
            cell.innerHTML = parsedRow[3].innerHTML;

            var cell = row.insertCell(-1);
            cell.style.textAlign = "left";
            cell.innerHTML = "<button id=\"trashButton\" style=\"border: 1px solid #807d7d56;\" class=\"btn btn-default\"><span class=\"fas fa-trash-alt\"></span></button>";

            var cell = row.insertCell(-1);
            cell.style.textAlign = "left";
            cell.innerHTML = parsedRow[5].innerHTML;

            rowCount += 1;
        }
        table.appendChild(tableBody);

        $("#favDetailsButton").show();
        $("#favDetailsButton").prop("disabled", true);
        $("#detailsDiv").hide();
        $("#innerDivFavourite").html(table);
    }
    $("#divFavourite").show();
    $("#divFavourite").removeClass("ng-hide");
}

function AddToFavourite(button) {
    if (button.childNodes[1].className != "fas fa-star") {
        button.childNodes[1].className = "fas fa-star";

        var favRow = $("#savedRow").html();
        if (localStorage.getItem("favouriteTable") == undefined) {
            localStorage.setItem("favouriteTable", JSON.stringify([favRow]));
        }
        else {
            var favouriteTable = JSON.parse(localStorage.getItem("favouriteTable"));
            favouriteTable.push(favRow);
            localStorage.setItem("favouriteTable", JSON.stringify(favouriteTable));
        }
        ChangeTableInStorage(_currentPlaceId, true);
    }
}

function FavExists(row) {
    var favouriteTable = JSON.parse(localStorage.getItem("favouriteTable"));
    var rowExists = false;

    if (favouriteTable == null || favouriteTable.length == 0)
        return false;

    for (var i = 0; i < favouriteTable.length; i++) {
        if (favouriteTable[i] == row.innerHTML) {
            rowExists = true;
            break;
        }
        else
            rowExists = false;
    }
    return rowExists;
}

function GetDetails() {
    var request =
        {
            placeId: _currentPlaceId
        };

    var map = new google.maps.Map(document.getElementById('map'));
    service = new google.maps.places.PlacesService(map);
    service.getDetails(request, ShowDetails);
}

function ShowDetails(result, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        _dResult = result;
        $("#infoHeading").html(_dResult.name);
        var twitterText = "Check out " + _dResult.name;

        if (!ObjectEmpty(_dResult.formatted_address))
            twitterText += "located at " + _dResult.formatted_address + ". ";

        if (!ObjectEmpty(_dResult.website))
            twitterText += "Website: " + _dResult.website + "#TravelAndEntertainmentSearch. ";
        else
            twitterText += "Website: " + _dResult.url + "#TravelAndEntertainmentSearch. ";

        $("#twitterIntent").attr("href", "https://twitter.com/share?ref_src=twsrc%5Etfw&text=" + twitterText);

        FillInfoDiv();
        FillPhotosDiv();
        FillMapDiv();
        FillReviewsDiv();
        GetYelpBusiness();
    }
}

function FillInfoDiv() {
    $("#addressInfoRow").show();
    $("#phoneInfoRow").show();
    $("#priceInfoRow").show();
    $("#ratingInfoRow").show();
    $("#googlePageInfoRow").show();
    $("#hoursInfoRow").show();
    $("#websiteInfoRow").show();

    if (ObjectEmpty(_dResult.formatted_address))
        $("#addressInfoRow").hide();
    else
        $("#addressInfo").html(_dResult.formatted_address);

    if (ObjectEmpty(_dResult.international_phone_number))
        $("#phoneInfoRow").hide();
    else
        $("#phoneInfo").html(_dResult.international_phone_number);

    if (ObjectEmpty(_dResult.price_level))
        $("#priceInfoRow").hide();
    else {
        var priceDiv = document.createElement("div");
        for (var i = 1; i <= _dResult.price_level; i++) {
            var span = document.createElement("span");
            span.innerHTML = "$";
            priceDiv.append(span);
        }
        $("#priceInfo").html(priceDiv);
    }

    if (ObjectEmpty(_dResult.rating))
        $("#ratingInfoRow").hide();
    else {
        $("#ratingInfo p").html(_dResult.rating);
        $('.rating-tooltip').rating('rate', _dResult.rating);
        $(".rating-tooltip").rating({
            extendSymbol: function (rate) {
                $(this).tooltip
                    ({
                        container: 'body',
                        placement: 'bottom',
                        title: 'Rate ' + rate
                    });
            }
        });
    }

    if (ObjectEmpty(_dResult.url))
        $("#googlePageInfoRow").hide();
    else {
        $("#googlePageInfo a").attr("href", _dResult.url);
        $("#googlePageInfo a").html(_dResult.url);
    }

    if (ObjectEmpty(_dResult.website))
        $("#websiteInfoRow").hide();
    else {
        $("#websiteInfo a").attr("href", _dResult.website);
        $("#websiteInfo a").html(_dResult.website);
    }

    if (ObjectEmpty(_dResult.opening_hours)) {
        $("#hoursInfoRow").hide();
    }
    else {
        var openNowString = "";
        var utcOffset = _dResult.utc_offset;
        var weekHours = _dResult.opening_hours.weekday_text;
        var dayOfWeek = moment().utcOffset(utcOffset).weekday() - 1;

        if (dayOfWeek == -1)
            dayOfWeek = 6;

        var day = weekHours[dayOfWeek];
        weekHours.splice(dayOfWeek, 1);
        var currentDayTime = day.substr(day.indexOf(':') + 1, day.length);

        if (_dResult.opening_hours.open_now) {
            openNowString = "Open Now: " + currentDayTime;
        }
        else
            openNowString = "Closed";

        $("#hoursInfo").html(openNowString);

        var openHoursLink = document.createElement("a");
        openHoursLink.innerHTML = "Daily open hours";
        openHoursLink.style.marginLeft = "10px";
        openHoursLink.href = "";
        openHoursLink.setAttribute("data-toggle", "modal");
        openHoursLink.setAttribute("data-target", "#openHourModal");

        $("#hoursInfo").append(openHoursLink);

        $(".modal-body").html();

        var hoursTable = document.createElement("table");
        hoursTable.className = "table";
        var row = hoursTable.insertRow(-1);

        var headerCell = document.createElement("th");
        headerCell.innerHTML = day.substr(0, day.indexOf(":"));
        row.appendChild(headerCell);

        headerCell = document.createElement("th");
        headerCell.innerHTML = currentDayTime;
        row.appendChild(headerCell);

        for (var p = 0; p < weekHours.length; p++) {
            row = hoursTable.insertRow(-1);

            var cell = row.insertCell(-1);
            cell.innerHTML = weekHours[p].substr(0, weekHours[p].indexOf(":"));

            var cell = row.insertCell(-1);
            cell.innerHTML = weekHours[p].substr(weekHours[p].indexOf(":") + 1, weekHours[p].length);
        }
        $(".modal-body").html(hoursTable);
    }
}

function FillPhotosDiv() {
    var photos = _dResult.photos;
    if (ObjectEmpty(photos) || photos.length == 0) {
        var table = GetNoRecordsTable();
        $("#photosDiv").html(table)
    }
    else {
        $("#insidePhotosDiv").html("");

        if (!ObjectEmpty(photos)) {
            for (var i = 0; i < photos.length; i++) {
                var imageAnchor = document.createElement("a");
                imageAnchor.target = "_blank";
                imageAnchor.href = photos[i].getUrl({ 'maxWidth': photos[i].width, 'maxHeight': photos[i].height });
                var image = document.createElement("img");
                image.src = photos[i].getUrl({ 'maxWidth': 250, 'maxHeight': 300 });
                image.alt = "";
                imageAnchor.append(image);

                $("#insidePhotosDiv").append(imageAnchor);
            }
        }
    }
}

function FillMapDiv() {
    $("#toText").val(_dResult.formatted_address);
    $("#detailsMap").attr("accessKey", "Maps");
    $("#mapTypeImage").attr("src", "images/pegman.png");

    var latitude = _dResult["geometry"]["location"].lat();
    var longitude = _dResult["geometry"]["location"].lng();

    _directionsDisplay = new google.maps.DirectionsRenderer;
    _directionsService = new google.maps.DirectionsService;

    var map = new google.maps.Map($("#detailsMap").get(0),
        {
            zoom: 16,
            center: { lat: latitude, lng: longitude }
        });
    marker = new google.maps.Marker(
        {
            position: { lat: latitude, lng: longitude },
            map: map
        });
    _directionsDisplay.setMap(map);
    _directionsDisplay.setPanel($("#right-panel").get(0));

    if (!ObjectEmpty($("#right-panel").html()))
        CalculateAndDisplayRoute();
}

function GetStreetView() {
    var mapMode = $("#detailsMap").attr("accessKey");

    if (mapMode == "Street") {
        FillMapDiv();

        $("#detailsMap").attr("accessKey", "Maps");
        $("#mapTypeImage").attr("src", "images/pegman.png");
    }
    else if (mapMode == "Maps") {
        var panorama;
        var latitude = _dResult.geometry.location.lat();
        var longitude = _dResult.geometry.location.lng();
        panorama = new google.maps.StreetViewPanorama
            (
            $("#detailsMap").get(0),
            {
                position: { lat: latitude, lng: longitude },
                pov: { heading: 165, pitch: 0 },
                zoom: 1
            }
            );

        $("#detailsMap").attr("accessKey", "Street");
        $("#mapTypeImage").attr("src", "images/map.png");
    }
}

function CalculateAndDisplayRoute() {
    var latitude = _dResult.geometry.location.lat();
    var longitude = _dResult.geometry.location.lng();
    var selectedMode = $("#tMode").val();

    if (marker != "") {
        marker.setMap(null);
        marker = "";
    }
    _directionsService.route(
        {
            origin: { lat: _globalLat, lng: _globalLon },
            destination: { lat: latitude, lng: longitude },
            travelMode: google.maps.TravelMode[selectedMode],
            provideRouteAlternatives: true
        }, function (response, status) {
            if (status == 'OK') {
                _directionsDisplay.setDirections(response);
            }
            else {
                window.alert("Directions request failed due to " + status);
            }
        });
}

function FillReviewsDiv() {
    var sorting = _currentReviewsSort;

    var reviews = _dResult.reviews.slice();

    if (ObjectEmpty(reviews) || reviews.length == 0) {
        var table = GetNoRecordsTable();
        $("#insideReviewsDiv").html(table);
    }
    else {
        if (_reviewSorting.Default == sorting) {
            $("#sortOrder").html("Default");
        }
        else if (_reviewSorting.LowestRating == sorting) {
            reviews.sort(function (a, b) {
                var nameA = a.rating;
                var nameB = b.rating;
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }
                return 0;
            });
        }
        else if (_reviewSorting.HighestRating == sorting) {
            reviews.sort(function (a, b) {
                var nameA = a.rating;
                var nameB = b.rating;
                if (nameA < nameB) {
                    return 1;
                }
                if (nameA > nameB) {
                    return -1;
                }
                return 0;
            });
        }
        else if (_reviewSorting.LeastRecent == sorting) {
            reviews.sort(function (a, b) {
                var nameA = new Date(a.time * 1000);
                var nameB = new Date(b.time * 1000);
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }
                return 0;
            });
        }
        else if (_reviewSorting.MostRecent == sorting) {
            reviews.sort(function (a, b) {
                var nameA = new Date(a.time * 1000);
                var nameB = new Date(b.time * 1000);
                if (nameA < nameB) {
                    return 1;
                }
                if (nameA > nameB) {
                    return -1;
                }
                return 0;
            });
        }

        $("#insideReviewsDiv").empty();
        for (var i = 0; i < reviews.length; i++) {
            var mainDiv = document.createElement("div");
            mainDiv.style.border = "1px solid lightgrey";
            mainDiv.style.marginBottom = "10px";
            mainDiv.style.padding = "0px 10px 10px 0px";

            var imageAnchor = document.createElement("a");
            imageAnchor.style.float = "left";
            imageAnchor.style.margin = "10px 0px 0px 10px";
            imageAnchor.href = reviews[i].author_url;
            imageAnchor.target = "_blank";

            var image = document.createElement("img");
            image.style.width = "60px";
            image.style.height = "60px";
            image.alt = "";
            image.src = reviews[i].profile_photo_url;
            image.style.display = "block";
            imageAnchor.appendChild(image);

            var detailsDiv = document.createElement("div");
            detailsDiv.style.marginLeft = "90px";

            var authorName = document.createElement("a");
            authorName.innerHTML = reviews[i]["author_name"];
            authorName.target = "_blank";
            authorName.href = reviews[i].author_url;
            authorName.style.color = "dodgerblue";
            authorName.style.margin = "10px 0px 0px 0px";
            detailsDiv.appendChild(authorName);

            var breakEl = document.createElement("br");
            detailsDiv.appendChild(breakEl);

            var rating = parseInt(reviews[i].rating);
            for (var j = 1; j <= rating; j++) {
                var span = document.createElement("span");
                span.className = "fas fa-star";
                span.style.display = "inline-block";
                detailsDiv.appendChild(span);
            }

            var ratingDate = document.createElement("p");
            ratingDate.innerHTML = new Date(reviews[i].time * 1000);
            ratingDate.style.color = "lightgrey";
            ratingDate.style.marginBottom = "0px";
            ratingDate.style.display = "inline-block";

            detailsDiv.appendChild(ratingDate);

            var para = document.createElement("p");
            para.innerHTML = reviews[i].text;
            detailsDiv.appendChild(para);

            mainDiv.append(imageAnchor);
            mainDiv.append(detailsDiv);
            $("#insideReviewsDiv").append(mainDiv);
        }
        $("#reviewWebsiteName").html("Google Reviews");
    }
}

function GetYelpBusiness() {
    var url = "http://googleapicalls.us-east-2.elasticbeanstalk.com?";
    url += "name=" + _dResult.name.normalize('NFD').replace(/[\u0300-\u036f]/g, "") + "&";

    var city = "";
    var state = "";
    var country = "";
    var address1 = "";

    var addressComp = _dResult.address_components;
    for (var i = 0; i < addressComp.length; i++) {
        var line = addressComp[i];
        var types = line.types;
        if ($.inArray("route", types) > -1) {
            address1 = line.long_name;
        }
        else if ($.inArray("locality", types) > -1) {
            city = line.long_name;
        }
        else if ($.inArray("administrative_area_level_1", types) > -1) {
            state = line.short_name;
        }
        else if ($.inArray("country", types) > -1) {
            country = line.short_name;
        }
    }

    url += "city=" + city + "&";
    url += "state=" + state + "&";
    url += "country=" + country + "&";
    url += "address1=" + address1 + "&";
    url += "mode=yelpmatch";

    $.ajax
        ({
            type: "GET",
            dataType: 'json',
            url: url,
            async: true,
            success: function (mainResults) {
                if (!ObjectEmpty(mainResults.businesses) && mainResults.businesses.length != 0) {
                    var id = mainResults.businesses[0].id;
                    GetYelpReviews(id);
                }
            }
        });
}

function GetYelpReviews(id) {
    var url = "http://googleapicalls.us-east-2.elasticbeanstalk.com?";
    url += "id=" + id + "&";
    url += "mode=yelpreviews";

    $.ajax
        ({
            type: "GET",
            dataType: 'json',
            url: url,
            async: true,
            success: function (mainResults) {
                _yelpReviews = mainResults;
            }
        });
}

function ShowYelpReviews() {
    var sorting = _currentReviewsSort;
    var reviews = "";
    if (ObjectEmpty(_yelpReviews) || _yelpReviews.length == 0) {
        var table = GetNoRecordsTable();
        $("#insideReviewsDiv").html(table);
    }
    else {
        reviews = _yelpReviews.reviews.slice();
        if (_reviewSorting.Default == sorting) {
            $("#sortOrder").html("Default");
        }
        else if (_reviewSorting.LowestRating == sorting) {
            reviews.sort(function (a, b) {
                var nameA = a.rating;
                var nameB = b.rating;
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }
                return 0;
            });
        }
        else if (_reviewSorting.HighestRating == sorting) {
            reviews.sort(function (a, b) {
                var nameA = a.rating;
                var nameB = b.rating;
                if (nameA < nameB) {
                    return 1;
                }
                if (nameA > nameB) {
                    return -1;
                }
                return 0;
            });
        }
        else if (_reviewSorting.LeastRecent == sorting) {
            reviews.sort(function (a, b) {
                var nameA = new Date(a.time_created);
                var nameB = new Date(b.time_created);
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }
                return 0;
            });
        }
        else if (_reviewSorting.MostRecent == sorting) {
            reviews.sort(function (a, b) {
                var nameA = new Date(a.time_created);
                var nameB = new Date(b.time_created);
                if (nameA < nameB) {
                    return 1;
                }
                if (nameA > nameB) {
                    return -1;
                }
                return 0;
            });
        }

        $("#insideReviewsDiv").empty();
        for (var i = 0; i < reviews.length; i++) {
            var mainDiv = document.createElement("div");
            mainDiv.style.border = "1px solid lightgrey";
            mainDiv.style.marginBottom = "10px";
            mainDiv.style.padding = "0px 10px 10px 0px";

            var imageAnchor = document.createElement("a");
            imageAnchor.style.float = "left";
            imageAnchor.style.margin = "10px 0px 0px 10px";
            imageAnchor.href = reviews[i].url;
            imageAnchor.target = "_blank";

            var image = document.createElement("img");
            image.style.width = "60px";
            image.style.height = "60px";
            image.alt = "";
            image.src = reviews[i].user.image_url;
            image.style.display = "block";
            imageAnchor.appendChild(image);

            var detailsDiv = document.createElement("div");
            detailsDiv.style.marginLeft = "90px";

            var authorName = document.createElement("a");
            authorName.innerHTML = reviews[i].user.name;
            authorName.target = "_blank";
            authorName.href = reviews[i].url;
            authorName.style.color = "dodgerblue";
            authorName.style.margin = "10px 0px 0px 0px";
            detailsDiv.appendChild(authorName);

            var breakEl = document.createElement("br");
            detailsDiv.appendChild(breakEl);

            var rating = parseInt(reviews[i].rating);
            for (var j = 1; j <= rating; j++) {
                var span = document.createElement("span");
                span.className = "fas fa-star";
                span.style.display = "inline-block";
                detailsDiv.appendChild(span);
            }

            var ratingDate = document.createElement("p");
            ratingDate.innerHTML = reviews[i].time_created;
            ratingDate.style.color = "lightgrey";
            ratingDate.style.marginBottom = "0px";
            ratingDate.style.display = "inline-block";

            detailsDiv.appendChild(ratingDate);

            var para = document.createElement("p");
            para.innerHTML = reviews[i].text;
            detailsDiv.appendChild(para);

            mainDiv.append(imageAnchor);
            mainDiv.append(detailsDiv);
            $("#insideReviewsDiv").append(mainDiv);
        }
    }
    $("#reviewWebsiteName").html("Yelp Reviews");
}

function SortReviews(sorting) {
    _currentReviewsSort = sorting;
    SelectCurrentSort();

    if ($("#reviewWebsiteName").html() == "Yelp Reviews") {
        ShowYelpReviews();
    }
    else if ($("#reviewWebsiteName").html() == "Google Reviews") {
        FillReviewsDiv();
    }
}

function SelectCurrentSort() {
    if (_reviewSorting.Default == _currentReviewsSort) {
        $("#sortOrder").html("Default");
    }
    else if (_reviewSorting.LowestRating == _currentReviewsSort) {
        $("#sortOrder").html("Lowest Rating");
    }
    else if (_reviewSorting.HighestRating == _currentReviewsSort) {
        $("#sortOrder").html("Highest Rating");
    }
    else if (_reviewSorting.LeastRecent == _currentReviewsSort) {
        $("#sortOrder").html("Least Recent");
    }
    else if (_reviewSorting.MostRecent == _currentReviewsSort) {
        $("#sortOrder").html("Most Recent");
    }
}

function HideDetailsDiv() {
    RefreshTable();
    if (_currentTab == "Results") {
        $("#divFavourite").hide();
        $("#divResult").show();
    }
    else {
        $("#divFavourite").show();
        $("#divResult").hide();
    }
    $("detailsDiv").hide();
    $("#detailsButton").show();
    $("#pageButtons").show();
}

function CallIpApi() {
    $.ajax
        ({
            type: "GET",
            dataType: 'json',
            url: "http://ip-api.com/json",
            async: false,
            success: function (data) {
                if (!ObjectEmpty(data)) {
                    _globalLat = data.lat;
                    _globalLon = data.lon;
                }
            }
        });
}

function GetUrl(mode) {
    var url = "http://googleapicalls.us-east-2.elasticbeanstalk.com?";

    if (mode == _urlQueryEnum.NextPage) {
        url += "nextPageToken=" + _nextPageToken + "&mode=nextpage";
    }
    else if (mode == _urlQueryEnum.PlaceSearch) {
        var distance = $("#distanceText").val();

        if (distance == "" || distance == undefined)
            distance = (10 * 1609.34).toFixed();
        else
            distance = (distance * 1609.34).toFixed();

        url += "location=" + _globalLat + "," + _globalLon + "&";
        url += "radius=" + distance + "&";
        url += "types=" + $("#category").val() + "&";
        url += "name=" + $("#keyWordText").val() + "&mode=places";
    }
    else if (mode == _urlQueryEnum.GeoCode) {
        url += "location=";
        url += encodeURIComponent($('#locationText').val());
        url += "&mode=geocode";
    }
    else if (mode == _urlQueryEnum.Details) {
        url += "placeId=" + _currentPlaceId + "&mode=details";
    }

    return url;
}

function GetNextPageResults() {
    var table = localStorage.getItem("table" + (_pageCount + 1));

    if (ObjectEmpty(table)) {
        var url = GetUrl(_urlQueryEnum.NextPage);

        $.ajax
            ({
                type: "GET",
                dataType: 'json',
                url: url,
                async: true,
                success: function (mainResults) {
                    CreateTableAndInsertRows(mainResults);
                    $("#prevButton").show();

                    if (_pageCount == 3) {
                        $("#nextButton").hide();
                    }
                },
                error: function () {
                    var table = GetNoRecordsTable(true);
                    $("#innerDivResult").html(table);
                    $("#detailsButton").hide();
                    $("#pageButtons").hide();
                    UpdateProgress(0);
                    $("#progressDiv").hide();
                    $("#divResult").show();
                }

            });
    }
    else {
        $("#innerDivResult").html(table);
        _pageCount += 1;
        $("#prevButton").show();

        if (_pageCount == 3 || ObjectEmpty(_nextPageToken)) {
            $("#nextButton").hide();
        }
    }
}

function GetPrevPageResults() {
    _pageCount = _pageCount - 1;
    var table = localStorage.getItem("table" + _pageCount);
    $("#innerDivResult").html(table);

    $("#nextButton").show();
    if (_pageCount == 1) {
        $("#prevButton").hide();
    }
}

function UpdateLatLang() {
    var url = GetUrl(_urlQueryEnum.GeoCode);

    $.ajax
        ({
            type: "GET",
            dataType: 'json',
            url: url,
            async: false,
            success: function (data) {
                if (data != undefined || data != '') {
                    _globalLat = data.results[0].geometry.location.lat;
                    _globalLon = data.results[0].geometry.location.lng;
                }
            }
        });
}

function ToggleTextbox(rdo) {
    $("#locationText").prop("disabled", !rdo.checked);
    $("#searchButton").prop("disabled", true);
}

function ClearLocation() {
    CallIpApi();
    $("#locationText").val("");
    $("#locationText").prop("disabled", true);
}

function ClearVariables(event) {
    var scope = angular.element($("body")).scope();
    scope.$apply(function () {
        scope.myValue = true;
    })

    $("#searchButton").prop('disabled', true);

    $("#keyWordText").focus();
    $("#keyWordText").val("");
    $("#category").val("default");
    $("#distanceText").val("");

    $("#radioCurLocation").prop("checked", true).trigger("click");

    $("#pageButtons").hide();
    $("#innerDivResult").empty();
    $("#detailsDiv").hide();
    $("#innerDivFavourite").empty();

    $("#detailsButton").hide();
    $("#favDetailsButton").hide();
    $("#detailsButton").prop("disabled", true);
    $("#favDetailsButton").prop("disabled", true);
    $('#divResultTab').tab('show');
    _currentTab = "Results"

    _mapAlreadySet = false;
    _rowCount = 1;
    _pageCount = 0;
    _currentPlaceId = "";
    _currentReviewsSort = "default";
    localStorage.clear();

    event.preventDefault();
}

function ObjectEmpty(value) {
    if (value == "" || value == undefined || value == null)
        return true;
    else
        return false;
}

function initAutocomplete() {
    _autocomplete = new google.maps.places.Autocomplete(
        /** @type {!HTMLInputElement} */(document.getElementById("locationText")),
        { types: ["geocode"] });
    _autocomplete.addListener("place_changed", fillInAddress);

    _autocompleteDetails = new google.maps.places.Autocomplete(
        /** @type {!HTMLInputElement} */(document.getElementById("fromText")),
        { types: ["geocode"] });
    _autocompleteDetails.addListener("place_changed", fillInAddressDetails);
}

function fillInAddress() {
    var place = _autocomplete.getPlace();
    _globalLat = place.geometry.location.lat();
    _globalLon = place.geometry.location.lng();
    $("#searchButton").prop("disabled", false);
}

function fillInAddressDetails() {
    var place = _autocompleteDetails.getPlace();
    _globalLat = place.geometry.location.lat();
    _globalLon = place.geometry.location.lng();
}

function geolocate() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var geolocation =
                {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
            var circle = new google.maps.Circle
                ({
                    center: geolocation,
                    radius: position.coords.accuracy
                });
            _autocomplete.setBounds(circle.getBounds());
            _autocompleteDetails.setBounds(circle.getBounds());
        });
    }
}